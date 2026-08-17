// =====================================================
// Bookings CRUD Operations
// =====================================================
import { isSupabaseConfigured, supaFetch } from "./supabase";
import { localGet, localSet, localListKeys, localRemove } from "./storage";

export async function saveBooking(booking) {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch("bookings", { method: "POST", body: JSON.stringify([booking]) });
      return rows && rows[0] ? rows[0] : booking;
    } catch (e) {
      console.error("Supabase save failed, falling back to localStorage:", e);
    }
  }
  localSet(`booking:${booking.code}`, JSON.stringify(booking));
  return booking;
}

export async function getBookingByCode(code) {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch(`bookings?code=eq.${encodeURIComponent(code)}&select=*`);
      return rows && rows.length ? rows[0] : null;
    } catch (e) {
      console.error("Supabase get failed, falling back to localStorage:", e);
    }
  }
  const v = localGet(`booking:${code}`);
  try { return v ? JSON.parse(v) : null; }
  catch { return null; }
}

export async function getAllBookings() {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch("bookings?select=*&order=created_at.desc");
      return rows || [];
    } catch (e) {
      console.error("Supabase list failed, falling back to localStorage:", e);
    }
  }
  const keys = localListKeys("booking:");
  const items = [];
  for (const k of keys) {
    const v = localGet(k);
    if (v) { try { items.push(JSON.parse(v)); } catch {} }
  }
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return items;
}

export async function getBookingsByExpert(username) {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch(
        `bookings?expert_username=eq.${encodeURIComponent(username)}&select=*&order=created_at.desc`
      );
      return rows || [];
    } catch (e) {
      console.error("Supabase filtered list failed, falling back to localStorage:", e);
    }
  }
  const all = await getAllBookings();
  return all.filter((b) => b.expert_username === username);
}

export async function updateBookingByCode(code, updates) {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch(
        `bookings?code=eq.${encodeURIComponent(code)}`,
        { method: "PATCH", body: JSON.stringify(updates) }
      );
      if (rows && rows[0]) return rows[0];
    } catch (e) {
      console.error("Supabase update failed, falling back to localStorage:", e);
    }
  }
  const existing = await getBookingByCode(code);
  const merged = { ...existing, ...updates };
  localSet(`booking:${code}`, JSON.stringify(merged));
  return merged;
}

export async function deleteBooking(code) {
  if (isSupabaseConfigured()) {
    try {
      await supaFetch(`bookings?code=eq.${encodeURIComponent(code)}`, { method: "DELETE" });
      return true;
    } catch (e) {
      console.error("Supabase delete failed, falling back to localStorage:", e);
    }
  }
  localRemove(`booking:${code}`);
  return true;
}
