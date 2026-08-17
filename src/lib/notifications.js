// =====================================================
// Notifications CRUD Operations
// =====================================================
import { isSupabaseConfigured, supaFetch } from "./supabase";
import { localGet, localSet, localListKeys, localRemove } from "./storage";

const STORAGE_PREFIX = "notification:";

export async function saveNotification(notification) {
  const record = {
    id: notification.id || `NOTIF-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    title: notification.title,
    message: notification.message,
    type: notification.type || "info",
    target_role: notification.target_role || "admin",
    target_username: notification.target_username || null,
    read: false,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch("notifications", { method: "POST", body: JSON.stringify([record]) });
      return rows && rows[0] ? rows[0] : record;
    } catch (e) {
      console.warn("Supabase notifications not available, using localStorage:", e.message);
    }
  }
  localSet(`${STORAGE_PREFIX}${record.id}`, JSON.stringify(record));
  return record;
}

export async function getNotificationsForExpert(username) {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch(
        `notifications?target_role=eq.expert&target_username=eq.${encodeURIComponent(username)}&select=*&order=created_at.desc`
      );
      return rows || [];
    } catch (e) {
      console.warn("Supabase notifications not available, using localStorage:", e.message);
    }
  }
  const keys = localListKeys(STORAGE_PREFIX);
  const items = [];
  for (const k of keys) {
    const v = localGet(k);
    if (v) {
      try {
        const n = JSON.parse(v);
        if (n.target_role === "expert" && n.target_username === username) items.push(n);
      } catch {}
    }
  }
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return items;
}

export async function getNotificationsForAdmin() {
  if (isSupabaseConfigured()) {
    try {
      const rows = await supaFetch(
        `notifications?target_role=eq.admin&select=*&order=created_at.desc`
      );
      return rows || [];
    } catch (e) {
      console.warn("Supabase notifications not available, using localStorage:", e.message);
    }
  }
  const keys = localListKeys(STORAGE_PREFIX);
  const items = [];
  for (const k of keys) {
    const v = localGet(k);
    if (v) {
      try {
        const n = JSON.parse(v);
        if (n.target_role === "admin") items.push(n);
      } catch {}
    }
  }
  items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return items;
}

export async function markNotificationRead(id) {
  if (isSupabaseConfigured()) {
    try {
      await supaFetch(`notifications?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ read: true }),
      });
      return true;
    } catch (e) {
      console.warn("Supabase notifications not available, using localStorage:", e.message);
    }
  }
  const keys = localListKeys(STORAGE_PREFIX);
  for (const k of keys) {
    const v = localGet(k);
    if (v) {
      try {
        const n = JSON.parse(v);
        if (n.id === id) {
          n.read = true;
          localSet(k, JSON.stringify(n));
          break;
        }
      } catch {}
    }
  }
  return true;
}

export async function markAllReadForExpert(username) {
  const notifications = await getNotificationsForExpert(username);
  for (const n of notifications) {
    if (!n.read) await markNotificationRead(n.id);
  }
}

export async function markAllReadForAdmin() {
  const notifications = await getNotificationsForAdmin();
  for (const n of notifications) {
    if (!n.read) await markNotificationRead(n.id);
  }
}

export async function getUnreadCountForExpert(username) {
  const notifications = await getNotificationsForExpert(username);
  return notifications.filter((n) => !n.read).length;
}

export async function getUnreadCountForAdmin() {
  const notifications = await getNotificationsForAdmin();
  return notifications.filter((n) => !n.read).length;
}
