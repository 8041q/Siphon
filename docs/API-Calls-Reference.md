# Siphon Client - Public API Reference

All calls go through the `FuelDataClient` class exported from `src/api/siphonClient.ts` (the app's singleton `client` instance is exported from `src/hooks/useApp.tsx`):

```ts
const client = new FuelDataClient({
  store: hybridStore,   // the app's exported instance lives in src/hooks/useApp.tsx
  baseUrl: 'https://raw.githubusercontent.com/8041q/SiphonAPI/main',
});
```

---

## Already wired in src/hooks/useApp.tsx (AppProvider)

These run automatically on launch in this order:

| Call | Purpose | Notes |
|---|---|---|
| `client.checkForUpdates()` | Conditional GET on root manifest (sends `If-None-Match`). Returns `{ changedCountries, root, offline }`. | 304 = zero tile downloads are needed. On failure returns `offline: true` so the app falls back to cache. |
| `client.syncAll(changedCountries, onProgress)` | Downloads/refreshes station tiles when station countries changed or local verification/repair is required. | A trusted aggregate catalog is loaded in parallel at startup. If country hashes are unchanged and the verified aggregate exists, AppProvider skips the full per-tile walk entirely. First launch, changed countries, missing aggregate data, or a cache-version migration still run the full verification/sync path. `onProgress(loaded, total)` fires per tile when that path runs. |
| `client.checkHistoryUpdates()` | Compares the root manifest's history hash against the last-seen one; only when it differs, downloads the index + missing day files and prunes day files older than 90 days. | Gated by the "Save price history on device" setting - when disabled the app never checks the hash nor pulls. Runs exactly once per launch; there is no manual refresh. |
| `client.getStationsNear(lat, lng, changedCountries)` | Returns nearby stations from both Spain and Portugal, deduplicated. | After `syncAll()` this is pure cache when nothing changed - zero network. On a day a country changed it re-fetches that country's manifest + changed tiles. Near-border users get stations from both sides. |

---

## Anti-spam guard (GitHub rate limits)

Every GitHub request goes through `client.fetchRateLimited()`. A persistent guard (stored under `siphon:rate:*` in the file-backed store, so clearing the app cache doesn't reset it) enforces three layers:

| Layer | Default | Effect |
|---|---|---|
| Hourly request budget | 300 requests/hr | Refuses new requests once the rolling 1-hour window is full (a cold sync is ~200; a no-change launch is 1). |
| Min interval between syncs | 10 min | Skips the whole sync cycle if one just ran - blocks rapid relaunch/cache-clear loops. |
| Server backoff | 5 min (or `Retry-After`/`X-RateLimit-Reset`) | On 429/403, persists a "blocked until" timestamp and refuses requests until it passes. |

When a limit is hit, the sync degrades to cache-only and the map shows a short `sync.rate_limited` notice instead of hammering GitHub. The cooldown layer is silent (data is already fresh); the budget/backoff layers surface the notice.

---

## Price history (server-side)

The full daily price-history archive is kept server-side (only a rolling 90-day window is cached on the device). The API publishes one file per date plus an index:

```
data/history/2026/2026-07-30.json   # flat array of { id, brand, fuels }
data/history/2027/2027-01-05.json
data/history/index.json             # { lastUpdated, days: [{ date, path, hash }...] }
```

Files use the same schema:

```json
[
  { "id": "es-10203", "brand": "REPSOL", "fuels": { "gasoline95": 1.829, "diesel": 1.709 } },
  { "id": "pt-65074", "brand": "GALP", "fuels": { "gasoline95": 2.031, "diesel": 2.098 } }
]
```

The root manifest carries a hash of the index: `manifest.json → history: { path, hash, lastUpdated }`.

The device keeps only the newest **90 days** of day files (rolling window, pruned at launch). A station's chart is read straight from those files, so every station gets up to 90 days of history; results are memoized in memory for the session.

### `client.checkHistoryUpdates()`

```ts
const { changed, downloadedDays, offline } = await client.checkHistoryUpdates();
```

Called once per launch. Zero network when the index hash hasn't moved; downloads only missing/changed files when it has. Purges files older than 90 days. On failure returns `offline: true` and leaves the cache untouched.

### `client.getPriceHistory(stationId, fuelType)`

```ts
const points = await client.getPriceHistory('es-10203', 'gasoline95');
// [{ date: '2026-07-30', price: 1.829 }, ...]  sorted by date
```

Reads a station's series for one fuel from the cached day files. Returns `[]` when the station has no data.

### `client.clearHistoryCache()`

```ts
const { deleted } = await client.clearHistoryCache();
```

Deletes every cached file and the index hash. Called automatically when the user turns the "Save price history on device" setting off.

---

## Crowdsourced station overrides

Station payment methods / services / hours / brand / address come from government feeds and can be stale. Users report corrections through the SiphonAPI repo's **"Report incorrect station info"** issue template; after manual validation entries are moved into `data/overrides/{es,pt}.json`:

```json
{
  "es-10203": {
    "brand": "REPSOL EXPRESS",
    "paymentMethods": ["dinheiro", "multibanco"],
    "appliedAt": "2026-07-31T00:00:00Z",
    "note": "issue #12"
  }
}
```

The API applies them as a final pass when building tiles, so the app receives them through the normal sync - no app-side handling. Fuel prices are never overridable.

---

## Internal methods (used by the above, not useful for UI directly)

| Method | Why it's internal |
|---|---|
| `getSpainManifest(changed, path?)` | Called by `syncAll`, `getStationsNear`. Fetch-or-cache the Spain manifest. |
| `getPortugalManifest(changed, path?)` | Same for Portugal. |
| `fetchIfChanged(entry)` | Core fetch-or-cache for a single tile/district geojson. Hash comparison avoids re-download. |
| `fetchHistoryDay(entry)` | Same pattern for history day files (AsyncStorage hash + file-backed data under the `siphon:history:` prefix). |
| `spainGridKey(lat, lng)` | Compute the 1°×1° grid key for a point. Used by `getStationsNear`. |
| `spainNeighborGridKeys(lat, lng)` | 3×3 block of grid keys around a point. Used by `getStationsNear` so boundary-area users get adjacent tiles. |
| `portugalDistrictsNear(manifest, lat, lng, padDegrees?)` | Bbox prefilter for Portugal districts near a point. Used by `getStationsNear`. |

---

## Types you'll use in UI code

```ts
import type { FuelStationFeature } from '../../src/api/siphonClient';
```

A `FuelStationFeature` is a discriminated union on `properties.source`.

Shared published fields are `id`, `source`, `brand`, `address`, `municipality`, `postalCode`, `fuels`, and `extra`. `brand` and `address` are always strings. Every station has at least one fuel price.

Portugal (`source: 'PT'`) additionally publishes:

- `id: \`pt-${number}\``
- `name: string`
- `district: string`
- `lastUpdated: string` (`YYYY-MM-DD HH:MM`)
- `postalCode: string | null`
- `hours: { weekdays; saturday; sunday; holiday } | null`, where each value is `string | null`
- `services: string[]`
- `paymentMethods: string[]`
- `otherServices: string | null`
- `observations: string | null`
- `extra.stationType?: 'Outro' | 'Auto-estrada' | 'Área comercial (Hipermercados)'`

Spain (`source: 'ES'`) additionally publishes:

- `id: \`es-${number}\``
- `province: string`
- `postalCode: string`
- `schedule: string`
- `extra.saleType?: 'P'`
- `extra.margin?: 'D' | 'N' | 'I'`
- `extra.reportingType?: 'dm' | 'OM'`
- `extra.ideess`, `idMunicipio`, `idProvincia`, `idCCAA` as optional strings

Spain does not publish the PT-only `name`, `district`, `lastUpdated`, `hours`, `services`, `paymentMethods`, `otherServices`, or `observations` fields.

The app may add marker-enrichment fields (`_status`, `_icon`, `_price95`, `_priceDiesel`, `_sortLat`, `_priceLabel`) in memory; they are not part of the raw government tile payload.

### `fuels` keys you'll encounter

The exact published fuel-key union is:

```ts
type FuelKey =
  | 'adblue'
  | 'bioCng'
  | 'bioLng'
  | 'biodiesel'
  | 'bioethanol'
  | 'cng'
  | 'cngkg'
  | 'cngm3'
  | 'diesel'
  | 'dieselAgri'
  | 'dieselB'
  | 'dieselHeating'
  | 'dieselPremium'
  | 'dieselRenewable'
  | 'gasoline95'
  | 'gasoline95E10'
  | 'gasoline95E25'
  | 'gasoline95E85'
  | 'gasoline95Plus'
  | 'gasoline95Premium'
  | 'gasoline98'
  | 'gasoline98E10'
  | 'gasoline98Plus'
  | 'gasolineMix'
  | 'gasolineRenewable'
  | 'hydrogen'
  | 'lng'
  | 'lpg'
  | 'bioDiesel';
```

`bioDiesel` (camel-case D) occurs on PT and is distinct from `biodiesel`. `src/utils/fuelNames.ts` sources its filter list from this API union so the two cannot drift.

---

## Price history settings toggle

`app/(tabs)/settings.tsx` shows a **"Save price history on device"** switch:

- **On (default)**: `checkHistoryUpdates()` runs once per launch; the last 90 days are cached on the device and charts read from them.
- **Off**: the app never checks the history hash nor pulls anything; turning it off immediately deletes the cached history. The price-trends screen shows a "history is disabled" message.

The preference is stored in AsyncStorage under `siphon:settings:historyEnabled` (the same key the app checks at launch).
