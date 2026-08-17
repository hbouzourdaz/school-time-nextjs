// =====================================================
// Experts CRUD Operations
// =====================================================
import { isSupabaseConfigured, supaFetch } from "./supabase";
import { localGet, localSet, localListKeys, localRemove } from "./storage";

export async function saveExpert(expert) {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch("experts", { method: "POST", body: JSON.stringify([expert]) });
      return rows && rows[0] ? rows[0] : expert;
    } catch (e) {
      console.error("Supabase save expert failed, falling back to localStorage:", e);
    }
  }
  localSet(`expert-account:${expert.username}`, JSON.stringify(expert));
  return expert;
}

export async function getExpertByUsername(username) {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch(`experts?username=eq.${encodeURIComponent(username)}&select=*`);
      return rows && rows.length ? rows[0] : null;
    } catch (e) {
      console.error("Supabase get expert failed, falling back to localStorage:", e);
    }
  }
  const v = localGet(`expert-account:${username}`);
  try { return v ? JSON.parse(v) : null; }
  catch { return null; }
}

export async function getAllExperts() {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch("experts?select=*&order=created_at.desc");
      return rows || [];
    } catch (e) {
      console.error("Supabase list experts failed, falling back to localStorage:", e);
    }
  }
  const keys = localListKeys("expert-account:");
  const items = [];
  for (const k of keys) {
    const v = localGet(k);
    if (v) { try { items.push(JSON.parse(v)); } catch {} }
  }
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return items;
}

export async function updateExpert(username, updates) {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch(
        `experts?username=eq.${encodeURIComponent(username)}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (rows && rows[0]) return rows[0];
    } catch (e) {
      console.error("Supabase update expert failed, falling back to localStorage:", e);
    }
  }
  const existing = await getExpertByUsername(username);
  const merged = { ...existing, ...updates };
  localSet(`expert-account:${username}`, JSON.stringify(merged));
  return merged;
}

export async function deleteExpert(username) {
  if (isSupabaseConfigured()) {
    try {
      await supaFetch(`experts?username=eq.${encodeURIComponent(username)}`, { method: "DELETE" });
      return true;
    } catch (e) {
      console.error("Supabase delete expert failed, falling back to localStorage:", e);
    }
  }
  localRemove(`expert-account:${username}`);
  return true;
}
