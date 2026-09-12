import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Directory, Paths } from 'expo-file-system';

import type { KeyValueStore } from '../api/siphonClient';

const DATA_DIR = new Directory(Paths.document, 'siphon');
const TILES_DIR = new Directory(DATA_DIR, 'tiles');
const HISTORY_DIR = new Directory(DATA_DIR, 'history');
const RATE_DIR = new Directory(DATA_DIR, 'rate');
const ROUTE_DIR = new Directory(DATA_DIR, 'routes');
let fileStorePrepared = false;

function prepareFileStore(): void {
  if (fileStorePrepared) return;
  fileStorePrepared = true;
  ensureDir(DATA_DIR);

  // Atomic writes use root-level .tmp-* files. If the process is terminated
  // between create/write and move, that temp file is intentionally not a valid
  // cache entry. Remove leftovers once at startup before any new write can
  // create an active temp file.
  try {
    for (const item of DATA_DIR.list()) {
      if (item instanceof File && item.name.startsWith('.tmp-')) {
        try {
          item.delete();
        } catch {
          // Best-effort orphan cleanup; cache access can continue.
        }
      }
    }
  } catch {
    // The normal per-operation error handling below remains authoritative.
  }
}

function ensureDir(dir: Directory): void {
  dir.create({ intermediates: true, idempotent: true });
}

function assertSafeRelative(relative: string): void {
  if (relative.startsWith('/')) throw new Error(`Unsafe key path (absolute): ${relative}`);
  if (relative.split('/').includes('..')) throw new Error(`Unsafe key path (.. traversal): ${relative}`);
}

function tileFilePath(key: string): File {
  const tilePath = key.slice('siphon:data:'.length);
  assertSafeRelative(tilePath);
  return new File(TILES_DIR, tilePath);
}

function historyFilePath(key: string): File {
  const historyPath = key.slice('siphon:history:'.length);
  assertSafeRelative(historyPath);
  return new File(HISTORY_DIR, historyPath);
}

function rateFilePath(key: string): File {
  const ratePath = key.slice('siphon:rate:'.length);
  assertSafeRelative(ratePath);
  return new File(RATE_DIR, ratePath);
}

function routeFilePath(key: string): File {
  const routePath = key.slice('siphon:route:'.length);
  assertSafeRelative(routePath);
  return new File(ROUTE_DIR, routePath);
}

function isFileKey(key: string): boolean {
  return (
    key.startsWith('siphon:data:') ||
    key.startsWith('siphon:history:') ||
    key.startsWith('siphon:rate:') ||
    key.startsWith('siphon:route:')
  );
}

function filePathForKey(key: string): File {
  if (key.startsWith('siphon:data:')) return tileFilePath(key);
  if (key.startsWith('siphon:history:')) return historyFilePath(key);
  if (key.startsWith('siphon:rate:')) return rateFilePath(key);
  if (key.startsWith('siphon:route:')) return routeFilePath(key);
  throw new Error(`Unsupported key: ${key}`);
}

function ensureNestedDir(base: Directory, subPath: string): void {
  const lastSlash = subPath.lastIndexOf('/');
  if (lastSlash > 0) ensureDir(new Directory(base, subPath.slice(0, lastSlash)));
}

function ensureParentForKey(key: string): void {
  ensureDir(DATA_DIR);
  if (key.startsWith('siphon:data:')) {
    ensureDir(TILES_DIR);
    ensureNestedDir(TILES_DIR, key.slice('siphon:data:'.length));
  } else if (key.startsWith('siphon:history:')) {
    ensureDir(HISTORY_DIR);
    ensureNestedDir(HISTORY_DIR, key.slice('siphon:history:'.length));
  } else if (key.startsWith('siphon:rate:')) {
    ensureDir(RATE_DIR);
  } else if (key.startsWith('siphon:route:')) {
    ensureDir(ROUTE_DIR);
    ensureNestedDir(ROUTE_DIR, key.slice('siphon:route:'.length));
  }
}

function listFilesRecursive(dir: Directory, prefix: string): string[] {
  ensureDir(dir);
  return dir.list().flatMap((item) => {
    if (item instanceof File) return prefix + item.name;
    if (item instanceof Directory) return listFilesRecursive(item, prefix + item.name + '/');
    return [];
  });
}

function tempFileFor(destination: File): File {
  const safeName = destination.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return new File(DATA_DIR, `.tmp-${safeName}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

async function writeFileAtomically(destination: File, value: string): Promise<void> {
  ensureDir(DATA_DIR);
  const temp = tempFileFor(destination);
  let moved = false;
  try {
    temp.create({ overwrite: true, intermediates: true });
    temp.write(value);
    await temp.move(destination, { overwrite: true });
    // File.move() updates the File instance's URI to the destination. Never
    // delete `temp` after this point or we'd delete the committed cache file.
    moved = true;
  } finally {
    if (!moved) {
      try {
        if (temp.exists) temp.delete();
      } catch {
        // Best-effort cleanup only.
      }
    }
  }
}

export const hybridStore: KeyValueStore = {
  async getItem(key: string): Promise<string | null> {
    if (!isFileKey(key)) return AsyncStorage.getItem(key);
    prepareFileStore();
    try {
      return await filePathForKey(key).text();
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!isFileKey(key)) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    prepareFileStore();
    ensureParentForKey(key);
    await writeFileAtomically(filePathForKey(key), value);
  },

  async listKeys(prefix: string): Promise<string[]> {
    prepareFileStore();
    if (prefix === 'siphon:data:') {
      try {
        return listFilesRecursive(TILES_DIR, 'siphon:data:');
      } catch {
        return [];
      }
    }
    if (prefix === 'siphon:history:') {
      try {
        return listFilesRecursive(HISTORY_DIR, 'siphon:history:');
      } catch {
        return [];
      }
    }
    if (prefix === 'siphon:route:') {
      try {
        return listFilesRecursive(ROUTE_DIR, 'siphon:route:');
      } catch {
        return [];
      }
    }
    return [];
  },

  async removeItem(key: string): Promise<void> {
    if (!isFileKey(key)) {
      await AsyncStorage.removeItem(key);
      return;
    }
    prepareFileStore();
    try {
      const file = filePathForKey(key);
      if (file.exists) file.delete();
    } catch {
      // Missing/corrupt cache entries are already equivalent to removed.
    }
  },
};
