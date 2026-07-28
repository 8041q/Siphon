import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Directory, Paths } from 'expo-file-system';

import type { KeyValueStore } from '../api/siphonClient';

const DATA_DIR = new Directory(Paths.document, 'siphon');
const TILES_DIR = new Directory(DATA_DIR, 'tiles');
const SNAPSHOTS_DIR = new Directory(DATA_DIR, 'snapshots');

function ensureDir(dir: Directory): void {
  dir.create({ intermediates: true, idempotent: true });
}

function tileFilePath(key: string): File {
  const tilePath = key.slice('siphon:data:'.length);
  return new File(TILES_DIR, tilePath);
}

function snapshotFilePath(key: string): File {
  const date = key.slice('siphon:snapshot:'.length);
  return new File(SNAPSHOTS_DIR, date + '.json');
}

function isFileKey(key: string): boolean {
  return key.startsWith('siphon:data:') || key.startsWith('siphon:snapshot:');
}

function filePathForKey(key: string): File {
  if (key.startsWith('siphon:data:')) return tileFilePath(key);
  if (key.startsWith('siphon:snapshot:')) return snapshotFilePath(key);
  throw new Error('Unsupported key: ' + key);
}

export const hybridStore: KeyValueStore = {
  async getItem(key: string): Promise<string | null> {
    if (!isFileKey(key)) return AsyncStorage.getItem(key);
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
    ensureDir(DATA_DIR);
    if (key.startsWith('siphon:data:')) {
      ensureDir(TILES_DIR);
      const tilePath = key.slice('siphon:data:'.length);
      const lastSlash = tilePath.lastIndexOf('/');
      if (lastSlash > 0) {
        ensureDir(new Directory(TILES_DIR, tilePath.slice(0, lastSlash)));
      }
    }
    if (key.startsWith('siphon:snapshot:')) {
      ensureDir(SNAPSHOTS_DIR);
    }
    filePathForKey(key).write(value);
  },

  async listKeys(prefix: string): Promise<string[]> {
    if (prefix === 'siphon:snapshot:') {
      try {
        ensureDir(SNAPSHOTS_DIR);
        return SNAPSHOTS_DIR.list()
          .filter((item): item is File => item instanceof File && item.extension === '.json')
          .map(item => 'siphon:snapshot:' + item.name.replace(/\.json$/, ''));
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
    try { filePathForKey(key).delete(); } catch {}
  },
};
