"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, Home, Search } from "lucide-react";
import { getBookingByCode } from "@/lib/bookings";
import { formatDZD, formatDate } from "@/lib/utils";

export default function ConfirmedPage() {
  const router = useRouter();
  const [info, setInfo] = useState(null);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("lastBooking");
    if (!raw) { router.replace("/"); return; }
    try {
      const { code, pin } = JSON.parse(raw);
      setInfo({ code, pin });
      (async () => {
        try {
          const booking = await getBookingByCode(code);
          if (booking) setInfo((prev) => ({ ...prev, record: booking }));
        } catch {}
      })();
    } catch {
      router.replace("/");
    }
  }, [router]);

  function copy(text, label) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  }

  if (!info) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F5F6F0" }}>
      <p style={{ color: "#8A9188" }}>جاري التحميل...</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F6F0" }}>
      <div className="max-w-md mx-auto px-5 pt-14 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
             style={{ backgroundColor: "rgba(63,120,89,0.12)" }}>
          <CheckCircle2 color="#3F7859" size={40} />
        </div>
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: "#0F3D3E" }}>تم تأكيد حجزك بنجاح</h1>
        <p className="text-base mb-8" style={{ color: "#8A9188" }}>
          احتفظ بالمعلومات التالية وأرسلها للمؤسسة الحاملة لحجزك واطمن على وصولها
        </p>

        <div className="bg-white rounded-2xl p-6 mb-5 text-right"
             style={{ border: `1px solid #DCE2D6`, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-base" style={{ color: "#8A9188" }}>كود الحجز</p>
              <p className="font-bold text-xl tracking-wide" style={{ color: "#0F3D3E" }}>{info.code}</p>
            </div>
            <button onClick={() => copy(info.code, "code")} className="p-2.5 rounded-xl transition-all"
                    style={{ backgroundColor: "rgba(15,61,62,0.1)", color: "#0F3D3E" }}>
              <Copy size={18} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base" style={{ color: "#8A9188" }}>الرقم السري</p>
              <p className="font-bold text-xl tracking-wide" style={{ color: "#0F3D3E" }}>{info.pin}</p>
            </div>
            <button onClick={() => copy(info.pin, "pin")} className="p-2.5 rounded-xl transition-all"
                    style={{ backgroundColor: "rgba(15,61,62,0.1)", color: "#0F3D3E" }}>
              <Copy size={18} />
            </button>
          </div>
          {copied && (
            <p className="text-base text-center mt-3" style={{ color: "#3F7859" }}>تم النسخ!</p>
          )}
        </div>

        {info.record && (
          <div className="bg-white rounded-2xl p-6 mb-5 text-right"
               style={{ border: `1px solid #DCE2D6`, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
            <div className="space-y-1">
              <Row label="المؤسسة" value={info.record.institution_name} />
              <Row label="المستوى" value={info.record.level} />
              <Row label="الولاية" value={info.record.wilaya} />
              <Row label="عدد الأقسام" value={info.record.total_sections} />
              <Row label="التكلفة" value={formatDZD(info.record.total_price)} />
              <Row label="تاريخ الإنشاء" value={formatDate(info.record.created_at)} />
            </div>
          </div>
        )}

        <div className="space-y-3 mt-6 pb-10">
          <button onClick={() => { sessionStorage.removeItem("lastBooking"); router.push("/track"); }}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base transition-all"
                  style={{ backgroundColor: "#0F3D3E", color: "#fff" }}>
            <Search size={18} /> تتبع الحجز
          </button>
          <button onClick={() => { sessionStorage.removeItem("lastBooking"); router.push("/"); }}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold border-2 text-base"
                  style={{ borderColor: "#DCE2D6", color: "#0F3D3E" }}>
            <Home size={18} /> الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b py-2.5 gap-3" style={{ borderColor: "#EDEFE9" }}>
      <span className="text-base flex-shrink-0" style={{ color: "#8A9188" }}>{label}</span>
      <span className="font-semibold text-base text-left" style={{ color: "#0F3D3E" }}>{value || "—"}</span>
    </div>
  );
}
