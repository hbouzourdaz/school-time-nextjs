"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ArrowRight, Clock, CheckCircle, XCircle, Loader, Copy, Check, Key,
} from "lucide-react";
import {
  C_INK, C_INK_TEAL, C_PAPER, C_CLAY, C_SAGE_LINE, C_SUCCESS, C_OCHRE,
  hexToRgba, formatDate, REG_STATUS_PENDING, REG_STATUS_APPROVED, REG_STATUS_REJECTED,
} from "@/lib/utils";
import { getRegistrationRequestById } from "@/lib/registrations";
import { TextInput, PrimaryButton, SummaryRow, useToast } from "@/components/ui";

export default function TrackRegistrationPage() {
  const router = useRouter();
  const toast = useToast();
  const [trackingId, setTrackingId] = useState("");
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    const id = trackingId.trim();
    if (!id) { setError("أدخل رقم تتبع الطلب"); return; }
    setLoading(true); setError(""); setRequest(null);
    try {
      const req = await getRegistrationRequestById(id);
      if (!req) setError("لم يُعثر طلب بهذا الرقم");
      else setRequest(req);
    } catch {
      setError("حدث خطأ، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: C_PAPER }}>
      <div className="max-w-md mx-auto px-5 pt-8 pb-16">
        <button onClick={() => router.push("/expert/login")} className="flex items-center gap-2 text-sm mb-6"
                style={{ color: "#8A9188" }}>
          <ArrowRight size={16} /> تسجيل الدخول
        </button>

        <h1 className="text-xl font-extrabold mb-1" style={{ color: C_INK }}>تتبع طلب التسجيل</h1>
        <p className="text-base mb-6" style={{ color: "#8A9188" }}>أدخل رقم الطلب الذي حصلت عليه عند التسجيل</p>

        <div className="flex gap-2 mb-6">
          <TextInput
            value={trackingId}
            onChange={e => setTrackingId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="REG-1234567890-1234"
            dir="ltr"
            className="text-center font-mono uppercase flex-1"
          />
          <PrimaryButton onClick={handleSearch} disabled={loading} loading={loading} className="px-5 py-3">
            <Search size={18} />
          </PrimaryButton>
        </div>

        {error && (
          <div className="rounded-xl p-3 mb-4 text-sm flex items-center gap-2"
               style={{ backgroundColor: hexToRgba(C_CLAY, 0.12), color: C_CLAY }}>
            <XCircle size={16} /> {error}
          </div>
        )}

        {request && <RegistrationResult request={request} />}
      </div>
    </div>
  );
}

function RegistrationResult({ request }) {
  const [copied, setCopied] = useState(null);

  function copy(text, field) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  }

  const statusConfig = {
    [REG_STATUS_PENDING]: {
      icon: Clock, color: C_OCHRE,
      label: "قيد المراجعة",
      description: "طلبك قيد مراجعة من طرف الإدارة. يُرجى الانتظار.",
    },
    [REG_STATUS_APPROVED]: {
      icon: CheckCircle, color: C_SUCCESS,
      label: "تم القبول",
      description: "تم قبول طلبك! يمكنك تسجيل الدخول بالبيانات أدناه.",
    },
    [REG_STATUS_REJECTED]: {
      icon: XCircle, color: C_CLAY,
      label: "تم الرفض",
      description: "تم رفض طلب التسجيل.",
    },
  };

  const cfg = statusConfig[request.status] || statusConfig[REG_STATUS_PENDING];
  const StatusIcon = cfg.icon;

  return (
    <div className="bg-white rounded-2xl p-5 animate-fadeIn" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
             style={{ backgroundColor: hexToRgba(cfg.color, 0.12) }}>
          <StatusIcon size={24} color={cfg.color} />
        </div>
        <div>
          <p className="font-extrabold" style={{ color: cfg.color }}>{cfg.label}</p>
          <p className="text-xs" style={{ color: "#8A9188" }}>{cfg.description}</p>
        </div>
      </div>

      <div className="space-y-0.5 mb-4">
        <SummaryRow label="الاسم" value={request.name} />
        <SummaryRow label="تاريخ الطلب" value={formatDate(request.created_at)} />
        {request.updated_at !== request.created_at && (
          <SummaryRow label="آخر تحديث" value={formatDate(request.updated_at)} />
        )}
      </div>

      {request.status === REG_STATUS_APPROVED && (
        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: hexToRgba(C_SUCCESS, 0.08), border: `1px solid ${hexToRgba(C_SUCCESS, 0.2)}` }}>
          <div className="flex items-center gap-2 mb-3" style={{ color: C_SUCCESS }}>
            <Key size={16} />
            <span className="font-bold text-base">بيانات حسابك</span>
          </div>
          <p className="text-base mb-3" style={{ color: "#8A9188" }}>استخدم هذه البيانات لتسجيل الدخول:</p>

          <div className="flex items-center justify-between rounded-lg px-3 py-2 mb-2"
               style={{ backgroundColor: "#F5F6F0" }}>
            <div>
              <p className="text-xs" style={{ color: "#8A9188" }}>اسم المستخدم</p>
              <p className="font-mono font-bold text-base" style={{ color: C_INK }} dir="ltr">{request.username}</p>
            </div>
            <button onClick={() => copy(request.username, "username")} style={{ color: C_INK_TEAL }}>
              {copied === "username" ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg px-3 py-2"
               style={{ backgroundColor: "#F5F6F0" }}>
            <div>
              <p className="text-xs" style={{ color: "#8A9188" }}>كلمة المرور</p>
              <p className="font-mono font-bold text-base" style={{ color: C_INK }} dir="ltr">{request.password}</p>
            </div>
            <button onClick={() => copy(request.password, "password")} style={{ color: C_INK_TEAL }}>
              {copied === "password" ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>

          <PrimaryButton onClick={() => window.location.href = "/expert/login"}
                         className="w-full py-2.5 mt-3 text-sm">
            تسجيل الدخول الآن
          </PrimaryButton>
        </div>
      )}

      {request.status === REG_STATUS_REJECTED && request.rejection_reason && (
        <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: hexToRgba(C_CLAY, 0.1), border: `1px solid ${hexToRgba(C_CLAY, 0.3)}` }}>
          <p className="text-xs font-bold mb-1" style={{ color: C_CLAY }}>سبب الرفض:</p>
          <p className="text-xs" style={{ color: "#8A9188" }}>{request.rejection_reason}</p>
        </div>
      )}

      {request.status === REG_STATUS_PENDING && (
        <div className="rounded-xl p-3" style={{ backgroundColor: hexToRgba(C_OCHRE, 0.08), border: `1px solid ${hexToRgba(C_OCHRE, 0.2)}` }}>
          <p className="text-xs" style={{ color: "#8A9188" }}>
            <Clock size={12} className="inline ml-1" />
            ستتم مراجعة طلبك قريباً. يمكنك إعادة المحاولة لاحقاً.
          </p>
        </div>
      )}
    </div>
  );
}
