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
  private async getCountryManifest<T>(code: CountryCode, path: string, changed: boolean): Promise<T> {
    if (!changed) {
      const cached = await this.store.getItem(KEYS.countryManifest(code));
      if (cached) return JSON.parse(cached) as T;
      // No cache yet (very first launch, or storage was cleared)
    }

    const res = await fetch(`${this.baseUrl}/${path}`);
    if (!res.ok) throw new Error(`${code} manifest fetch failed: ${res.status}`);
    const manifest: T = await res.json();
    await this.store.setItem(KEYS.countryManifest(code), JSON.stringify(manifest));
    return manifest;
  }

  async getSpainManifest(changed: boolean, path = 'data/es/manifest.json'): Promise<SpainManifest> {
    return this.getCountryManifest<SpainManifest>('ES', path, changed);
  }

  async getPortugalManifest(changed: boolean, path = 'data/pt/manifest.json'): Promise<PortugalManifest> {
    return this.getCountryManifest<PortugalManifest>('PT', path, changed);
  }

  // Step 4: fetch a tile/district .geojson ONLY if its hash differs from what's already cached. Works for both ES tiles and PT districts since
  // they share the same {path, hash} shape.
  async fetchIfChanged(entry: { path: string; hash: string }): Promise<GeoJsonFeatureCollection> {
    const cachedHash = await this.store.getItem(KEYS.tileHash(entry.path));
    if (cachedHash === entry.hash) {
      const cached = await this.store.getItem(KEYS.tileData(entry.path));
      if (cached) return JSON.parse(cached);
    }

    const res = await fetch(`${this.baseUrl}/${entry.path}`);
    if (!res.ok) throw new Error(`Tile fetch failed: ${entry.path} (${res.status})`);
    const geojson: GeoJsonFeatureCollection = await res.json();

    await this.store.setItem(KEYS.tileHash(entry.path), entry.hash);
    await this.store.setItem(KEYS.tileData(entry.path), JSON.stringify(geojson));
    return geojson;
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
  // only what's actually needed." Tries Spain's grid formula first, falls
  // back to Portugal's bbox prefilter.
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
    const features: FuelStationFeature[] = [];

    const es = await this.getSpainManifest(changedCountries.includes('ES'));
    const key = this.spainGridKey(lat, lng);
    if (es.tiles[key]) {
      const geojson = await this.fetchIfChanged(es.tiles[key]);
      features.push(...geojson.features);
      return features;
    }

    const pt = await this.getPortugalManifest(changedCountries.includes('PT'));
    const districts = this.portugalDistrictsNear(pt, lat, lng);
    for (const district of districts) {
      const geojson = await this.fetchIfChanged(district);
      features.push(...geojson.features);
    }
    return features;
  }
}