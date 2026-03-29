export async function register() {
  if (typeof localStorage !== 'undefined' && typeof localStorage.getItem !== 'function') {
    // Node.js v25+ exposes a broken localStorage when --localstorage-file is not configured.
    // Supabase JS detects localStorage exists and tries to use it, causing crashes.
    // Provide a no-op in-memory shim so the library falls back gracefully.
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, String(value)),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        get length() { return store.size; },
        key: (index: number) => [...store.keys()][index] ?? null,
      },
      writable: true,
      configurable: true,
    });
  }
}
