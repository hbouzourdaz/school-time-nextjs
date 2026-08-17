"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ArrowRight, CheckCircle, Clock, Eye, Download,
  CreditCard, Upload, Check, AlertCircle, Wallet, Lock, Copy,
} from "lucide-react";
import {
  formatDate, formatDZD,
  PAYMENT_METHOD_CCP, PAYMENT_METHOD_BARIDIMOB, PAYMENT_METHOD_LABELS,
  STATUS_CANCELLED, STATUS_REJECTED,
} from "@/lib/utils";
import { getBookingByCode, updateBookingByCode } from "@/lib/bookings";
import { getExpertByUsername } from "@/lib/experts";
import { isSupabaseConfigured, uploadToSupabaseStorage } from "@/lib/supabase";
import { TextInput, PrimaryButton, SummaryRow, StatusBadge, Field, useToast } from "@/components/ui";

export default function TrackPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    const q = code.trim().toUpperCase();
    if (!q) { setError("أدخل رمز الطلب"); return; }
    setLoading(true); setError(""); setBooking(null);
    try {
      const b = await getBookingByCode(q);
      if (!b) setError("لم يُعثر على طلب بهذا الرمز");
      else setBooking(b);
    } catch {
      setError("حدث خطأ، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F6F0" }}>
      <div className="max-w-md mx-auto px-5 pt-10 pb-16">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 text-base mb-6"
                style={{ color: "#8A9188" }}>
          <ArrowRight size={16} /> الرئيسية
        </button>

        <h1 className="text-3xl font-extrabold mb-2" style={{ color: "#0F3D3E" }}>تتبع طلبي</h1>
        <p className="text-base mb-7" style={{ color: "#8A9188" }}>أدخل رمز الطلب الذي استلمته عند التسجيل</p>

        <div className="bg-white rounded-2xl p-4 mb-6" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)", border: `1px solid #DCE2D6` }}>
          <div className="flex gap-2">
            <TextInput
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="BK-123456"
              dir="ltr"
              className="text-center font-bold uppercase flex-1 text-lg"
            />
            <PrimaryButton onClick={handleSearch} disabled={loading} loading={loading} className="px-5 py-3">
              <Search size={18} />
            </PrimaryButton>
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-4 mb-4 text-base flex items-center gap-2"
               style={{ backgroundColor: "rgba(181,83,60,0.1)", color: "#B5533C" }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {booking && (
          <BookingResult booking={booking} onUpdated={setBooking} />
        )}
      </div>
    </div>
  );
}

function BookingResult({ booking: initial, onUpdated }) {
  const toast = useToast();
  const [booking, setBooking] = useState(initial);
  const [expertInfo, setExpertInfo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentFile, setPaymentFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const isDone = booking.status === "مكتمل";
  const hasFiles = booking.final_files?.length > 0;
  const hasPaymentProof = Boolean(booking.payment_proof_url);
  const downloadOk = booking.download_allowed && booking.payment_confirmed;

  async function loadExpert() {
    if (expertInfo) return expertInfo;
    try {
      const exp = await getExpertByUsername(booking.expert_username);
      setExpertInfo(exp);
      return exp;
    } catch {
      return null;
    }
  }

  async function handlePaymentSubmit() {
    if (!paymentMethod) { setSubmitError("اختر طريقة الدفع"); return; }
    if (!paymentFile) { setSubmitError("ارفع صورة الوصل"); return; }
    setSubmitError(""); setSubmitting(true);
    try {
      const proofUrl = await uploadToSupabaseStorage(paymentFile, "payment-proofs");
      const updates = {
        payment_method: paymentMethod,
        payment_proof_url: proofUrl,
        payment_proof_name: paymentFile.name,
        payment_submitted_at: new Date().toISOString(),
        payment_confirmed: false,
        updated_at: new Date().toISOString(),
      };
      const updated = await updateBookingByCode(booking.code, updates);
      setBooking(updated || { ...booking, ...updates });
      onUpdated(updated || { ...booking, ...updates });
      setSubmitted(true);
      toast.add("تم إرسال الوصل بنجاح", "success");
    } catch {
      setSubmitError("فشل إرسال الوصل، حاول مجدداً");
      toast.add("فشل إرسال الوصل", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const showPaymentSection = isDone && hasFiles && !downloadOk && !hasPaymentProof;

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: `1px solid #DCE2D6` }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-extrabold text-xl" style={{ color: "#0F3D3E" }}>{booking.institution_name}</p>
          <p className="text-base font-bold mt-0.5" style={{ color: "#8A9188" }}>{booking.code}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>
      <div className="space-y-0.5">
        <SummaryRow label="الطور" value={booking.level} />
        <SummaryRow label="الولاية" value={booking.wilaya} />
        <SummaryRow label="الخبير" value={booking.expert_name || booking.expert_username} />
        <SummaryRow label="عدد الأقسام" value={booking.total_sections} />
        <SummaryRow label="الإجمالي" value={formatDZD(booking.total_price)} />
        <SummaryRow label="الدفع" value={booking.is_paid ? "✅ تم التحصيل" : "⏳ لم يُحصَّل بعد"} />
        <SummaryRow label="تاريخ الطلب" value={formatDate(booking.created_at)} />
      </div>

      {booking.status === STATUS_CANCELLED && booking.cancel_reason && (
        <div className="mt-4 rounded-xl p-4 text-base"
             style={{ backgroundColor: "rgba(181,83,60,0.1)", border: `1px solid rgba(181,83,60,0.3)` }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: "#B5533C" }}>
            <AlertCircle size={16} />
            <span className="font-bold">تم إلغاء الحجز</span>
          </div>
          <p className="text-base" style={{ color: "#8A9188" }}>السبب: {booking.cancel_reason}</p>
        </div>
      )}

      {booking.status === STATUS_REJECTED && booking.rejected_reason && (
        <div className="mt-4 rounded-xl p-4 text-base"
             style={{ backgroundColor: "rgba(181,83,60,0.1)", border: `1px solid rgba(181,83,60,0.3)` }}>
          <div className="flex items-center gap-2 mb-1" style={{ color: "#B5533C" }}>
            <AlertCircle size={16} />
            <span className="font-bold">تم رفض الطلب</span>
          </div>
          <p className="text-base" style={{ color: "#8A9188" }}>السبب: {booking.rejected_reason}</p>
        </div>
      )}

      {/* Final Files Section */}
      {isDone && hasFiles && (
        <div className="mt-5 pt-5 border-t" style={{ borderColor: "#EDEFE9" }}>
          <p className="text-base font-bold mb-4" style={{ color: "#0F3D3E" }}>الملفات النهائية</p>

          {downloadOk ? (
            <div className="space-y-2">
              {booking.final_files.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" download
                   className="flex items-center gap-2 text-base font-bold px-5 py-3.5 rounded-xl w-full justify-center btn-interactive"
                   style={{ backgroundColor: "rgba(63,120,89,0.1)", color: "#3F7859" }}>
                  <Download size={16} /> تحميل {f.name}
                </a>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {booking.final_files.map((f, i) => (
                <div key={i} className="relative overflow-hidden rounded-xl"
                     style={{ border: `1px solid #DCE2D6` }}>
                  <div className="relative">
                    {f.url && (f.url.match(/\.(jpg|jpeg|png)$/i) || f.url.startsWith("data:image")) ? (
                      <div className="relative">
                        <img src={f.url} alt={f.name} className="w-full h-auto block" style={{ maxHeight: 200, objectFit: "cover" }} />
                        <WatermarkOverlay />
                      </div>
                    ) : f.url && f.url.match(/\.pdf$/i) ? (
                      <div className="relative">
                        <iframe src={f.url} className="w-full" style={{ height: 200 }} title={f.name} />
                        <WatermarkOverlay />
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="flex items-center gap-2 p-4" style={{ backgroundColor: "#F5F6F0" }}>
                          <Eye size={16} color="#8A9188" />
                          <span className="text-base" style={{ color: "#0F3D3E" }}>{f.name}</span>
                        </div>
                        <WatermarkOverlay />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3 text-base"
                       style={{ backgroundColor: "#F5F6F0" }}>
                    <Lock size={14} color="#B5533C" />
                    <span style={{ color: "#B5533C" }}>التحميل مقفل — ادفع أولاً</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Proof Already Submitted */}
      {hasPaymentProof && !booking.payment_confirmed && (
        <div className="mt-5 pt-5 border-t" style={{ borderColor: "#EDEFE9" }}>
          <div className="rounded-xl p-4 text-base"
               style={{ backgroundColor: "rgba(198,138,46,0.12)", border: `1px solid rgba(198,138,46,0.3)` }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: "#96691F" }}>
              <Clock size={16} />
              <span className="font-bold">تم إرسال الوصل — بانتظار تأكيد الخبير</span>
            </div>
            <p className="text-base" style={{ color: "#8A9188" }}>
              تم استلام وصل الدفع الخاص بك. الخبير سي 확인ه ويسمح بالتحميل قريباً.
            </p>
            <a href={booking.payment_proof_url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 text-sm font-semibold mt-2 underline btn-interactive"
               style={{ color: "#0F3D3E" }}>
              <Eye size={14} /> عرض الوصل المرسل
            </a>
          </div>
        </div>
      )}

      {/* Payment Confirmed but Download Not Yet Allowed */}
      {booking.payment_confirmed && !booking.download_allowed && (
        <div className="mt-5 pt-5 border-t" style={{ borderColor: "#EDEFE9" }}>
          <div className="rounded-xl p-4 text-base"
               style={{ backgroundColor: "rgba(63,120,89,0.08)", border: `1px solid rgba(63,120,89,0.2)` }}>
            <div className="flex items-center gap-2" style={{ color: "#3F7859" }}>
              <Check size={16} />
              <span className="font-bold">تم تأكيد الدفع — بانتظار السماح بالتحميل</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form */}
      {showPaymentSection && <PaymentForm
        booking={booking}
        expertInfo={expertInfo}
        loadExpert={loadExpert}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paymentFile={paymentFile}
        setPaymentFile={setPaymentFile}
        uploading={uploading}
        setUploading={setUploading}
        submitting={submitting}
        submitted={submitted}
        submitError={submitError}
        onSubmit={handlePaymentSubmit}
      />}
    </div>
  );
}

function WatermarkOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
         style={{ backgroundColor: "rgba(248,250,252,0.7)" }}>
      <div className="text-center" style={{ transform: "rotate(-15deg)" }}>
        <p className="text-xl font-extrabold" style={{ color: "rgba(15,61,62,0.25)" }}>لم يتم الدفع بعد</p>
        <p className="text-base" style={{ color: "rgba(15,61,62,0.18)" }}>ادفع للمعاينة بدون علامة مائية</p>
      </div>
    </div>
  );
}

function PaymentForm({
  booking, expertInfo, loadExpert,
  paymentMethod, setPaymentMethod,
  paymentFile, setPaymentFile,
  uploading, setUploading,
  submitting, submitted,
  submitError, onSubmit,
}) {
  const [loadedExpert, setLoadedExpert] = useState(expertInfo);
  const [copied, setCopied] = useState(null);

  async function handleLoadExpert() {
    if (!loadedExpert) {
      const exp = await loadExpert();
      setLoadedExpert(exp);
    }
  }

  function copyToClipboard(text, label) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  if (submitted) {
    return (
      <div className="mt-5 pt-5 border-t" style={{ borderColor: "#EDEFE9" }}>
        <div className="rounded-xl p-5 text-base text-center"
             style={{ backgroundColor: "rgba(63,120,89,0.12)", color: "#3F7859" }}>
          <CheckCircle size={28} className="mx-auto mb-2" />
          <p className="font-bold mb-1">تم إرسال الوصل بنجاح!</p>
          <p className="text-base" style={{ color: "#8A9188" }}>الخبير سي 확인 الدفع ويسمح بالتحميل.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 pt-5 border-t" style={{ borderColor: "#EDEFE9" }}>
      <div className="flex items-center gap-2 mb-3">
        <CreditCard size={20} color="#0F3D3E" />
        <h3 className="font-bold text-lg" style={{ color: "#0F3D3E" }}>دفع المبلغ</h3>
      </div>

      {/* Amount */}
      <div className="rounded-xl p-4 mb-4 text-center"
           style={{ backgroundColor: "rgba(198,138,46,0.08)", border: `1px solid rgba(198,138,46,0.2)` }}>
        <p className="text-base mb-1" style={{ color: "#8A9188" }}>المبلغ المستحق</p>
        <p className="text-2xl font-extrabold" style={{ color: "#C68A2E" }}>{formatDZD(booking.total_price)}</p>
      </div>

      {/* Expert Payment Info */}
      <div onClick={handleLoadExpert}
              className="w-full text-right rounded-xl p-4 mb-4 cursor-pointer transition-all"
              style={{ backgroundColor: "rgba(15,61,62,0.06)", border: `1px solid rgba(15,61,62,0.15)` }}>
        <div className="flex items-center gap-2 mb-2" style={{ color: "#0F3D3E" }}>
          <Wallet size={16} />
          <span className="font-bold text-base">حسابات الدفع</span>
        </div>
        {loadedExpert ? (
          <div className="space-y-2">
            {loadedExpert.name && (
              <p className="text-base" style={{ color: "#8A9188" }}>
                <span className="font-bold" style={{ color: "#0F3D3E" }}>{loadedExpert.name}</span>
              </p>
            )}
            {loadedExpert.ccp_number && (
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                   style={{ backgroundColor: "#fff", border: `1px solid #DCE2D6` }}>
                <div>
                  <p className="text-xs" style={{ color: "#8A9188" }}>CCP</p>
                  <p className="font-bold text-base" style={{ color: "#0F3D3E" }} dir="ltr">{loadedExpert.ccp_number}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); copyToClipboard(loadedExpert.ccp_number, "CCP"); }}
                        className="p-2 rounded-lg btn-interactive"
                        style={{ backgroundColor: "rgba(15,61,62,0.1)", color: "#0F3D3E" }}>
                  {copied === "CCP" ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            )}
            {loadedExpert.baridimob_number && (
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                   style={{ backgroundColor: "#fff", border: `1px solid #DCE2D6` }}>
                <div>
                  <p className="text-xs" style={{ color: "#8A9188" }}>BaridiMob</p>
                  <p className="font-bold text-base" style={{ color: "#0F3D3E" }} dir="ltr">{loadedExpert.baridimob_number}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); copyToClipboard(loadedExpert.baridimob_number, "BaridiMob"); }}
                        className="p-2 rounded-lg btn-interactive"
                        style={{ backgroundColor: "rgba(15,61,62,0.1)", color: "#0F3D3E" }}>
                  {copied === "BaridiMob" ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            )}
            {!loadedExpert.ccp_number && !loadedExpert.baridimob_number && (
              <p className="text-base" style={{ color: "#B5533C" }}>الخبير لم يُدخل معلومات الدفع بعد</p>
            )}
          </div>
        ) : (
          <p className="text-base" style={{ color: "#8A9188" }}>اضغط لعرض حسابات الدفع</p>
        )}
      </div>

      {/* Payment Method Selection */}
      <p className="text-base font-bold mb-2" style={{ color: "#0F3D3E" }}>اختر طريقة الدفع</p>
      <div className="flex gap-3 mb-5">
        {[PAYMENT_METHOD_CCP, PAYMENT_METHOD_BARIDIMOB].map((m) => (
          <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                  className="flex-1 py-4 rounded-xl text-base font-bold border-2 flex flex-col items-center gap-2 btn-interactive"
                  style={paymentMethod === m
                    ? { borderColor: "#0F3D3E", backgroundColor: "rgba(15,61,62,0.08)", color: "#0F3D3E" }
                    : { borderColor: "#DCE2D6", color: "#8A9188" }}>
            <CreditCard size={22} />
            <span>{PAYMENT_METHOD_LABELS[m]}</span>
          </button>
        ))}
      </div>

      {/* File Upload */}
      <Field label="صورة الوصل">
        <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-5 cursor-pointer text-base transition-all"
               style={{ borderColor: paymentFile ? "#3F7859" : "#DCE2D6", color: paymentFile ? "#3F7859" : "#8A9188" }}>
          {paymentFile ? <><Check size={16} /> {paymentFile.name}</> : <><Upload size={16} /> اختر صورة الوصل</>}
          <input type="file" accept="image/*,.pdf"
                 onChange={async (e) => {
                   const file = e.target.files?.[0];
                   if (!file) return;
                   setUploading(true);
                   setPaymentFile(file);
                   setUploading(false);
                 }}
                 className="hidden" />
        </label>
      </Field>

      {submitError && (
        <div className="rounded-xl p-3 mb-4 text-base flex items-center gap-2"
             style={{ backgroundColor: "rgba(181,83,60,0.12)", color: "#B5533C" }}>
          <AlertCircle size={14} /> {submitError}
        </div>
      )}

      <PrimaryButton onClick={onSubmit} disabled={submitting || uploading} loading={submitting} className="w-full py-4 text-lg">
        إرسال الوصل
      </PrimaryButton>
    </div>
  );
}
