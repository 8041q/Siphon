# Data client reference

The app's `FuelDataClient` lives in [src/api/siphonClient.ts](../src/api/siphonClient.ts). [src/hooks/useApp.tsx](../src/hooks/useApp.tsx) exports the shared `client` and coordinates startup sync. Use the exported types and constants from the source; the dataset format is documented in [SiphonAPI](https://github.com/8041q/SiphonAPI/blob/main/API.md).

```ts
const client = new FuelDataClient({
  store: hybridStore,
  baseUrl: 'https://raw.githubusercontent.com/8041q/SiphonAPI/main',
});
```

## Startup and cache

The app loads the verified aggregate station cache in parallel with the sync gate. It then checks the root manifest using an ETag. Changed country hashes, missing aggregates, or cache migrations trigger station sync/verification. The root manifest is committed after successful station sync so failed downloads remain retryable.

With a verified cache and unchanged country hashes, station sync skips the full tile walk. History and commodity updates use their own hashes. Cached data remains usable when offline or rate limited; a first install still needs a successful download.

[hybridStore](../src/store/hybridStore.ts) keeps large station/history data and routing caches in files, with smaller settings in AsyncStorage. A persistent request budget, sync cooldown, and backoff on 429/403 protect the GitHub data source. These limits apply to data-client requests, not every network request made by the app.

## Main methods

| Method | Purpose |
| --- | --- |
| `checkForUpdates()` | Reads the root manifest; returns changed countries, manifest, ETag, and offline status. This checks datasets, not app binaries. |
| `syncAll(changedCountries, onProgress?)` | Refreshes or verifies country manifests and station tiles. |
| `commitRootManifest(root, etag)` | Saves the successfully synchronized manifest and ETag. |
| `loadAllStationsCache()` | Loads the versioned aggregate cache, or returns null when verification is needed. |
| `getAllCachedStations()` | Reads the cached station tiles without network access. |
| `getStationsNear(lat, lng, changedCountries)` | Loads nearby PT districts and ES grid tiles, including neighboring tiles, and deduplicates results. |
| `checkHistoryUpdates()` | Downloads missing/changed history days and prunes the device cache to 90 days. |
| `getPriceHistory(stationId, fuelType)` | Reads a sorted series from cached day files, memoized for the session. |
| `clearHistoryCache()` | Deletes history files and resets the index hash. |
| `refreshCommodityDashboard()` | Refreshes market data when its manifest hash changes, with a cached fallback. |

The **Save price history on device** setting defaults to on. Turning it off deletes the local history and prevents subsequent history downloads. The preference key is `siphon:settings:historyEnabled`.

## Station types and corrections

Import `FuelStationFeature`, `FuelKey`, and `PUBLISHED_FUEL_KEYS` from the client source. Station properties are discriminated by `source: 'PT' | 'ES'`; narrow on that value before accessing country-specific fields. Portugal includes structured hours, services, and payment methods; Spain publishes its schedule and government identifiers. Marker fields prefixed with `_` are app enrichment, not raw API data.

Use the published fuel-key union rather than maintaining a second list. In particular, `bioDiesel` and `biodiesel` are distinct published keys.

Station corrections are reported through the SiphonAPI issue template and reviewed into server-side overrides. They arrive through normal data sync; fuel prices are not overridable.

## Routing is separate

[routing/index.ts](../src/routing/index.ts) selects the OSRM provider and its HTTPS endpoint. [routeDistance.ts](../src/utils/routeDistance.ts) handles cached road distances, batch refinement, and local estimates when a request fails. Routing caches are separate from public dataset sync. [DATA-SAFETY.md](DATA-SAFETY.md) covers the location disclosure and off-device coordinates.
