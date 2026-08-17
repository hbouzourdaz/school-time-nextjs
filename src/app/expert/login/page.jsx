"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle, User } from "lucide-react";
import { TextInput, PrimaryButton, Field, useToast } from "@/components/ui";
import { getExpertByUsername } from "@/lib/experts";

export default function ExpertLoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [pwd, setPwd]           = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin() {
    const uname = username.trim().toLowerCase();
    const pass  = pwd.trim();
    if (!uname || !pass) { setError("أدخل اسم المستخدم وكلمة المرور"); return; }
    setLoading(true); setError("");
    try {
      const exp = await getExpertByUsername(uname);
      if (!exp || exp.password !== pass || exp.active === false) {
        setError("بيانات الدخول غير صحيحة أو الحساب معطَّل");
      } else {
        sessionStorage.setItem("expertAuth", JSON.stringify({ username: exp.username, name: exp.name }));
        toast.add("مرحباً بك، " + exp.name, "success");
        router.push("/expert/dashboard");
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
            <User size={28} color="#0F3D3E" />
          </div>
          <h1 className="text-2xl font-extrabold text-center mb-2" style={{ color: "#0F3D3E" }}>لوحة الخبير</h1>
          <p className="text-base text-center mb-8" style={{ color: "#8A9188" }}>أدخل بيانات حسابك للدخول</p>

          <Field label="اسم المستخدم">
            <TextInput value={username} onChange={e=>setUsername(e.target.value)} placeholder="m_amine" dir="ltr" />
          </Field>
          <Field label="كلمة المرور">
            <TextInput type="password" value={pwd} onChange={e=>setPwd(e.target.value)}
                       onKeyDown={e => e.key==="Enter" && handleLogin()} placeholder="••••••••" dir="ltr" />
          </Field>

          {error && (
            <div className="flex items-center gap-2 text-sm rounded-xl p-3 mb-4"
                 style={{ backgroundColor: "#F2DEDE", color: "#B5533C" }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <PrimaryButton onClick={handleLogin} disabled={loading} loading={loading} className="w-full py-4">
            دخول
          </PrimaryButton>
        </div>

        <div className="text-center mt-6 space-y-3">
          <p className="text-base" style={{ color: "#8A9188" }}>
            ليس لديك حساب؟{" "}
            <button onClick={() => router.push("/expert/register")} className="font-bold btn-interactive"
                    style={{ color: "#0F3D3E" }}>
              سجّل كخبير
            </button>
          </p>
          <p className="text-base" style={{ color: "#8A9188" }}>
            لديك طلب تسجيل؟{" "}
            <button onClick={() => router.push("/expert/track-registration")} className="font-bold btn-interactive"
                    style={{ color: "#C68A2E" }}>
              تتبع طلب التسجيل
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
