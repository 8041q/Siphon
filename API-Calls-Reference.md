# Siphon Client — Public API Reference

All calls go through the `FuelDataClient` instance exported from `src/api/siphonClient.ts`:

```ts
const client = new FuelDataClient({
  store: hybridStore,   // injected in App.tsx
  baseUrl: 'https://raw.githubusercontent.com/8041q/SiphonAPI/main',
});
```

---

## Already wired in App.tsx

These run automatically on launch in this order:

| Call | Purpose | Notes |
|---|---|---|
| `client.checkForUpdates()` | Conditional GET on root manifest (sends `If-None-Match`). Returns `{ changedCountries, root, offline }`. | 304 = zero tile downloads are needed. On failure returns `offline: true` so the app falls back to cache. |
| `client.syncAll(changedCountries, onProgress)` | Downloads/refreshes every single tile for both countries. | On first launch it's a full download (~113 files). On subsequent 304 it's instant (all hash matches, zero network). `onProgress(loaded, total)` fires per tile. |
| `client.recordDailySnapshot()` | Extracts `{ id, brand, fuels }` from every station and writes a daily snapshot file. | No-op if today's snapshot already exists. One file per day, accumulates forever. |
| `client.getStationsNear(lat, lng, changedCountries)` | Returns nearby stations from both Spain and Portugal, deduplicated. | After `syncAll()` this is pure cache — zero network. Near-border users get stations from both sides. |

---

## Available for UI (not yet wired)

These are ready to call — you just need a button or gesture to trigger them.

### `client.clearPriceHistory()`

```ts
const { deleted } = await client.clearPriceHistory();
```

Deletes **every** daily snapshot ever recorded. All historical price data is gone.

| Returns | |
|---|---|
| `deleted: number` | How many snapshot files were removed |

### `client.trimPriceHistory(keepMonths?: number)`

```ts
const { deleted } = await client.trimPriceHistory(2);
// or with default (2 months):
const { deleted } = await client.trimPriceHistory();
```

Removes snapshots older than `keepMonths` months. Defaults to 2 months.

| Parameter | Default | |
|---|---|---|
| `keepMonths` | `2` | Keep this many months of history, delete everything older |

| Returns | |
|---|---|
| `deleted: number` | How many old snapshot files were removed |

---

## Internal methods (used by the above, not useful for UI directly)

| Method | Why it's internal |
|---|---|
| `getSpainManifest(changed, path?)` | Called by `syncAll`, `getStationsNear`, `recordDailySnapshot`. Fetch-or-cache the Spain manifest. |
| `getPortugalManifest(changed, path?)` | Same for Portugal. |
| `fetchIfChanged(entry)` | Core fetch-or-cache for a single tile/district geojson. Hash comparison avoids re-download. |
| `spainGridKey(lat, lng)` | Compute the 1°×1° grid key for a point. Used by `getStationsNear`. |
| `spainNeighborGridKeys(lat, lng)` | 3×3 block of grid keys around a point. Used by `getStationsNear` so boundary-area users get adjacent tiles. |
| `portugalDistrictsNear(manifest, lat, lng, padDegrees?)` | Bbox prefilter for Portugal districts near a point. Used by `getStationsNear`. |

---

## Types you'll use in UI code

```ts
import type { FuelStationFeature } from './src/api/siphonClient';
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

Common fuel types in the data:

| Key | Display |
|---|---|
| `gasoline95` | Gasolina 95 |
| `gasoline95Plus` | Gasolina 95+ |
| `gasoline98` | Gasolina 98 |
| `gasoline98Plus` | Gasolina 98+ |
| `diesel` | Gasóleo |
| `dieselPremium` | Gasóleo Premium |
| `dieselAgri` | Gasóleo Agrícola |
| `lpg` | GPL |
| `adblue` | AdBlue |

---

## Price snapshot file (read directly for charts/trends)

Snapshots are stored at (inside the app's document directory):

```
siphon/snapshots/2026-07-27.json
siphon/snapshots/2026-07-26.json
…
```

Each file is a flat JSON array with no geometry:

```json
[
  { "id": "es-10203", "brand": "REPSOL", "fuels": { "gasoline95": 1.829, "diesel": 1.709 } },
  { "id": "pt-65074", "brand": "GALP", "fuels": { "gasoline95": 2.031, "diesel": 2.098 } }
]
```

You can read these directly via `expo-file-system` for price comparison charts or trend views:

```ts
import * as FileSystem from 'expo-file-system/legacy';
const snapshot = await FileSystem.readAsStringAsync(
  FileSystem.documentDirectory + 'siphon/snapshots/2026-07-27.json'
);
const stations = JSON.parse(snapshot);
```
