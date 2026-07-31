import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Directory, Paths } from 'expo-file-system';

import type { KeyValueStore } from '../api/siphonClient';

const DATA_DIR = new Directory(Paths.document, 'siphon');
const TILES_DIR = new Directory(DATA_DIR, 'tiles');
const HISTORY_DIR = new Directory(DATA_DIR, 'history');

function ensureDir(dir: Directory): void {
  dir.create({ intermediates: true, idempotent: true });
}

function assertSafeRelative(relative: string): void {
  if (relative.startsWith('/')) {
    throw new Error('Unsafe key path (absolute): ' + relative);
  }
  if (relative.split('/').includes('..')) {
    throw new Error('Unsafe key path (.. traversal): ' + relative);
  }
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

function isFileKey(key: string): boolean {
  return key.startsWith('siphon:data:') || key.startsWith('siphon:history:');
}

function filePathForKey(key: string): File {
  if (key.startsWith('siphon:data:')) return tileFilePath(key);
  if (key.startsWith('siphon:history:')) return historyFilePath(key);
  throw new Error('Unsupported key: ' + key);
}

function ensureNestedDir(base: Directory, subPath: string): void {
  const lastSlash = subPath.lastIndexOf('/');
  if (lastSlash > 0) {
    ensureDir(new Directory(base, subPath.slice(0, lastSlash)));
  }
}

function listFilesRecursive(dir: Directory, prefix: string): string[] {
  ensureDir(dir);
  return dir.list().flatMap((item) => {
    if (item instanceof File) {
      return prefix + item.name;
    }
    if (item instanceof Directory) {
      return listFilesRecursive(item, prefix + item.name + '/');
    }
    return [];
  });
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
      ensureNestedDir(TILES_DIR, key.slice('siphon:data:'.length));
    }
    if (key.startsWith('siphon:history:')) {
      ensureDir(HISTORY_DIR);
      ensureNestedDir(HISTORY_DIR, key.slice('siphon:history:'.length));
    }
    filePathForKey(key).write(value);
  },

  async listKeys(prefix: string): Promise<string[]> {
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
