// =====================================================
// Supabase Client
// =====================================================
import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  || "";
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export function isSupabaseConfigured() {
  return !!(supabaseUrl && supabaseKey &&
    supabaseUrl !== "https://xxxxx.supabase.co");
}

// Raw fetch helper (for custom queries)
export async function supaFetch(path, options = {}) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: options.method || "GET",
    body: options.body,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function uploadToSupabaseStorage(file, pathPrefix) {
  const bucket = "booking-documents";
  const safeName = file.name.replace(/\s+/g, "_");
  const path = `${pathPrefix}/${Date.now()}_${safeName}`;

  if (supabase) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (!error) {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      return urlData.publicUrl;
    }
    console.warn("Supabase storage upload failed, falling back to base64:", error.message);
  }

  const reader = new FileReader();
  return new Promise((res, rej) => {
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

export async function testSupabaseConnection(url, key) {
  try {
    const client = createClient(url, key);
    const { error } = await client.from("bookings").select("id").limit(1);
    if (!error) return { ok: true };
    const msg = (error.message || "").toLowerCase();
    if (error.code === "42P01" || error.code === "PGRST205" || msg.includes("does not exist") || msg.includes("relation") || msg.includes("schema cache") || error.status === 404)
      return { ok: true, message: "تم الاتصال بنجاح (الجداول غير موجودة بعد، ستم إنشاؤها تلقائيًا)" };
    return { ok: false, message: `فشل الاختبار: ${error.message}` };
  } catch (e) {
    return { ok: false, message: "تعذر الوصول إلى الخادم، تحقق من صحة الرابط والاتصال بالإنترنت" };
  }
}
