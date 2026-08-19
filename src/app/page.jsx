"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Search, ArrowLeft, Clock, CheckCircle, Users, Zap, Shield, FileText } from "lucide-react";
import { C_INK, C_INK_TEAL, C_PAPER, C_OCHRE, C_SUCCESS, C_CLAY, C_SAGE_LINE, hexToRgba } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Navbar } from "@/components/ui";
import { getAllBookings } from "@/lib/bookings";

function TimetableGlyph() {
  const cells = [1,0,1,1,0,0,1,0,1,1,1,1,1,0,1,0,0,1,1,0];
  return (
    <div className="grid grid-cols-5 gap-2 w-20 mx-auto mb-6" aria-hidden="true">
      {cells.map((filled, i) => (
        <div key={i} className="aspect-square rounded-lg"
             style={{ backgroundColor: filled ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.15)" }} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [stats, setStats] = useState({ total: 0, active: 0, done: 0 });

  useEffect(() => {
    async function loadStats() {
      try {
        const bookings = await getAllBookings();
        setStats({
          total: bookings.length,
          active: bookings.filter(b => b.status !== "ملغي" && b.status !== "مرفوض" && b.status !== "مكتمل").length,
          done: bookings.filter(b => b.status === "مكتمل").length,
        });
      } catch {}
    }
    loadStats();
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F6F0" }}>
      {/* Hero */}
      <div className="px-6 pt-8 pb-6 md:pt-10 md:pb-8 text-center relative overflow-hidden"
           style={{ background: "linear-gradient(135deg, #0F3D3E 0%, #0F3D3E 50%, #0F3D3E 100%)" }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)" }} />
        <TimetableGlyph />
        <h1 className="text-3xl md:text-3xl font-extrabold mb-2 relative" style={{ color: "#fff" }}>
        حجز الجداول الزمنية
        </h1>
        <p className="text-sm md:text-base opacity-85 max-w-lg mx-auto relative" style={{ color: "rgba(255,255,255,0.9)" }}>
          نظام إلكتروني لإنشاء وإدارة الجداول الزمنية للمؤسسات التعليمية
        </p>
      </div>

      {/* Live Stats */}
      {(stats.total > 0 || stats.active > 0) && (
        <div className="max-w-4xl mx-auto px-5 -mt-4 relative z-10">
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {[
              { label: "إجمالي الطلبات", value: stats.total, icon: FileText, color: "#0F3D3E" },
              { label: "نشطة حالياً", value: stats.active, icon: Clock, color: "#C68A2E" },
              { label: "مكتملة", value: stats.done, icon: CheckCircle, color: "#3F7859" },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl p-3 md:p-4 text-center"
                   style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid #DCE2D6` }}>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center mx-auto mb-1.5"
                     style={{ backgroundColor: hexToRgba(s.color, 0.1) }}>
                  <s.icon size={16} color={s.color} />
                </div>
                <p className="text-xl md:text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] md:text-xs font-semibold mt-0.5" style={{ color: "#8A9188" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="max-w-4xl mx-auto px-5 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push("/booking")}
            className="w-full flex items-center gap-4 p-5 rounded-2xl text-right transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{ backgroundColor: "white", border: `1px solid #DCE2D6`,
                     boxShadow: "0 4px 16px rgba(15,61,62,0.08)" }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: "#EDF2EE" }}>
              <Calendar size={26} color="#0F3D3E" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg" style={{ color: "#0F3D3E" }}>طلب جدول جديد</p>
              <p className="text-sm mt-0.5" style={{ color: "#8A9188" }}>
                أدخل بيانات مؤسستك وسيتم إنشاء جدولك في أقرب وقت
              </p>
            </div>
            <ArrowLeft size={20} color="#8A9188" className="flex-shrink-0 rotate-180" />
          </button>

          <button
            onClick={() => router.push("/track")}
            className="w-full flex items-center gap-4 p-5 rounded-2xl text-right transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{ backgroundColor: "white", border: `1px solid #DCE2D6`,
                     boxShadow: "0 4px 16px rgba(198,138,46,0.08)" }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: "#FAF0DB" }}>
              <Search size={26} color="#C68A2E" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg" style={{ color: "#0F3D3E" }}>تتبع طلبي</p>
              <p className="text-sm mt-0.5" style={{ color: "#8A9188" }}>
                أدخل رمز الطلب لمتابعة حالة جدولك ورؤية التحديثات
              </p>
            </div>
            <ArrowLeft size={20} color="#8A9188" className="flex-shrink-0 rotate-180" />
          </button>

          <button
            onClick={() => router.push("/fet-generator")}
            className="w-full flex items-center gap-4 p-5 rounded-2xl text-right transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{ backgroundColor: "white", border: `1px solid #DCE2D6`,
                     boxShadow: "0 4px 16px rgba(63,120,89,0.08)" }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: "#EDF7F2" }}>
              <Zap size={26} color="#3F7859" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg" style={{ color: "#0F3D3E" }}>التوليد الذكي (FET)</p>
              <p className="text-sm mt-0.5" style={{ color: "#8A9188" }}>
                توليد ومعالجة الجداول الزمنية باستخدام محرك FET المتطور
              </p>
            </div>
            <ArrowLeft size={20} color="#8A9188" className="flex-shrink-0 rotate-180" />
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-5 pb-8">
        <h2 className="text-base md:text-lg font-bold mb-5 text-center" style={{ color: "#0F3D3E" }}>لماذا تختار نظام جدول مدرسي؟</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {[
            { icon: Zap, title: "سرعة الإنجاز", desc: "إنشاء الجداول في دقائق" },
            { icon: Shield, title: "أمان البيانات", desc: "تخزين سحابي آمن" },
            { icon: Users, title: "خبراء متخصصون", desc: "فريق عمل مؤهل" },
            { icon: CheckCircle, title: "جودة عالية", desc: "نتائج دقيقة وموثوقة" },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 text-center"
                 style={{ border: `1px solid #DCE2D6`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                   style={{ backgroundColor: "#EDF2EE" }}>
                <f.icon size={20} color="#0F3D3E" />
              </div>
              <p className="text-base font-bold mb-0.5" style={{ color: "#0F3D3E" }}>{f.title}</p>
              <p className="text-xs" style={{ color: "#8A9188" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Developer Credit */}
      <div className="max-w-4xl mx-auto px-5 pb-6">
        <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: "white", border: "1px solid #DCE2D6", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <p className="text-xs mb-1" style={{ color: "#8A9188" }}>صنع بواسطة</p>
          <p className="text-sm font-bold" style={{ color: "#0F3D3E" }}>الأستاذ: حكيم بوزورداز</p>
          <a href="mailto:hbouzourdaz@gmail.com" className="text-xs font-semibold inline-block mt-1 px-3 py-1 rounded-full transition-colors hover:opacity-80"
             style={{ backgroundColor: "rgba(15,61,62,0.08)", color: "#0F3D3E" }}>
            hbouzourdaz@gmail.com
          </a>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-sm pb-24" style={{ color: "#8A9188" }}>
        للدخول للوحة الإدارة:{" "}
        <button onClick={() => router.push("/admin/login")} className="font-semibold underline"
                style={{ color: "#0F3D3E" }}>
          لوحة الأدمن
        </button>
        {" · "}
        <button onClick={() => router.push("/expert/login")} className="font-semibold underline"
                style={{ color: "#0F3D3E" }}>
          لوحة الخبير
        </button>
      </p>

      <Navbar />
    </div>
  );
}
