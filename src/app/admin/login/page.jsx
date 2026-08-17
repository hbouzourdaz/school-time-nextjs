"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, AlertCircle } from "lucide-react";
import { TextInput, PrimaryButton, Field } from "@/components/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!pwd.trim()) { setError("أدخل كلمة المرور"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem("adminAuth", "1");
        router.push("/admin/dashboard");
      } else {
        setError("كلمة المرور غير صحيحة");
      }
    } catch {
      setError("حدث خطأ، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "#F5F6F0" }}>
      <div className="w-full max-w-sm">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 text-sm mb-8"
                style={{ color: "#8A9188" }}>
          <ArrowRight size={16} /> الرئيسية
        </button>

        <div className="bg-white rounded-3xl p-8" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: `1px solid #DCE2D6` }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
               style={{ backgroundColor: "#EDF2EE" }}>
            <Lock size={28} color="#0F3D3E" />
          </div>
          <h1 className="text-2xl font-extrabold text-center mb-2" style={{ color: "#0F3D3E" }}>لوحة الأدمن</h1>
          <p className="text-base text-center mb-8" style={{ color: "#8A9188" }}>أدخل كلمة مرور المدير للدخول</p>

          <Field label="كلمة المرور">
            <TextInput
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              dir="ltr"
            />
          </Field>

          {error && (
            <div className="flex items-center gap-2 text-sm rounded-xl p-3 mb-4"
                 style={{ backgroundColor: "#F2DEDE", color: "#B5533C" }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <PrimaryButton onClick={handleLogin} disabled={loading} className="w-full py-4">
            {loading ? "جارٍ التحقق..." : "دخول"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
