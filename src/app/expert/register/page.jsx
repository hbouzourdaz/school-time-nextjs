"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, UserPlus, Upload, Check, AlertCircle, Wallet, CreditCard, Copy,
} from "lucide-react";
import {
  C_INK, C_INK_TEAL, C_PAPER, C_CLAY, C_SAGE_LINE, C_SUCCESS, C_OCHRE,
  hexToRgba, EXPERT_REGISTRATION_FEE, formatDZD,
  PAYMENT_METHOD_CCP, PAYMENT_METHOD_BARIDIMOB, PAYMENT_METHOD_LABELS,
  getAdminPaymentInfo,
} from "@/lib/utils";
import { saveRegistrationRequest } from "@/lib/registrations";
import { isSupabaseConfigured, uploadToSupabaseStorage } from "@/lib/supabase";
import {
  TextInput, PrimaryButton, Field, StatusBadge, useToast,
} from "@/components/ui";

export default function ExpertRegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [ccpNumber, setCcpNumber] = useState("");
  const [baridimobNumber, setBaridimobNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentFile, setPaymentFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [errors, setErrors] = useState({});
  const adminPayment = getAdminPaymentInfo();

  function validateStep1() {
    const errs = {};
    if (!name.trim()) errs.name = "أدخل الاسم الكامل";
    if (!username.trim()) errs.username = "أدخل اسم المستخدم";
    if (username.length < 3) errs.username = "اسم المستخدم 3 أحرف على الأقل";
    if (!email.trim() || !email.includes("@")) errs.email = "أدخل بريداً صالحاً";
    if (!phone.trim()) errs.phone = "أدخل رقم الهاتف";
    if (!password.trim() || password.length < 6) errs.password = "كلمة المرور 6 أحرف على الأقل";
    if (!ccpNumber.trim() && !baridimobNumber.trim()) errs.payment = "أدخل رقم CCP أو BaridiMob";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (validateStep1()) setStep(2);
  }

  async function handleSubmit() {
    if (!paymentMethod) { setErrors({ method: "اختر طريق الدفع" }); return; }
    if (!paymentFile) { setErrors({ file: "إرفق إثبات الدفع" }); return; }
    setErrors({});
    setSubmitting(true);
    try {
      const proofUrl = await uploadToSupabaseStorage(paymentFile, "registration-proofs");
      const request = {
        id: `REG-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        name: name.trim(),
        username: username.trim().toLowerCase().replace(/\s+/g, "_"),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        ccp_number: ccpNumber.trim(),
        baridimob_number: baridimobNumber.trim(),
        payment_method: paymentMethod,
        payment_proof_url: proofUrl,
        payment_proof_name: paymentFile.name,
        registration_fee: EXPERT_REGISTRATION_FEE,
        status: "قيد المراجعة",
        rejection_reason: null,
        admin_note: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await saveRegistrationRequest(request);
      setTrackingId(request.id);
      setSubmitted(true);
      toast.add("تم إرسال طلب التسجيل بنجاح", "success");
    } catch {
      toast.add("فشل إرسال الطلب، حاول مجدداً", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: C_PAPER }}>
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
               style={{ backgroundColor: hexToRgba(C_SUCCESS, 0.12) }}>
            <Check size={32} color={C_SUCCESS} />
          </div>
          <h2 className="font-extrabold text-lg mb-2" style={{ color: C_INK }}>تم إرسال طلبك بنجاح!</h2>
          <p className="text-base mb-4" style={{ color: "#8A9188" }}>
            ستتم مراجعة طلبك من طرف الإدارة. احتفظ برقم التتبع لتتبع الحالة.
          </p>

          <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: hexToRgba(C_INK_TEAL, 0.08), border: `1px solid ${hexToRgba(C_INK_TEAL, 0.2)}` }}>
            <p className="text-base mb-1" style={{ color: "#8A9188" }}>رقم تتبع طلب التسجيل</p>
            <p className="text-lg font-extrabold font-mono" style={{ color: C_INK_TEAL }}>{trackingId}</p>
          </div>

          <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: hexToRgba(C_OCHRE, 0.1), border: `1px solid ${hexToRgba(C_OCHRE, 0.25)}` }}>
            <p className="text-xs font-semibold" style={{ color: C_OCHRE }}>
              اسم المستخدم المطلوب: <span className="font-mono">{username}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <PrimaryButton onClick={() => router.push("/expert/login")} className="flex-1 py-3">
              تسجيل الدخول
            </PrimaryButton>
            <button onClick={() => router.push("/expert/track-registration")}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm border-2 btn-interactive"
                    style={{ borderColor: C_INK_TEAL, color: C_INK_TEAL }}>
              تتبع الطلب
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: C_PAPER }}>
      <div className="max-w-md mx-auto px-5 pt-8 pb-16">
        <button onClick={() => router.push("/expert/login")} className="flex items-center gap-2 text-sm mb-6"
                style={{ color: "#8A9188" }}>
          <ArrowRight size={16} /> تسجيل الدخول
        </button>

        <h1 className="text-xl font-extrabold mb-1" style={{ color: C_INK }}>طلب تسجيل خبير</h1>
        <p className="text-base mb-6" style={{ color: "#8A9188" }}>أمثلة البيانات أدناه لطلب التسجيل كخبير</p>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: step >= 1 ? C_INK_TEAL : C_SAGE_LINE }} />
          <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: step >= 2 ? C_INK_TEAL : C_SAGE_LINE }} />
        </div>

        {step === 1 && (
          <div className="animate-fadeIn">
            <div className="bg-white rounded-2xl p-5 mb-4" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
              <div className="flex items-center gap-2 mb-4">
                <UserPlus size={18} color={C_INK_TEAL} />
                <h2 className="font-bold text-base" style={{ color: C_INK }}>المعلومات الشخصية</h2>
              </div>

              <Field label="الاسم الكامل">
                <TextInput value={name} onChange={e => setName(e.target.value)} placeholder="محمد الأمين" />
                {errors.name && <p className="text-xs mt-1" style={{ color: C_CLAY }}>{errors.name}</p>}
              </Field>

              <Field label="اسم المستخدم">
                <TextInput value={username} onChange={e => setUsername(e.target.value)} placeholder="m_amine" dir="ltr" />
                {errors.username && <p className="text-xs mt-1" style={{ color: C_CLAY }}>{errors.username}</p>}
              </Field>

              <Field label="البريد الإلكتروني">
                <TextInput value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" dir="ltr" type="email" />
                {errors.email && <p className="text-xs mt-1" style={{ color: C_CLAY }}>{errors.email}</p>}
              </Field>

              <Field label="رقم الهاتف">
                <TextInput value={phone} onChange={e => setPhone(e.target.value)} placeholder="0555123456" dir="ltr" type="tel" />
                {errors.phone && <p className="text-xs mt-1" style={{ color: C_CLAY }}>{errors.phone}</p>}
              </Field>

              <Field label="كلمة المرور">
                <TextInput value={password} onChange={e => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" dir="ltr" type="password" />
                {errors.password && <p className="text-xs mt-1" style={{ color: C_CLAY }}>{errors.password}</p>}
              </Field>
            </div>

            <div className="bg-white rounded-2xl p-5 mb-4" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
              <div className="flex items-center gap-2 mb-4">
                <Wallet size={18} color={C_INK_TEAL} />
                <h2 className="font-bold text-base" style={{ color: C_INK }}>معلومات الدفع</h2>
              </div>
              <p className="text-base mb-4" style={{ color: "#8A9188" }}>
                أدخل رقم حسابك المالي لتتمكّن من الزبون من الدفع لكم.
              </p>

              <Field label="رقم حساب CCP">
                <TextInput value={ccpNumber} onChange={e => setCcpNumber(e.target.value)} placeholder="مثال: CLE 123456789" dir="ltr" />
              </Field>

              <Field label="رقم بريد موب (BaridiMob)">
                <TextInput value={baridimobNumber} onChange={e => setBaridimobNumber(e.target.value)} placeholder="مثال: 0777123456" dir="ltr" />
              </Field>

              {errors.payment && <p className="text-xs mt-1" style={{ color: C_CLAY }}>{errors.payment}</p>}
            </div>

            <PrimaryButton onClick={handleNext} className="w-full py-3">
              التالي
            </PrimaryButton>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fadeIn">
            <div className="bg-white rounded-2xl p-5 mb-4" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={18} color={C_OCHRE} />
                <h2 className="font-bold text-base" style={{ color: C_INK }}>رسوم التسجيل</h2>
              </div>

              <div className="rounded-xl p-4 mb-4 text-center"
                   style={{ backgroundColor: hexToRgba(C_OCHRE, 0.08), border: `1px solid ${hexToRgba(C_OCHRE, 0.2)}` }}>
                <p className="text-base mb-1" style={{ color: "#8A9188" }}>مبلغ رسوم التسجيل</p>
                <p className="text-2xl font-extrabold font-mono" style={{ color: C_OCHRE }}>{formatDZD(EXPERT_REGISTRATION_FEE)}</p>
              </div>

              <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: "#F5F6F0" }}>
                <p className="text-xs font-bold mb-2" style={{ color: C_INK }}>أرقام حسابات الإدارة للدفع:</p>
                {adminPayment.ccp_number && (
                  <div className="flex items-center justify-between rounded-lg px-3 py-2 mb-2"
                       style={{ backgroundColor: "#fff", border: `1px solid ${hexToRgba(C_SAGE_LINE, 0.6)}` }}>
                    <div>
                      <p className="text-[10px]" style={{ color: "#8A9188" }}>CCP {adminPayment.ccp_name && `(${adminPayment.ccp_name})`}</p>
                      <p className="font-mono font-bold text-base" style={{ color: C_INK }} dir="ltr">{adminPayment.ccp_number}</p>
                    </div>
                    <button type="button" onClick={() => { navigator.clipboard?.writeText(adminPayment.ccp_number); toast.add("تم النسخ", "success"); }}
                            className="p-1.5 rounded-lg btn-interactive"
                            style={{ backgroundColor: hexToRgba(C_INK_TEAL, 0.1), color: C_INK_TEAL }}>
                      <Copy size={14} />
                    </button>
                  </div>
                )}
                {adminPayment.baridimob_number && (
                  <div className="flex items-center justify-between rounded-lg px-3 py-2"
                       style={{ backgroundColor: "#fff", border: `1px solid ${hexToRgba(C_SAGE_LINE, 0.6)}` }}>
                    <div>
                      <p className="text-[10px]" style={{ color: "#8A9188" }}>BaridiMob {adminPayment.baridimob_name && `(${adminPayment.baridimob_name})`}</p>
                      <p className="font-mono font-bold text-base" style={{ color: C_INK }} dir="ltr">{adminPayment.baridimob_number}</p>
                    </div>
                    <button type="button" onClick={() => { navigator.clipboard?.writeText(adminPayment.baridimob_number); toast.add("تم النسخ", "success"); }}
                            className="p-1.5 rounded-lg btn-interactive"
                            style={{ backgroundColor: hexToRgba(C_INK_TEAL, 0.1), color: C_INK_TEAL }}>
                      <Copy size={14} />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs font-bold mb-2" style={{ color: C_INK }}>اختر طريق الدفع</p>
              <div className="flex gap-2 mb-4">
                {[PAYMENT_METHOD_CCP, PAYMENT_METHOD_BARIDIMOB].map(m => (
                  <button key={m} type="button" onClick={() => { setPaymentMethod(m); setErrors({}); }}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 flex flex-col items-center gap-1 btn-interactive"
                          style={paymentMethod === m
                            ? { borderColor: C_INK_TEAL, backgroundColor: hexToRgba(C_INK_TEAL, 0.08), color: C_INK_TEAL }
                            : { borderColor: C_SAGE_LINE, color: "#8A9188" }}>
                    <CreditCard size={20} />
                    <span>{PAYMENT_METHOD_LABELS[m]}</span>
                  </button>
                ))}
              </div>
              {errors.method && <p className="text-base mb-3" style={{ color: C_CLAY }}>{errors.method}</p>}

              <Field label="إثبات الدفع">
                <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-3 cursor-pointer text-sm btn-interactive"
                       style={{ borderColor: C_SAGE_LINE, color: "#8A9188" }}>
                  <Upload size={16} /> {paymentFile ? paymentFile.name : "اختر صورة الوصل"}
                  <input type="file" accept="image/*,.pdf" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { setPaymentFile(f); setErrors({}); }
                  }} className="hidden" />
                </label>
                {errors.file && <p className="text-xs mt-1" style={{ color: C_CLAY }}>{errors.file}</p>}
              </Field>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)}
                      className="flex-1 py-3 rounded-xl border font-semibold text-sm btn-interactive"
                      style={{ borderColor: C_SAGE_LINE, color: "#8A9188" }}>
                السابق
              </button>
              <PrimaryButton onClick={handleSubmit} disabled={submitting} loading={submitting} className="flex-1 py-3">
                إرسال طلب التسجيل
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
