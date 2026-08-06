import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Thin JSON wrapper around AsyncStorage. This is the only file that talks to
 * the persistence layer directly — when Supabase is wired in later, the
 * repository in `localRepository.ts` gets swapped for a Supabase-backed one
 * and everything above it (context, screens) stays the same.
 */
const PREFIX = 'familyquest:';

export async function readJSON<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export async function removeKeys(keys: string[]): Promise<void> {
  await AsyncStorage.multiRemove(keys.map((k) => PREFIX + k));
}

export const StorageKeys = {
  family: 'family',
  members: 'members',
  routines: 'routines',
  tasks: 'tasks',
  completions: 'completions',
  currentMemberId: 'currentMemberId',
} as const;
