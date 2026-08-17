// =====================================================
// localStorage Helper (Fallback when Supabase not configured)
// =====================================================

export function localGet(key) {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

export function localSet(key, value) {
  try { localStorage.setItem(key, value); return true; }
  catch { return false; }
}

export function localListKeys(prefix) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    return keys;
  } catch { return []; }
}

export function localRemove(key) {
  try { localStorage.removeItem(key); return true; }
  catch { return false; }
}
