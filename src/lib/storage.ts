import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Secure storage on iOS/Android (Keychain / Keystore). expo-secure-store has no
// web implementation, so the browser preview falls back to localStorage.
const web = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
  if (web) {
    try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (web) {
    try { globalThis.localStorage?.setItem(key, value); } catch { /* private mode */ }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (web) {
    try { globalThis.localStorage?.removeItem(key); } catch { /* ignore */ }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
