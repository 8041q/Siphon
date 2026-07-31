# Siphon Client — Public API Reference

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
| `client.syncAll(changedCountries, onProgress)` | Downloads/refreshes every single tile for both countries. | On first launch it's a full download (~113 files). On subsequent 304 it's instant (all hash matches, zero network). `onProgress(loaded, total)` fires per tile. |
| `client.checkHistoryUpdates()` | Compares the root manifest's history hash against the last-seen one; only when it differs, downloads the index + missing day files and prunes day files older than 90 days. | Gated by the "Save price history on device" setting — when disabled the app never checks the hash nor pulls. Runs exactly once per launch; there is no manual refresh. |
| `client.getStationsNear(lat, lng, changedCountries)` | Returns nearby stations from both Spain and Portugal, deduplicated. | After `syncAll()` this is pure cache when nothing changed — zero network. On a day a country changed it re-fetches that country's manifest + changed tiles. Near-border users get stations from both sides. |

---

## Price history (server-side)

The full daily price-history archive is kept server-side (only a rolling 90-day window is cached on the device). The API publishes one file per date plus an index:

```
data/history/2026/2026-07-30.json   # flat array of { id, brand, fuels }
data/history/2027/2027-01-05.json
data/history/index.json             # { lastUpdated, days: [{ date, path, hash }...] }
```

Ffiles use the same schema:

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

A `FuelStationFeature` looks like:

```ts
{
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: {
    id: string,          // "es-XXXXX" or "pt-XXXXX"
    source: string,      // "ES" | "PT"
    name: string,        // station display name (PT)
    brand: string | null,// brand name (ES always has it, PT fallback to name)
    address: string,
    fuels: Record<string, number>,
    // … plus municipality, postalCode, schedule, etc.
  }
}
```

### `fuels` keys you'll encounter

The full set of fuel keys (in `src/utils/fuelNames.ts`), used both in station data and as filter chips:

| Key | Display (en) |
|---|---|
| `gasoline95` | Gasoline 95 |
| `gasoline95Plus` | Gasoline 95+ |
| `gasoline95Premium` | Gasoline 95 Premium |
| `gasoline98` | Gasoline 98 |
| `gasoline98Plus` | Gasoline 98+ |
| `diesel` | Diesel |
| `dieselPremium` | Diesel Premium |
| `dieselAgri` | Diesel Agricultural |
| `dieselB` | Discounted Diesel |
| `dieselRenewable` | Renewable Diesel |
| `dieselHeating` | Heating Diesel |
| `bioDiesel` | Biodiesel |
| `bioCng` | Bio-CNG |
| `bioLng` | Bio-LNG |
| `cng` | CNG |
| `cngkg` | CNG (kg) |
| `cngm3` | CNG (m³) |
| `lng` | LNG |
| `lpg` | LPG |
| `gasolineMix` | Mixed Gasoline |
| `adblue` | AdBlue |

Display names are localized via i18n (`fuel.*` keys); the column above shows the English strings. Not every station carries every fuel.

---

## Price history settings toggle

`app/(tabs)/settings.tsx` shows a **"Save price history on device"** switch:

- **On (default)**: `checkHistoryUpdates()` runs once per launch; the last 90 days are cached on the device and charts read from them.
- **Off**: the app never checks the history hash nor pulls anything; turning it off immediately deletes the cached history. The price-trends screen shows a "history is disabled" message.

The preference is stored in AsyncStorage under `siphon:settings:historyEnabled` (the same key the app checks at launch).
