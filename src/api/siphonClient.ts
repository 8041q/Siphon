/**
 * siphonClient.ts
 *
 * Cross-platform Client (iOS + Android, via React Native / Expo)
 * Storage is injected via a tiny interface that matches React Native's
 * AsyncStorage (`getItem`/`setItem`). On iOS and Android you just pass AsyncStorage straight in, no adapter needed.
 */
// ---------- Types matching the documented schemas ----------

import { RateLimiter, RateLimitedError, DEFAULT_BACKOFF_MS } from './rateLimit';

export type CountryCode = 'ES' | 'PT';

export interface RootManifest {
  version: number;
  generatedAt: string;
  countries: Record<CountryCode, { manifest: string; hash: string; lastUpdated: string | null }>;
  // Present on server version 2+. Optional so older roots keep working.
  history?: { path: string; hash: string; lastUpdated: string | null };
  commodities?: { path: string; hash: string; lastUpdated: string | null };
}

export interface HistoryDayEntry {
  date: string;
  path: string;
  hash: string;
}

export interface HistoryIndex {
  lastUpdated: string;
  days: HistoryDayEntry[];
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

export interface CommodityDataPoint {
  date: string;
  value: number;
}

export interface CommodityMetrics {
  fuel: string;
  country: string;
  status: 'ok' | 'insufficient_data';
  lagDays: number;
  correlation: number;
  rocket: number;
  feather: number;
  asymmetry: number;
  crudeTrend7d: number | null;
  crudeTrend30d: number | null;
}

export interface CommodityDashboard {
  lastUpdated: string;
  status: string;
  source: string;
  unit: string;
  crude: {
    brent: CommodityDataPoint[];
    wti: CommodityDataPoint[];
  };
  retail: Record<string, CommodityDataPoint[]>;
  metrics: Record<string, CommodityMetrics>;
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

export const PUBLISHED_FUEL_KEYS = [
  'gasoline95',
  'gasoline95Plus',
  'gasoline95Premium',
  'gasoline95E10',
  'gasoline95E25',
  'gasoline95E85',
  'gasoline98',
  'gasoline98Plus',
  'gasoline98E10',
  'gasolineMix',
  'gasolineRenewable',
  'diesel',
  'dieselPremium',
  'dieselAgri',
  'dieselB',
  'dieselRenewable',
  'dieselHeating',
  'bioDiesel',
  'biodiesel',
  'bioethanol',
  'bioCng',
  'bioLng',
  'cng',
  'cngkg',
  'cngm3',
  'lng',
  'lpg',
  'hydrogen',
  'adblue',
] as const;

export type FuelKey = (typeof PUBLISHED_FUEL_KEYS)[number];
export type FuelPrices = Partial<Record<FuelKey, number>>;

export type StationMarkerStatus = 'open' | 'closed' | 'unknown';

export interface StationEnrichmentProperties {
  _status?: StationMarkerStatus;
  _icon?: string;
  _price95?: string | null;
  _priceDiesel?: string | null;
  _sortLat?: number;
  _priceLabel?: string;
}

export interface PortugalStationHours {
  weekdays: string | null;
  saturday: string | null;
  sunday: string | null;
  holiday: string | null;
}

export interface PortugalStationExtra {
  stationType?: 'Outro' | 'Auto-estrada' | 'Área comercial (Hipermercados)';
  saleType?: never;
  margin?: never;
  reportingType?: never;
  ideess?: never;
  idMunicipio?: never;
  idProvincia?: never;
  idCCAA?: never;
}

export interface SpainStationExtra {
  stationType?: never;
  saleType?: 'P';
  margin?: 'D' | 'N' | 'I';
  reportingType?: 'dm' | 'OM';
  ideess?: string;
  idMunicipio?: string;
  idProvincia?: string;
  idCCAA?: string;
}

interface CommonStationProperties extends StationEnrichmentProperties {
  brand: string;
  address: string;
  municipality: string;
  /** Published tiles do not contain a `city` property; kept as `never` so legacy optional reads stay type-safe. */
  city?: never;
  fuels: FuelPrices;
}

export interface PortugalStationProperties extends CommonStationProperties {
  id: `pt-${number}`;
  source: 'PT';
  name: string;
  district: string;
  postalCode: string | null;
  lastUpdated: string;
  extra: PortugalStationExtra;
  services: string[];
  hours: PortugalStationHours | null;
  paymentMethods: string[];
  otherServices: string | null;
  observations: string | null;

  province?: never;
  schedule?: never;
}

export interface SpainStationProperties extends CommonStationProperties {
  id: `es-${number}`;
  source: 'ES';
  province: string;
  postalCode: string;
  schedule: string;
  extra: SpainStationExtra;

  name?: never;
  district?: never;
  lastUpdated?: never;
  hours?: never;
  services?: never;
  paymentMethods?: never;
  otherServices?: never;
  observations?: never;
}

export type FuelStationProperties = PortugalStationProperties | SpainStationProperties;

export interface FuelStationFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: FuelStationProperties;
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
  historyIndexHash: 'siphon:etag:historyIndex',
  historyCacheVersion: 'siphon:cache:historyVersion',
  commoditiesHash: 'siphon:etag:commodities',
  commoditiesData: 'siphon:data:commodities:dashboard',
  allStationsData: 'siphon:data:allStations',
  allStationsCacheVersion: 'siphon:cache:allStationsVersion',
  countryManifestCacheVersion: 'siphon:cache:countryManifestVersion',
};

// How many recent day files the device keeps locally. Older ones are pruned
// at launch; the server keeps the full history.
const HISTORY_DAYS_WINDOW = 90;
const NETWORK_TIMEOUT_MS = 15_000;
const ALL_STATIONS_CACHE_VERSION = '2';
const COUNTRY_MANIFEST_CACHE_VERSION = '2';
const HISTORY_CACHE_VERSION = '2';

// Safe JSON read for cached blobs: corrupt or partial data returns null
// instead of throwing up into the caller.
function tryParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}


const PUBLISHED_FUEL_KEY_SET: ReadonlySet<string> = new Set(PUBLISHED_FUEL_KEYS);

export function isFuelKey(value: string): value is FuelKey {
  return PUBLISHED_FUEL_KEY_SET.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isFuelPrices(value: unknown): value is FuelPrices {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  if (entries.length === 0) return false;
  return entries.every(
    ([key, price]) =>
      isFuelKey(key) &&
      typeof price === 'number' &&
      Number.isFinite(price),
  );
}

function isPortugalHours(value: unknown): value is PortugalStationHours | null {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  return ['weekdays', 'saturday', 'sunday', 'holiday'].every((key) => {
    const item = value[key];
    return item === null || typeof item === 'string';
  });
}

function isPortugalExtra(value: unknown): value is PortugalStationExtra {
  if (!isRecord(value)) return false;
  const stationType = value.stationType;
  return (
    stationType === undefined ||
    stationType === 'Outro' ||
    stationType === 'Auto-estrada' ||
    stationType === 'Área comercial (Hipermercados)'
  );
}

function isSpainExtra(value: unknown): value is SpainStationExtra {
  if (!isRecord(value)) return false;
  const saleType = value.saleType;
  const margin = value.margin;
  const reportingType = value.reportingType;
  const optionalStringKeys = ['ideess', 'idMunicipio', 'idProvincia', 'idCCAA'] as const;
  return (
    (saleType === undefined || saleType === 'P') &&
    (margin === undefined || margin === 'D' || margin === 'N' || margin === 'I') &&
    (reportingType === undefined || reportingType === 'dm' || reportingType === 'OM') &&
    optionalStringKeys.every((key) => value[key] === undefined || typeof value[key] === 'string')
  );
}


function hasValidEnrichment(properties: Record<string, unknown>): boolean {
  const status = properties._status;
  if (status !== undefined && status !== 'open' && status !== 'closed' && status !== 'unknown') return false;
  if (properties._icon !== undefined && typeof properties._icon !== 'string') return false;
  if (
    properties._price95 !== undefined &&
    properties._price95 !== null &&
    typeof properties._price95 !== 'string'
  ) return false;
  if (
    properties._priceDiesel !== undefined &&
    properties._priceDiesel !== null &&
    typeof properties._priceDiesel !== 'string'
  ) return false;
  if (
    properties._sortLat !== undefined &&
    (typeof properties._sortLat !== 'number' || !Number.isFinite(properties._sortLat))
  ) return false;
  if (properties._priceLabel !== undefined && typeof properties._priceLabel !== 'string') return false;
  return true;
}

export function isFuelStationFeature(value: unknown): value is FuelStationFeature {
  if (!isRecord(value) || value.type !== 'Feature') return false;

  const geometry = value.geometry;
  if (!isRecord(geometry) || geometry.type !== 'Point') return false;
  const coordinates = geometry.coordinates;
  if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    typeof coordinates[0] !== 'number' ||
    typeof coordinates[1] !== 'number' ||
    !Number.isFinite(coordinates[0]) ||
    !Number.isFinite(coordinates[1]) ||
    Math.abs(coordinates[0]) > 180 ||
    Math.abs(coordinates[1]) > 90
  ) {
    return false;
  }

  const properties = value.properties;
  if (!isRecord(properties)) return false;
  if (
    typeof properties.id !== 'string' ||
    typeof properties.source !== 'string' ||
    typeof properties.brand !== 'string' ||
    typeof properties.address !== 'string' ||
    typeof properties.municipality !== 'string' ||
    !isFuelPrices(properties.fuels) ||
    !hasValidEnrichment(properties)
  ) {
    return false;
  }

  if (properties.source === 'PT') {
    return (
      /^pt-\d+$/.test(properties.id) &&
      typeof properties.name === 'string' &&
      typeof properties.district === 'string' &&
      (typeof properties.postalCode === 'string' || properties.postalCode === null) &&
      typeof properties.lastUpdated === 'string' &&
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(properties.lastUpdated) &&
      isPortugalExtra(properties.extra) &&
      isStringArray(properties.services) &&
      isPortugalHours(properties.hours) &&
      isStringArray(properties.paymentMethods) &&
      (typeof properties.otherServices === 'string' || properties.otherServices === null) &&
      (typeof properties.observations === 'string' || properties.observations === null) &&
      properties.province === undefined &&
      properties.schedule === undefined
    );
  }

  if (properties.source === 'ES') {
    return (
      /^es-\d+$/.test(properties.id) &&
      typeof properties.province === 'string' &&
      typeof properties.postalCode === 'string' &&
      typeof properties.schedule === 'string' &&
      isSpainExtra(properties.extra) &&
      properties.name === undefined &&
      properties.district === undefined &&
      properties.lastUpdated === undefined &&
      properties.hours === undefined &&
      properties.services === undefined &&
      properties.paymentMethods === undefined &&
      properties.otherServices === undefined &&
      properties.observations === undefined
    );
  }

  return false;
}

export function parseGeoJsonFeatureCollection(value: unknown): GeoJsonFeatureCollection | null {
  if (!isRecord(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) {
    return null;
  }
  if (!value.features.every(isFuelStationFeature)) return null;
  return { type: 'FeatureCollection', features: value.features };
}

export class FuelDataClient {
  private baseUrl: string;
  private store: KeyValueStore;
  readonly rateLimiter: RateLimiter;

  constructor(opts: { store: KeyValueStore; baseUrl?: string }) {
    this.store = opts.store;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.rateLimiter = new RateLimiter(this.store);
  }

  // Single choke point for every GitHub request. Reserves an hourly-budget slot
  // before firing and persists a backoff when GitHub answers 429/403.
  private async fetchRateLimited(
    path: string,
    opts?: { method?: string; headers?: Record<string, string> }
  ): Promise<Response> {
    // Reserve atomically before starting the request so concurrent tile fetches
    // cannot all consume the same apparent budget slot.
    await this.rateLimiter.reserveRequest();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}/${path}`, { ...opts, signal: controller.signal });
      await this.handleRateLimitHeaders(res);
      return res;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async handleRateLimitHeaders(res: Response): Promise<void> {
    const retryAfter = res.headers.get('retry-after');
    const resetSec = res.headers.get('x-ratelimit-reset');
    const remaining = res.headers.get('x-ratelimit-remaining');

    const isExhausted = res.status === 429 || (res.status === 403 && remaining === '0');
    if (!isExhausted && !retryAfter && !(remaining === '0' && resetSec)) return;

    let untilMs: number;
    if (resetSec && Number.isFinite(Number(resetSec))) {
      untilMs = Number(resetSec) * 1000;
    } else if (retryAfter && Number.isFinite(Number(retryAfter))) {
      untilMs = Date.now() + Number(retryAfter) * 1000;
    } else {
      untilMs = Date.now() + DEFAULT_BACKOFF_MS;
    }
    await this.rateLimiter.recordBlocked(untilMs);
  }

  // Step 1+2: conditional GET the root manifest, diff country hashes.
  // If the network call fails. report offline:true and changedCountries:[]
  // so we fall back to whatever's cached rather than crashing the app.
  async checkForUpdates(): Promise<{ changedCountries: CountryCode[]; root: RootManifest | null; etag: string | null; offline: boolean }> {
    try {
      const cachedRoot = tryParse<RootManifest>(await this.store.getItem(KEYS.rootManifest));
      // Never send an ETag without the matching committed root. This repairs
      // older installs where the ETag could have been persisted before a sync
      // completed or while the root cache was missing/corrupt.
      const etag = cachedRoot ? await this.store.getItem(KEYS.rootEtag) : null;
      const res = await this.fetchRateLimited('manifest.json', {
        headers: etag ? { 'If-None-Match': etag } : {},
      });

      if (res.status === 304) {
        return { changedCountries: [], root: null, etag: null, offline: false };
      }
      if (!res.ok) {
        throw new Error(`Root manifest fetch failed: ${res.status}`);
      }

      const root: RootManifest = await res.json();
      const newEtag = res.headers.get('etag');

      const changedCountries = (Object.keys(root.countries) as CountryCode[]).filter(
        (code) => root.countries[code].hash !== cachedRoot?.countries?.[code]?.hash
      );

      // Do not advance the committed root/ETag yet. If the app is killed while
      // syncing country tiles, retaining the previous ETag guarantees the next
      // launch gets this root again and can retry the interrupted sync.
      return { changedCountries, root, etag: newEtag, offline: false };
    } catch (e) {
      if (e instanceof RateLimitedError) throw e;
      return { changedCountries: [], root: null, etag: null, offline: true };
    }
  }

  /** Commit a root manifest only after the corresponding data sync succeeds. */
  async commitRootManifest(root: RootManifest, etag: string | null): Promise<void> {
    // Root first is deliberate: if the app dies before the ETag write, the old
    // ETag only causes a harmless 200 next launch. The reverse order could pair
    // a new ETag with an old root and incorrectly accept a 304.
    await this.store.setItem(KEYS.rootManifest, JSON.stringify(root));
    if (etag) {
      await this.store.setItem(KEYS.rootEtag, etag);
    } else {
      await this.store.removeItem?.(KEYS.rootEtag);
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
  private async getCountryManifest<T>(
    code: CountryCode,
    path: string,
    changed: boolean,
    allowStale = true,
  ): Promise<T | null> {
    const cached = await this.store.getItem(KEYS.countryManifest(code));
    if (!changed) {
      const parsed = tryParse<T>(cached);
      if (parsed) return parsed;
    }

    try {
      const res = await this.fetchRateLimited(path);
      if (!res.ok) throw new Error(`${code} manifest fetch failed: ${res.status}`);
      const manifest: T = await res.json();
      await this.store.setItem(KEYS.countryManifest(code), JSON.stringify(manifest));
      return manifest;
    } catch (e) {
      if (e instanceof RateLimitedError) throw e;
      const stale = tryParse<T>(cached);
      if (allowStale) return stale;
      throw e;
    }
  }

  async getSpainManifest(
    changed: boolean,
    path = 'data/es/manifest.json',
    allowStale = true,
  ): Promise<SpainManifest | null> {
    return this.getCountryManifest<SpainManifest>('ES', path, changed, allowStale);
  }

  async getPortugalManifest(
    changed: boolean,
    path = 'data/pt/manifest.json',
    allowStale = true,
  ): Promise<PortugalManifest | null> {
    return this.getCountryManifest<PortugalManifest>('PT', path, changed, allowStale);
  }

  // Step 4: fetch a tile/district .geojson ONLY if its hash differs from what's already cached. Works for both ES tiles and PT districts since
  // they share the same {path, hash} shape.
  // If the network fetch fails and we have stale cached data, we return it
  // rather than throwing — so users can still see stations they previously
  // downloaded even when offline.
  async fetchIfChanged(entry: { path: string; hash: string }): Promise<GeoJsonFeatureCollection | null> {
    const cachedHash = await this.store.getItem(KEYS.tileHash(entry.path));
    if (cachedHash === entry.hash) {
      const cached = parseGeoJsonFeatureCollection(
        tryParse<unknown>(await this.store.getItem(KEYS.tileData(entry.path))),
      );
      if (cached) return cached;
    }

    try {
      const res = await this.fetchRateLimited(entry.path);
      if (!res.ok) throw new Error(`Tile fetch failed: ${entry.path} (${res.status})`);
      const geojson = parseGeoJsonFeatureCollection(await res.json());
      if (!geojson) throw new Error(`Invalid station tile: ${entry.path}`);
      // Commit data before its matching hash. If the process dies between these
      // writes, the next sync simply fetches the tile again. Writing the hash
      // first could make stale/partial data look current after a crash.
      await this.store.setItem(KEYS.tileData(entry.path), JSON.stringify(geojson));
      await this.store.setItem(KEYS.tileHash(entry.path), entry.hash);
      return geojson;
    } catch (e) {
      const cached = parseGeoJsonFeatureCollection(
        tryParse<unknown>(await this.store.getItem(KEYS.tileData(entry.path))),
      );
      if (cached) return cached;
      if (e instanceof RateLimitedError) throw e;
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
    // Version 2 forces one manifest refresh for installs upgrading from builds
    // that could commit the root before country sync completed. This repairs a
    // potentially stale country manifest even when the server now answers 304.
    const manifestCacheVersion = await this.store.getItem(KEYS.countryManifestCacheVersion);
    const forceManifestRefresh = manifestCacheVersion !== COUNTRY_MANIFEST_CACHE_VERSION;

    const [es, pt] = await Promise.all([
      this.getSpainManifest(
        forceManifestRefresh || changedCountries.includes('ES'),
        'data/es/manifest.json',
        false,
      ),
      this.getPortugalManifest(
        forceManifestRefresh || changedCountries.includes('PT'),
        'data/pt/manifest.json',
        false,
      ),
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

      // A stale cached tile is useful for the map, but it is not enough to mark
      // a new root manifest as fully synchronized. Verify each expected hash.
      const hashes = await Promise.all(
        batch.map((entry) => this.store.getItem(KEYS.tileHash(entry.path))),
      );
      if (hashes.some((hash, index) => hash !== batch[index].hash)) {
        throw new Error('Station tile sync incomplete; keeping previous root manifest.');
      }

      loaded += batch.length;
      onProgress?.(loaded, total);
    }

    await this.store.setItem(KEYS.countryManifestCacheVersion, COUNTRY_MANIFEST_CACHE_VERSION);
    return { tileCount: total };
  }

  // ---------- Price history (server-side) ----------

  // Daily price history lives on the server as one day file per date
  // (data/history/{YYYY}/{YYYY-MM-DD}.json) plus an index with per-day
  // hashes. The root manifest carries a hash of that index.
  //
  // Called exactly once per app launch (inside the same load() that runs
  // checkForUpdates). When the index hash hasn't moved there is zero network
  // traffic; when it has, only the missing/changed day files are downloaded.
  // Day files older than HISTORY_DAYS_WINDOW are pruned from the device.
  async checkHistoryUpdates(): Promise<{ changed: boolean; downloadedDays: number; offline: boolean }> {
    try {
      const root = tryParse<RootManifest>(await this.store.getItem(KEYS.rootManifest));
      if (!root) return { changed: false, downloadedDays: 0, offline: false };
      if (!root.history) return { changed: false, downloadedDays: 0, offline: false };

      const [cachedHash, cacheVersion] = await Promise.all([
        this.store.getItem(KEYS.historyIndexHash),
        this.store.getItem(KEYS.historyCacheVersion),
      ]);
      if (cachedHash === root.history.hash && cacheVersion === HISTORY_CACHE_VERSION) {
        return { changed: false, downloadedDays: 0, offline: false };
      }

      const res = await this.fetchRateLimited(root.history.path);
      if (!res.ok) throw new Error(`History index fetch failed: ${res.status}`);
      const index: HistoryIndex = await res.json();

      let downloadedDays = 0;
      let incomplete = false;
      for (const day of index.days) {
        const outcome = await this.fetchHistoryDay(day);
        if (outcome === 'fetched') downloadedDays++;
        if (outcome === 'failed') incomplete = true;
      }

      await this.pruneOldHistoryDays();
      this.historyMemo.clear();

      if (incomplete) {
        // Keep the previous index hash so the next launch retries missing days.
        return { changed: downloadedDays > 0, downloadedDays, offline: true };
      }

      // Commit the index only after every referenced day is present. The cache
      // version forces one repair pass for installs that used the older
      // hash-before-data ordering.
      await this.store.setItem(KEYS.historyIndexHash, root.history.hash);
      await this.store.setItem(KEYS.historyCacheVersion, HISTORY_CACHE_VERSION);
      return { changed: true, downloadedDays, offline: false };
    } catch (e) {
      if (e instanceof RateLimitedError) throw e;
      return { changed: false, downloadedDays: 0, offline: true };
    }
  }

  // History data keys live under the file-backed 'siphon:history:' prefix;
  // hashes reuse the AsyncStorage-backed 'siphon:hash:' prefix (paths differ
  // from tiles, so there is no collision).
  private historyDayKey(path: string): string {
    return 'siphon:history:' + path.slice('data/history/'.length);
  }

  private dateFromHistoryKey(key: string): string | null {
    const match = key.match(/(\d{4}-\d{2}-\d{2})\.json$/);
    return match ? match[1] : null;
  }

  private async fetchHistoryDay(entry: HistoryDayEntry): Promise<'fetched' | 'cached' | 'failed'> {
    const key = this.historyDayKey(entry.path);
    const cachedHash = await this.store.getItem(KEYS.tileHash(entry.path));
    if (cachedHash === entry.hash) {
      const cached = await this.store.getItem(key);
      if (cached) return 'cached';
    }

    try {
      const res = await this.fetchRateLimited(entry.path);
      if (!res.ok) throw new Error(`History day fetch failed: ${entry.path} (${res.status})`);
      const data = await res.text();
      // Body first, hash last: a crash can cause a harmless re-download, never
      // a false cache hit against missing/stale history data.
      await this.store.setItem(key, data);
      await this.store.setItem(KEYS.tileHash(entry.path), entry.hash);
      return 'fetched';
    } catch (e) {
      if (e instanceof RateLimitedError) throw e;
      const cached = await this.store.getItem(key);
      return cached ? 'cached' : 'failed';
    }
  }

  private async pruneOldHistoryDays(): Promise<void> {
    if (!this.store.listKeys || !this.store.removeItem) return;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - HISTORY_DAYS_WINDOW);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const keys = await this.store.listKeys('siphon:history:');
    for (const key of keys) {
      const date = this.dateFromHistoryKey(key);
      if (date && date < cutoffStr) {
        await this.store.removeItem(key);
      }
    }
  }

  // Reads a station's price series for one fuel from the cached day files.
  // Results are memoized in memory for the session (bounded; cleared whenever
  // history updates or the cache is cleared), so repeated opens of the same
  // chart are instant.
  private historyMemo = new Map<string, PriceHistoryPoint[]>();

  private memoizeHistory(key: string, points: PriceHistoryPoint[]): void {
    if (this.historyMemo.size > 50) this.historyMemo.clear();
    this.historyMemo.set(key, points);
  }

  async getPriceHistory(stationId: string, fuelType: string): Promise<PriceHistoryPoint[]> {
    const memoKey = `${stationId}:${fuelType}`;
    const memoized = this.historyMemo.get(memoKey);
    if (memoized) return memoized;

    const keys = (await this.store.listKeys?.('siphon:history:')) ?? [];
    const points: PriceHistoryPoint[] = [];

    for (const key of keys) {
      const date = this.dateFromHistoryKey(key);
      if (!date) continue;
      const raw = await this.store.getItem(key);
      if (!raw) continue;
      try {
        const entries: Array<{ id: string; fuels: Record<string, number> }> = JSON.parse(raw);
        const entry = entries.find((e) => e.id === stationId);
        if (entry && fuelType in entry.fuels) {
          points.push({ date, price: entry.fuels[fuelType] });
        }
      } catch {
        // skip corrupt day files
      }
    }

    points.sort((a, b) => a.date.localeCompare(b.date));
    this.memoizeHistory(memoKey, points);
    return points;
  }

  // Deletes every cached history day file and the index hash. Called when the
  // user turns the "save price history on device" toggle off.
  async clearHistoryCache(): Promise<{ deleted: number }> {
    let deleted = 0;
    if (this.store.listKeys && this.store.removeItem) {
      const keys = await this.store.listKeys('siphon:history:');
      for (const key of keys) {
        await this.store.removeItem(key);
        deleted++;
      }
    }
    await this.store.removeItem?.(KEYS.historyIndexHash);
    await this.store.removeItem?.(KEYS.historyCacheVersion);
    this.historyMemo.clear();
    return { deleted };
  }

  // ---------- Commodity dashboard ----------

  // Fetches the single data/commodities/dashboard.json file from the server
  // whenever its hash changes. Mirrors the history pattern (hash-gated,
  // optional — only runs when root.commodities exists).
  //
  // On success returns the parsed dashboard; on hash-match returns null;
  // on ordinary network failure falls back to stale cache; RateLimitedError propagates.
  async checkCommodityUpdates(root: RootManifest | null): Promise<CommodityDashboard | null> {
    if (!root?.commodities) return null;

    try {
      const cachedHash = await this.store.getItem(KEYS.commoditiesHash);
      if (cachedHash === root.commodities.hash) {
        const cached = tryParse<CommodityDashboard>(await this.store.getItem(KEYS.commoditiesData));
        if (cached) return cached;
        // A hash without a readable body can be left behind by an older build
        // that committed metadata first. Fall through and repair it.
      }

      const res = await this.fetchRateLimited(root.commodities.path);
      if (!res.ok) throw new Error(`Commodity fetch failed: ${res.status}`);
      const data: CommodityDashboard = await res.json();
      await this.store.setItem(KEYS.commoditiesData, JSON.stringify(data));
      await this.store.setItem(KEYS.commoditiesHash, root.commodities.hash);
      return data;
    } catch (e) {
      if (e instanceof RateLimitedError) throw e;
      const cached = tryParse<CommodityDashboard>(await this.store.getItem(KEYS.commoditiesData));
      return cached;
    }
  }

  /** Read the commodity dashboard from the same file-backed store used by sync. */
  async getCachedCommodityDashboard(): Promise<CommodityDashboard | null> {
    return tryParse<CommodityDashboard>(await this.store.getItem(KEYS.commoditiesData));
  }

  // Convenience: reads the cached root manifest, then runs the commodities
  // hash-gated update. Call once per launch (after checkForUpdates). Returning
  // the resolved dashboard lets UI hooks use the same storage abstraction.
  async refreshCommodityDashboard(): Promise<CommodityDashboard | null> {
    try {
      const root = tryParse<RootManifest>(await this.store.getItem(KEYS.rootManifest));
      const updated = await this.checkCommodityUpdates(root);
      return updated ?? this.getCachedCommodityDashboard();
    } catch {
      return this.getCachedCommodityDashboard();
    }
  }

  // ---------- All-stations cache ----------

  async getAllCachedStations(): Promise<FuelStationFeature[]> {
    // This method is deliberately cache-only. It is used while offline or rate
    // limited, so it must never call fetchIfChanged()/country manifest fetches.
    const es = tryParse<SpainManifest>(await this.store.getItem(KEYS.countryManifest('ES')));
    const pt = tryParse<PortugalManifest>(await this.store.getItem(KEYS.countryManifest('PT')));

    const seen = new Set<string>();
    const features: FuelStationFeature[] = [];

    const appendEntry = async (entry: { path: string }) => {
      const geojson = parseGeoJsonFeatureCollection(
        tryParse<unknown>(await this.store.getItem(KEYS.tileData(entry.path))),
      );
      if (!geojson) return;
      for (const feature of geojson.features) {
        const id = feature.properties?.id;
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        features.push(feature);
      }
    };

    const entries = [
      ...(es ? Object.values(es.tiles) : []),
      ...(pt ? Object.values(pt.districts) : []),
    ];

    // Cache rebuilds are uncommon, but a cold/offline fallback can touch a few
    // hundred files. Bounded parallel reads avoid a long serial startup without
    // opening every file at once.
    const READ_CONCURRENCY = 16;
    for (let index = 0; index < entries.length; index += READ_CONCURRENCY) {
      await Promise.all(entries.slice(index, index + READ_CONCURRENCY).map(appendEntry));
    }

    return features;
  }

  async saveAllStationsCache(stations: FuelStationFeature[]): Promise<void> {
    await this.store.setItem(KEYS.allStationsData, JSON.stringify(stations));
    await this.store.setItem(KEYS.allStationsCacheVersion, ALL_STATIONS_CACHE_VERSION);
  }

  async loadAllStationsCache(): Promise<FuelStationFeature[] | null> {
    const version = await this.store.getItem(KEYS.allStationsCacheVersion);
    if (version !== ALL_STATIONS_CACHE_VERSION) return null;
    const raw = await this.store.getItem(KEYS.allStationsData);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return null;
      const stations = parsed.filter(isFuelStationFeature);
      return stations.length === parsed.length ? stations : null;
    } catch {
      return null;
    }
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
    changedCountries: CountryCode[] = [],
    bounds?: [number, number, number, number]
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
        if (bounds) {
          const [west, south, east, north] = bounds;
          const margin = 0.15;
          const dLat = (north - south) * margin;
          const dLng = (east - west) * margin;
          const [slng, slat] = f.geometry.coordinates;
          if (slat < south - dLat || slat > north + dLat || slng < west - dLng || slng > east + dLng) continue;
        }
        features.push(f);
      }
    }

    return features;
  }
}