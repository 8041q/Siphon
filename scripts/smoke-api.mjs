const baseUrl = 'https://raw.githubusercontent.com/8041q/SiphonAPI/main/';

async function fetchJson(path) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(new URL(path, baseUrl), {
        signal: AbortSignal.timeout(15_000),
        headers: { 'User-Agent': 'Siphon-release-smoke-test' },
      });
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

function firstDataPath(manifest) {
  const containers = [manifest.tiles, manifest.districts];
  for (const container of containers) {
    if (!container || typeof container !== 'object') continue;
    for (const entry of Object.values(container)) {
      if (entry && typeof entry === 'object' && typeof entry.path === 'string') return entry.path;
    }
  }
  return null;
}

const root = await fetchJson('manifest.json');
if (!root?.countries?.PT?.manifest || !root?.countries?.ES?.manifest) {
  throw new Error('Root manifest must contain PT and ES country manifest paths');
}

for (const country of ['PT', 'ES']) {
  const manifest = await fetchJson(root.countries[country].manifest);
  const dataPath = firstDataPath(manifest);
  if (!dataPath) throw new Error(`${country} manifest contains no station data path`);
  const collection = await fetchJson(dataPath);
  if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
    throw new Error(`${dataPath} is not a GeoJSON FeatureCollection`);
  }
  const sample = collection.features[0];
  if (sample && (sample.geometry?.type !== 'Point' || !sample.properties?.id)) {
    throw new Error(`${dataPath} contains an incompatible station feature`);
  }
  console.log(`${country}: ${collection.features.length} sample-tile stations (${dataPath})`);
}

console.log('SiphonAPI live contract smoke test passed');
