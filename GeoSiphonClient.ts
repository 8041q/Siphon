/**
 * GeoSiphonClient.ts
 *
 * Cross-platform (iOS + Android, via React Native / Expo) client for the
 * Siphon fuel-prices API described in API.md.
 *
 * Implements the exact polling algorithm from the docs:
 *   1. Conditional GET on the root manifest (ETag / If-None-Match).
 *   2. Compare each country's `hash` against what's cached locally.
 *   3. For a changed country, fetch its manifest and diff tile/district hashes.
 *   4. Only fetch the individual .geojson files whose hash actually changed.
 *   5. Cache everything (manifests + ETags + geojson) for next time.
 *
 * Storage is injected via a tiny interface that matches React Native's
 * AsyncStorage (`getItem`/`setItem`) exactly — on iOS and Android you just
 * pass AsyncStorage straight in, no adapter needed.
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

// Satisfied as-is by React Native's AsyncStorage (getItem/setItem) — that's
// the whole point. On web you could wrap localStorage in the same shape.
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

// ---------- Client ----------

const DEFAULT_BASE_URL = 'https://raw.githubusercontent.com/<user>/<repo>/main';

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
  // Common case is a single request returning 304 — nothing changed anywhere.
  async checkForUpdates(): Promise<{ changedCountries: CountryCode[]; root: RootManifest | null }> {
    const etag = await this.store.getItem(KEYS.rootEtag);
    const res = await fetch(`${this.baseUrl}/manifest.json`, {
      headers: etag ? { 'If-None-Match': etag } : {},
    });

    if (res.status === 304) {
      return { changedCountries: [], root: null };
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
    return { changedCountries, root };
  }

  // Step 3: fetch + cache a single country's manifest. Only call this for
  // countries checkForUpdates() actually flagged as changed.
  private async getCountryManifest<T>(code: CountryCode, path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${path}`);
    if (!res.ok) throw new Error(`${code} manifest fetch failed: ${res.status}`);
    const manifest: T = await res.json();
    await this.store.setItem(KEYS.countryManifest(code), JSON.stringify(manifest));
    return manifest;
  }

  async getSpainManifest(path = 'data/es/manifest.json'): Promise<SpainManifest> {
    return this.getCountryManifest<SpainManifest>('ES', path);
  }

  async getPortugalManifest(path = 'data/pt/manifest.json'): Promise<PortugalManifest> {
    return this.getCountryManifest<PortugalManifest>('PT', path);
  }

  // Step 4: fetch a tile/district .geojson ONLY if its hash differs from
  // what's already cached. Works for both ES tiles and PT districts since
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

  // Same formula as grid_key() in fetch_spain.py — no bbox lookup needed.
  spainGridKey(lat: number, lng: number): string {
    return `grid_${Math.floor(lat)}_${Math.floor(lng)}`;
  }

  // Grid keys for a point plus its 8 neighbors — handy near a tile boundary,
  // e.g. a user 2km from grid_40_-3's edge is often better served also
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

  // Portugal has no formula — bbox is the only prefilter, per API.md.
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
  // back to Portugal's bbox prefilter — a point only realistically matches
  // one country since ES/PT territory doesn't overlap.
  async getStationsNear(lat: number, lng: number): Promise<FuelStationFeature[]> {
    const features: FuelStationFeature[] = [];

    const es = await this.getSpainManifest();
    const key = this.spainGridKey(lat, lng);
    if (es.tiles[key]) {
      const geojson = await this.fetchIfChanged(es.tiles[key]);
      features.push(...geojson.features);
      return features;
    }

    const pt = await this.getPortugalManifest();
    const districts = this.portugalDistrictsNear(pt, lat, lng);
    for (const district of districts) {
      const geojson = await this.fetchIfChanged(district);
      features.push(...geojson.features);
    }
    return features;
  }
}

// ---------- Wiring (React Native / Expo — identical on iOS & Android) ----------
//
// npx expo install @react-native-async-storage/async-storage
//
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { FuelDataClient } from './siphonClient';
//
// const client = new FuelDataClient({
//   store: AsyncStorage, // satisfies KeyValueStore as-is, zero adapter code
//   baseUrl: 'https://raw.githubusercontent.com/<you>/<repo>/main',
// });
//
// const { changedCountries } = await client.checkForUpdates();
// const stations = await client.getStationsNear(38.7223, -9.1393); // e.g. Lisbon
