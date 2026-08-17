// =====================================================
// Expert Registration Requests CRUD
// =====================================================
import { isSupabaseConfigured, supaFetch } from "./supabase";
import { localGet, localSet, localListKeys, localRemove } from "./storage";

const STORAGE_PREFIX = "reg-request:";

export async function saveRegistrationRequest(request) {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch("expert_registration_requests", { method: "POST", body: JSON.stringify([request]) });
      return rows && rows[0] ? rows[0] : request;
    } catch (e) {
      console.error("Supabase save registration failed, falling back to localStorage:", e);
    }
  }
  localSet(`${STORAGE_PREFIX}${request.id}`, JSON.stringify(request));
  return request;
}

export async function getAllRegistrationRequests() {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch("expert_registration_requests?select=*&order=created_at.desc");
      return rows || [];
    } catch (e) {
      console.error("Supabase list registrations failed, falling back to localStorage:", e);
    }
  }
  const keys = localListKeys(STORAGE_PREFIX);
  const items = [];
  for (const k of keys) {
    const v = localGet(k);
    if (v) { try { items.push(JSON.parse(v)); } catch {} }
  }
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return items;
}

export async function getRegistrationRequestById(id) {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch(`expert_registration_requests?id=eq.${encodeURIComponent(id)}&select=*`);
      return rows && rows.length ? rows[0] : null;
    } catch (e) {
      console.error("Supabase get registration failed, falling back to localStorage:", e);
    }
  }
  const v = localGet(`${STORAGE_PREFIX}${id}`);
  try { return v ? JSON.parse(v) : null; }
  catch { return null; }
}

export async function updateRegistrationRequest(id, updates) {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch(
        `expert_registration_requests?id=eq.${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (rows && rows[0]) return rows[0];
    } catch (e) {
      console.error("Supabase update registration failed, falling back to localStorage:", e);
    }
  }
  const existing = await getRegistrationRequestById(id);
  const merged = { ...existing, ...updates };
  localSet(`${STORAGE_PREFIX}${id}`, JSON.stringify(merged));
  return merged;
}

export async function deleteRegistrationRequest(id) {
  if (isSupabaseConfigured()) {
    try {
      await supaFetch(`expert_registration_requests?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
      return true;
    } catch (e) {
      console.error("Supabase delete registration failed, falling back to localStorage:", e);
    }
  }
  localRemove(`${STORAGE_PREFIX}${id}`);
  return true;
}
