// Small utility to safely use Web Storage in embedded/iframe contexts.
// Some browsers block storage access in third-party iframes, which can crash the app.

type StorageKey = string;

type StorageValue = string;

export function safeGetItem(key: StorageKey): StorageValue | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: StorageKey, value: StorageValue): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function safeRemoveItem(key: StorageKey): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function canUseLocalStorage(): boolean {
  try {
    const k = '__storage_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}
