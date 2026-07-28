/**
 * siphonClient.ts
 *
 * Cross-platform Client (iOS + Android, via React Native / Expo)
 * Storage is injected via a tiny interface that matches React Native's
 * AsyncStorage (`getItem`/`setItem`). On iOS and Android you just pass AsyncStorage straight in, no adapter needed.
 */
// ---------- Types matching the documented schemas ----------

export type CountryCode = 'ES' | 'PT';

export interface RootManifest {
  version: number;
  generatedAt: string;
  countries: Record<CountryCode, { manifest: string; hash: string; lastUpdated: string | null }>;
}

export interface SpainTile {
  path: string;
  stationCount: number;
  bbox: [number, number, number, number];
  hash: string;
}

export interface SpainManifest {
  lastUpdated: string;
  tileCount: number;
  tiles: Record<string, SpainTile>;
}

export interface PortugalDistrict {
  path: string;
  stationCount: number;
  bbox: [number, number, number, number];
  hash: string;
}

export interface PortugalManifest {
  generatedAt: string;
  dataUpdatedThrough: string;
  stationCount: number;
  districts: Record<string, PortugalDistrict>;
}

export interface FuelStationFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, any>;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: FuelStationFeature[];
}

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  listKeys?(prefix: string): Promise<string[]>;
  removeItem?(key: string): Promise<void>;
}

// ---------- Client ----------

const DEFAULT_BASE_URL = 'https://raw.githubusercontent.com/8041q/SiphonAPI/main';

const KEYS = {
  rootEtag: 'siphon:etag:root',
  rootManifest: 'siphon:manifest:root',
  countryManifest: (c: CountryCode) => `siphon:manifest:${c}`,
  tileHash: (path: string) => `siphon:hash:${path}`,
  tileData: (path: string) => `siphon:data:${path}`,
};

export class FuelDataClient {
  private baseUrl: string;
  private store: KeyValueStore;

  constructor(opts: { store: KeyValueStore; baseUrl?: string }) {
    this.store = opts.store;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  // Step 1+2: conditional GET the root manifest, diff country hashes.
  // If the network call fails. report offline:true and changedCountries:[]
  // so we fall back to whatever's cached rather than crashing the app.
  async checkForUpdates(): Promise<{ changedCountries: CountryCode[]; root: RootManifest | null; offline: boolean }> {
    try {
      const etag = await this.store.getItem(KEYS.rootEtag);
      const res = await fetch(`${this.baseUrl}/manifest.json`, {
        headers: etag ? { 'If-None-Match': etag } : {},
      });

      if (res.status === 304) {
        return { changedCountries: [], root: null, offline: false };
      }
      if (!res.ok) {
        throw new Error(`Root manifest fetch failed: ${res.status}`);
      }

      const root: RootManifest = await res.json();
      const newEtag = res.headers.get('etag');
      if (newEtag) await this.store.setItem(KEYS.rootEtag, newEtag);

      const cachedRootRaw = await this.store.getItem(KEYS.rootManifest);
      const cachedRoot: RootManifest | null = cachedRootRaw ? JSON.parse(cachedRootRaw) : null;

      const changedCountries = (Object.keys(root.countries) as CountryCode[]).filter(
        (code) => root.countries[code].hash !== cachedRoot?.countries?.[code]?.hash
      );

      await this.store.setItem(KEYS.rootManifest, JSON.stringify(root));
      return { changedCountries, root, offline: false };
    } catch {
      return { changedCountries: [], root: null, offline: true };
    }
  }

  // Step 3: fetch + cache a single country's manifest — but only over the
  // network if `changed` is true (i.e. checkForUpdates() flagged this
  // country's hash as different from what we last saw). Otherwise use the
  // manifest we cached last time. This is what makes "unchanged countries:
  // skip entirely" (API.md step 2) actually happen.
  //
  // If the network fetch fails and we have a stale cache, we return it
  // rather than crashing — the map isn't useless just because the user
  // briefly lost connectivity.
  private async getCountryManifest<T>(code: CountryCode, path: string, changed: boolean): Promise<T | null> {
    const cached = await this.store.getItem(KEYS.countryManifest(code));
    if (!changed && cached) return JSON.parse(cached) as T;

    try {
      const res = await fetch(`${this.baseUrl}/${path}`);
      if (!res.ok) throw new Error(`${code} manifest fetch failed: ${res.status}`);
      const manifest: T = await res.json();
      await this.store.setItem(KEYS.countryManifest(code), JSON.stringify(manifest));
      return manifest;
    } catch (e) {
      if (cached) return JSON.parse(cached) as T;
      return null;
    }
  }

  async getSpainManifest(changed: boolean, path = 'data/es/manifest.json'): Promise<SpainManifest | null> {
    return this.getCountryManifest<SpainManifest>('ES', path, changed);
  }

  async getPortugalManifest(changed: boolean, path = 'data/pt/manifest.json'): Promise<PortugalManifest | null> {
    return this.getCountryManifest<PortugalManifest>('PT', path, changed);
  }

  // Step 4: fetch a tile/district .geojson ONLY if its hash differs from what's already cached. Works for both ES tiles and PT districts since
  // they share the same {path, hash} shape.
  // If the network fetch fails and we have stale cached data, we return it
  // rather than throwing — so users can still see stations they previously
  // downloaded even when offline.
  async fetchIfChanged(entry: { path: string; hash: string }): Promise<GeoJsonFeatureCollection | null> {
    const cachedHash = await this.store.getItem(KEYS.tileHash(entry.path));
    if (cachedHash === entry.hash) {
      const cached = await this.store.getItem(KEYS.tileData(entry.path));
      if (cached) return JSON.parse(cached);
    }

    try {
      const res = await fetch(`${this.baseUrl}/${entry.path}`);
      if (!res.ok) throw new Error(`Tile fetch failed: ${entry.path} (${res.status})`);
      const geojson: GeoJsonFeatureCollection = await res.json();
      await this.store.setItem(KEYS.tileHash(entry.path), entry.hash);
      await this.store.setItem(KEYS.tileData(entry.path), JSON.stringify(geojson));
      return geojson;
    } catch (e) {
      const cached = await this.store.getItem(KEYS.tileData(entry.path));
      if (cached) return JSON.parse(cached);
      return null;
    }
  }

  // Step 5: download (or refresh from cache) every single tile/district for
  // both countries so the full dataset lives on-device. On first launch every
  // tile is fetched from the network; on subsequent launches with a 304 root
  // manifest hash-comparisons skip unchanged tiles at zero network cost.
  //
  // `onProgress` fires once per tile so the UI can show a progress bar.
  async syncAll(
    changedCountries: CountryCode[] = [],
    onProgress?: (loaded: number, total: number) => void
  ): Promise<{ tileCount: number }> {
    const [es, pt] = await Promise.all([
      this.getSpainManifest(changedCountries.includes('ES')),
      this.getPortugalManifest(changedCountries.includes('PT')),
    ]);
    const entries = [
      ...(es ? Object.values(es.tiles) : []),
      ...(pt ? Object.values(pt.districts) : []),
    ];
    const total = entries.length;
    let loaded = 0;

    const CONCURRENCY = 6;
    for (let i = 0; i < entries.length; i += CONCURRENCY) {
      const batch = entries.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map((entry) => this.fetchIfChanged(entry)));
      loaded += batch.length;
      onProgress?.(loaded, total);
    }

    return { tileCount: total };
  }

  // ---------- Price history ----------

  // Walk every cached tile/district for both countries, extract station
  // identity + current fuel prices, and write a daily snapshot.
  // Only the first call per calendar day actually writes — repeated calls
  // the same day are no-ops. This keeps history compact while giving you
  // a full price picture every day.
  //
  // Spain tiles and Portugal districts are structurally different in how
  // they partition data, but each feature in the geojson carries the same
  // {id, brand, fuels} property shape, so the extraction is identical.
  // For Portugal we fall back from `brand` to `name` when brand is empty.
  async recordDailySnapshot(): Promise<{ recorded: boolean; stationCount: number }> {
    const today = new Date().toISOString().split('T')[0];
    const key = `siphon:snapshot:${today}`;

    if (await this.store.getItem(key)) {
      return { recorded: false, stationCount: 0 };
    }

    const es = await this.getSpainManifest(false);
    const pt = await this.getPortugalManifest(false);

    const stations: Array<{ id: string; brand: string | null; fuels: Record<string, number> }> = [];

    if (es) {
      for (const tile of Object.values(es.tiles)) {
        const geojson = await this.fetchIfChanged(tile);
        if (!geojson) continue;
        for (const f of geojson.features) {
          stations.push({
            id: f.properties.id,
            brand: f.properties.brand ?? null,
            fuels: f.properties.fuels ?? {},
          });
        }
      }
    }

    if (pt) {
      for (const district of Object.values(pt.districts)) {
        const geojson = await this.fetchIfChanged(district);
        if (!geojson) continue;
        for (const f of geojson.features) {
          stations.push({
            id: f.properties.id,
            brand: f.properties.brand ?? f.properties.name ?? null,
            fuels: f.properties.fuels ?? {},
          });
        }
      }
    }

    if (stations.length === 0) return { recorded: false, stationCount: 0 };

    await this.store.setItem(key, JSON.stringify(stations));
    return { recorded: true, stationCount: stations.length };
  }

  // Delete every daily snapshot ever recorded. All historical data is gone.
  async clearPriceHistory(): Promise<{ deleted: number }> {
    if (!this.store.listKeys || !this.store.removeItem) return { deleted: 0 };
    const keys = await this.store.listKeys('siphon:snapshot:');
    for (const key of keys) {
      await this.store.removeItem(key);
    }
    return { deleted: keys.length };
  }

  // Remove snapshots older than `keepMonths` months. Useful when you want
  // to free space without wiping everything.
  async trimPriceHistory(keepMonths: number = 2): Promise<{ deleted: number }> {
    if (!this.store.listKeys || !this.store.removeItem) return { deleted: 0 };
    const keys = await this.store.listKeys('siphon:snapshot:');
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - keepMonths);

    let deleted = 0;
    for (const key of keys) {
      const dateStr = key.split(':').pop()!;
      const snapshotDate = new Date(dateStr + 'T00:00:00Z');
      if (snapshotDate < cutoff) {
        await this.store.removeItem(key);
        deleted++;
      }
    }
    return { deleted };
  }

  // ---------- Spatial helpers ----------

  // Same formula as grid_key() in fetch_spain.py - no bbox lookup needed.
  spainGridKey(lat: number, lng: number): string {
    return `grid_${Math.floor(lat)}_${Math.floor(lng)}`;
  }

  // Grid keys for a point plus its 8 neighbors - handy near a tile boundary,
  // a user 2km from grid_40_-3's edge is often better served also
  // pulling grid_40_-4.
  spainNeighborGridKeys(lat: number, lng: number): string[] {
    const keys: string[] = [];
    for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLng = -1; dLng <= 1; dLng++) {
        keys.push(this.spainGridKey(lat + dLat, lng + dLng));
      }
    }
    return [...new Set(keys)];
  }

  // Portugal has no formula - bbox is the only prefilter
  portugalDistrictsNear(
    manifest: PortugalManifest,
    lat: number,
    lng: number,
    padDegrees = 0.2
  ): PortugalDistrict[] {
    return Object.values(manifest.districts).filter(({ bbox }) => {
      const [minLng, minLat, maxLng, maxLat] = bbox;
      return (
        lng >= minLng - padDegrees &&
        lng <= maxLng + padDegrees &&
        lat >= minLat - padDegrees &&
        lat <= maxLat + padDegrees
      );
    });
  }

  // High-level convenience: "every station feature near this point, fetching
  // only what's actually needed."
  //
  // Checks BOTH Spain and Portugal so users near the border get stations
  // from both sides instead of just one country's data. Spain tiles are
  // looked up via a 3×3 grid-key block around the point so a user near a
  // tile boundary also pulls adjacent tiles.
  //
  // `changedCountries` should be the array returned by checkForUpdates() —
  // pass it straight through so a country whose hash didn't move is read
  // from cache instead of re-fetched. On the common "nothing changed"
  // day, that combined with checkForUpdates()'s 304 means this whole
  // function does zero network requests.
  async getStationsNear(
    lat: number,
    lng: number,
    changedCountries: CountryCode[] = []
  ): Promise<FuelStationFeature[]> {
    const seen = new Set<string>();

    const [es, pt] = await Promise.all([
      this.getSpainManifest(changedCountries.includes('ES')),
      this.getPortugalManifest(changedCountries.includes('PT')),
    ]);

    const esEntries = es
      ? this.spainNeighborGridKeys(lat, lng)
          .map((key) => es.tiles[key])
          .filter(Boolean)
      : [];
    const ptEntries = pt
      ? this.portugalDistrictsNear(pt, lat, lng)
      : [];

    const allEntries = [...esEntries, ...ptEntries];
    const geojsons = await Promise.all(allEntries.map((e) => this.fetchIfChanged(e)));

    const features: FuelStationFeature[] = [];
    for (const geojson of geojsons) {
      if (!geojson) continue;
      for (const f of geojson.features) {
        if (f.properties.id && seen.has(f.properties.id)) continue;
        if (f.properties.id) seen.add(f.properties.id);
        features.push(f);
      }
    }

    return features;
  }
}