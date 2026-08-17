"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, RefreshCw, Building2, Trash2, Upload, AlertCircle, ArrowRight,
  CreditCard, Wallet, Check, Eye, Download, Image as ImageIcon, XCircle,
} from "lucide-react";
import {
  C_INK, C_INK_TEAL, C_PAPER, C_SAGE_LINE, C_CLAY, C_SUCCESS, C_OCHRE,
  hexToRgba, formatDZD, formatDate, ALL_STATUSES_WITH_CANCEL, STATUS_CANCELLED, STATUS_REJECTED,
  PAYMENT_METHOD_CCP, PAYMENT_METHOD_BARIDIMOB, PAYMENT_METHOD_LABELS,
} from "@/lib/utils";
import { isSupabaseConfigured, uploadToSupabaseStorage } from "@/lib/supabase";
import { getBookingsByExpert, updateBookingByCode } from "@/lib/bookings";
import { getExpertByUsername, updateExpert } from "@/lib/experts";
import { getNotificationsForExpert, markAllReadForExpert, getUnreadCountForExpert } from "@/lib/notifications";
import {
  TextInput, PrimaryButton, StatusBadge, SummaryRow, Field, Card, useToast, NotificationBell,
} from "@/components/ui";

export default function ExpertDashboardPage() {
  const router = useRouter();
  const [expert, setExpert] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("bookings");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem("expertAuth") : null;
    if (!raw) { router.replace("/expert/login"); return; }
    try {
      const data = JSON.parse(raw);
      setExpert(data);
    } catch {
      router.replace("/expert/login");
    }
  }, [router]);

  const loadedRef = useRef(false);

  const loadNotifications = useCallback(async (username) => {
    if (!username) return;
    try {
      const data = await getNotificationsForExpert(username);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem("expertAuth") : null;
    if (!raw) return;
    let username;
    try { username = JSON.parse(raw).username; } catch { return; }
    if (!username) return;
    setLoading(true);
    try {
      const freshExpert = await getExpertByUsername(username);
      if (freshExpert) {
        setExpert(freshExpert);
        sessionStorage.setItem("expertAuth", JSON.stringify({ username: freshExpert.username, name: freshExpert.name }));
      }
      const data = await getBookingsByExpert(username);
      setBookings(data);
      loadNotifications(username);
    } catch (e) {
      console.error("Failed to load expert data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      load();
    }
  }, [load]);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem("expertAuth") : null;
    if (!raw) return;
    let username;
    try { username = JSON.parse(raw).username; } catch { return; }
    if (!username) return;
    const interval = setInterval(() => loadNotifications(username), 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  function handleLogout() {
    sessionStorage.removeItem("expertAuth");
    router.push("/expert/login");
  }

  async function handleMarkAllRead() {
    if (expert?.username) {
      await markAllReadForExpert(expert.username);
      loadNotifications(expert.username);
    }
  }

  if (!expert) return null;

  if (selected) {
    return <BookingDetail booking={selected} expert={expert}
                          onBack={() => setSelected(null)}
                          onSaved={() => { setSelected(null); load(); }} />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: C_PAPER }}>
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between"
           style={{ borderColor: C_SAGE_LINE }}>
        <div>
          <h1 className="font-extrabold text-base" style={{ color: C_INK }}>لوحة تحكم الخبير</h1>
          <p className="text-xs" style={{ color: "#8A9188" }}>مرحباً، {expert.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell notifications={notifications} unreadCount={unreadCount}
                            onMarkAllRead={handleMarkAllRead} />
          <button onClick={handleLogout} className="flex items-center gap-1 text-sm" style={{ color: "#8A9188" }}>
            <LogOut size={16} /> خروج
          </button>
        </div>
      </div>

      <div className="flex border-b bg-white overflow-x-auto" style={{ borderColor: C_SAGE_LINE }}>
        <button onClick={() => setTab("bookings")}
                className="flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors"
                style={tab === "bookings"
                  ? { borderColor: C_INK_TEAL, color: C_INK_TEAL }
                  : { borderColor: "transparent", color: "#8A9188" }}>
          <Building2 size={16} /> الحجوزات
        </button>
        <button onClick={() => setTab("payment")}
                className="flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors"
                style={tab === "payment"
                  ? { borderColor: C_INK_TEAL, color: C_INK_TEAL }
                  : { borderColor: "transparent", color: "#8A9188" }}>
          <CreditCard size={16} /> حساب الدفع
        </button>
      </div>

      {(expert.ccp_number || expert.baridimob_number) && (
        <div className="mx-4 mt-3 rounded-xl p-3 flex items-center gap-3"
             style={{ backgroundColor: hexToRgba(C_OCHRE, 0.08), border: `1px solid ${hexToRgba(C_OCHRE, 0.2)}` }}>
          <Wallet size={18} color={C_OCHRE} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold" style={{ color: C_OCHRE }}>معلومات الدفع الخاصة بكم</p>
            <div className="flex items-center gap-3 flex-wrap">
              {expert.ccp_number && (
                <p className="text-xs font-mono" style={{ color: "#8A9188" }} dir="ltr">CCP: {expert.ccp_number}</p>
              )}
              {expert.baridimob_number && (
                <p className="text-xs font-mono" style={{ color: "#8A9188" }} dir="ltr">BaridiMob: {expert.baridimob_number}</p>
              )}
            </div>
          </div>
          <button onClick={() => setTab("payment")} className="text-xs font-semibold btn-interactive" style={{ color: C_INK_TEAL }}>
            تعديل
          </button>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pb-16 pt-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={isSupabaseConfigured()
                  ? { backgroundColor: hexToRgba(C_SUCCESS, 0.15), color: C_SUCCESS }
                  : { backgroundColor: hexToRgba(C_CLAY, 0.12), color: C_CLAY }}>
            {isSupabaseConfigured() ? "● متصل بـ Supabase" : "● وضع محلي"}
          </span>
          {tab === "bookings" && (
            <button onClick={load} className="text-base font-semibold flex items-center gap-1 btn-interactive" style={{ color: C_INK_TEAL }}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> تحديث
            </button>
          )}
        </div>

        {tab === "bookings" && (
          loading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <span className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: C_INK_TEAL, borderTopColor: "transparent" }} />
              <p className="text-base" style={{ color: "#8A9188" }}>جارٍ التحميل...</p>
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-base text-center py-8" style={{ color: "#8A9188" }}>لا توجد حجوزات مستندة إليك بعد</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <button key={b.code} onClick={() => setSelected(b)}
                        className="w-full text-right bg-white rounded-xl p-4 card-interactive"
                        style={{ border: `1px solid ${C_SAGE_LINE}` }}>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="font-bold text-base" style={{ color: C_INK }}>{b.institution_name}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-base mb-2" style={{ color: "#8A9188" }}>
                    {b.applicant_name} · {b.phone}
                  </p>
                  <div className="flex justify-between text-xs" style={{ color: "#8A9188" }}>
                    <span>{b.level} · {b.total_sections} قسم · {formatDZD(b.total_price)}</span>
                    <span className="font-mono">{b.code}</span>
                  </div>
                  {b.payment_proof_url && !b.payment_confirmed && (
                    <div className="mt-2 text-xs font-semibold px-2 py-1 rounded-lg inline-block"
                         style={{ backgroundColor: hexToRgba(C_OCHRE, 0.15), color: C_OCHRE }}>
                      ✓ وصل دفع جديد
                    </div>
                  )}
                </button>
                ))}
              </div>
          )
        )}

        {tab === "payment" && <PaymentSettings expert={expert} onSaved={setExpert} />}
      </div>
    </div>
  );
}

// ===== Payment Settings =====
function PaymentSettings({ expert, onSaved }) {
  const toast = useToast();
  const [ccp, setCcp] = useState(expert.ccp_number || "");
  const [baridimob, setBaridimob] = useState(expert.baridimob_number || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updates = {
        ccp_number: ccp.trim(),
        baridimob_number: baridimob.trim(),
        updated_at: new Date().toISOString(),
      };
      await updateExpert(expert.username, updates);
      const updatedExpert = { ...expert, ...updates };
      onSaved(updatedExpert);
      setSaved(true);
      toast.add("تم حفظ معلومات الدفع بنجاح", "success");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.add("فشل حفظ البيانات", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
      <div className="flex items-center gap-2 mb-4">
        <Wallet size={20} color={C_INK_TEAL} />
        <h2 className="font-bold text-base" style={{ color: C_INK }}>معلومات الدفع</h2>
      </div>
      <p className="text-base mb-4" style={{ color: "#8A9188" }}>
        أدخل أرقام حساباتك المالية لتتمكّن الزبائن من الدفع لك عبر CCP أو بريد موب.
      </p>

      <Field label="رقم حساب CCP">
        <TextInput value={ccp} onChange={(e) => setCcp(e.target.value)}
                   placeholder="مثال: 12345678" dir="ltr" />
      </Field>

      <Field label="رقم بريد موب (BaridiMob)">
        <TextInput value={baridimob} onChange={(e) => setBaridimob(e.target.value)}
                   placeholder="مثال: 0777123456" dir="ltr" />
      </Field>

      {saved && (
        <div className="rounded-xl p-3 mb-3 text-sm flex items-center gap-2"
             style={{ backgroundColor: hexToRgba(C_SUCCESS, 0.12), color: C_SUCCESS }}>
          <Check size={16} /> تم الحفظ بنجاح
        </div>
      )}

      <PrimaryButton onClick={handleSave} disabled={saving} loading={saving} className="w-full py-3">
        حفظ معلومات الدفع
      </PrimaryButton>
    </div>
  );
}

// ===== Booking Detail (Expert View) =====
function BookingDetail({ booking: initial, expert, onBack, onSaved }) {
  const toast = useToast();
  const [booking, setBooking] = useState(initial);
  const [status, setStatus] = useState(initial.status);
  const [isPaid, setIsPaid] = useState(Boolean(initial.is_paid));
  const [paymentConfirmed, setPaymentConfirmed] = useState(Boolean(initial.payment_confirmed));
  const [finalFiles, setFinalFiles] = useState(Array.isArray(initial.final_files) ? initial.final_files : []);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(initial.expert_note || "");
  const [downloadAllowed, setDownloadAllowed] = useState(Boolean(initial.download_allowed));
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  function addFinalFile(file) {
    if (!file) return;
    setFinalFiles((prev) => [...prev, file]);
  }

  function removeFinalFile(index) {
    setFinalFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updates = {
        status,
        is_paid: isPaid,
        payment_confirmed: paymentConfirmed,
        download_allowed: downloadAllowed,
        final_files: finalFiles,
        expert_note: note,
        updated_at: new Date().toISOString(),
      };
      const updated = await updateBookingByCode(booking.code, updates);
      toast.add("تم حفظ التغييرات بنجاح", "success");
      onSaved(updated || { ...booking, ...updates });
    } catch (e) {
      console.error(e);
      toast.add("فشل حفظ التغييرات", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setShowCancelModal(false);
    setCancelling(true);
    try {
      const updates = {
        status: STATUS_CANCELLED,
        cancel_reason: cancelReason.trim(),
        cancelled_by: "expert",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = await updateBookingByCode(booking.code, updates);
      toast.add("تم إلغاء الحجز بنجاح", "success");
      onSaved(updated || { ...booking, ...updates });
    } catch (e) {
      console.error(e);
      toast.add("فشل الإلغاء", "error");
    } finally {
      setCancelling(false);
    }
  }

  const hasPaymentProof = Boolean(booking.payment_proof_url);

  return (
    <div className="min-h-screen" style={{ backgroundColor: C_PAPER }}>
      <div className="max-w-2xl mx-auto p-4 pb-10">
        <button onClick={onBack} className="text-base mb-4 flex items-center gap-1" style={{ color: "#8A9188" }}>
          <ArrowRight size={16} /> العودة للقائمة
        </button>

        <Card icon={Building2} title={booking.institution_name}
              subtitle={`كود الحجز: ${booking.code} · تاريخ الحجز: ${formatDate(booking.created_at)}`}>
          <SummaryRow label="الطور" value={booking.level} />
          <SummaryRow label="صاحب الطلب" value={booking.applicant_name} />
          <SummaryRow label="الهاتف" value={booking.phone} />
          <SummaryRow label="البريد الإلكتروني" value={booking.email} />
          <SummaryRow label="الولاية" value={booking.wilaya} />
          <SummaryRow label="البلدية" value={booking.municipality} />
          <SummaryRow label="الخبير المسؤول" value={booking.expert_name || booking.expert_username} />
          <SummaryRow label="إجمالي الأقسام" value={booking.total_sections} />
          <SummaryRow label="المبلغ الإجمالي" value={formatDZD(booking.total_price)} />
          <SummaryRow label="الحالة" value={<StatusBadge status={booking.status} />} />
          <SummaryRow label="الدفع" value={booking.is_paid ? "تم التحصيل ✓" : "لم يُحصَّل بعد"} />
          <SummaryRow label="آخر تحديث" value={formatDate(booking.updated_at)} />
        </Card>

        {booking.status === STATUS_CANCELLED && booking.cancel_reason && (
          <div className="bg-white rounded-2xl p-4 mb-4"
               style={{ border: `1px solid ${hexToRgba(C_CLAY, 0.3)}` }}>
            <div className="flex items-center gap-2 mb-1" style={{ color: C_CLAY }}>
              <AlertCircle size={16} />
              <span className="font-bold text-base">تم إلغاء الحجز</span>
            </div>
            <p className="text-xs" style={{ color: "#8A9188" }}>السبب: {booking.cancel_reason}</p>
          </div>
        )}

        {booking.status === STATUS_REJECTED && booking.rejected_reason && (
          <div className="bg-white rounded-2xl p-4 mb-4"
               style={{ border: `1px solid ${hexToRgba(C_CLAY, 0.3)}` }}>
            <div className="flex items-center gap-2 mb-1" style={{ color: C_CLAY }}>
              <AlertCircle size={16} />
              <span className="font-bold text-base">تم رفض الطلب من الإدارة</span>
            </div>
            <p className="text-xs" style={{ color: "#8A9188" }}>السبب: {booking.rejected_reason}</p>
          </div>
        )}

        {/* Payment Proof Section */}
        {hasPaymentProof && (
          <div className="bg-white rounded-2xl p-5 mb-4" style={{ border: `1px solid ${C_OCHRE}` }}>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={18} color={C_OCHRE} />
              <h3 className="font-bold text-base" style={{ color: C_INK }}>وصل الدفع</h3>
            </div>
            <div className="space-y-2">
              <SummaryRow label="طريقة الدفع" value={PAYMENT_METHOD_LABELS[booking.payment_method] || "—"} />
              <SummaryRow label="تاريخ الإرسال" value={formatDate(booking.payment_submitted_at)} />
              <SummaryRow label="الحالة" value={
                booking.payment_confirmed
                  ? <span style={{ color: C_SUCCESS }}>✓ تم التأكيد</span>
                  : <span style={{ color: C_OCHRE }}>⏳ بانتظار التأكيد</span>
              } />
            </div>
            <div className="mt-3">
              <a href={booking.payment_proof_url} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl w-full justify-center"
                 style={{ backgroundColor: hexToRgba(C_INK_TEAL, 0.08), color: C_INK_TEAL }}>
                <Eye size={16} /> عرض الوصل
              </a>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 mb-4" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
          <Field label="حالة الطلب">
            <div className="flex gap-2 flex-wrap">
              {ALL_STATUSES_WITH_CANCEL.map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold border-2 min-w-[90px]"
                        style={status === s
                          ? { borderColor: C_INK_TEAL, backgroundColor: hexToRgba(C_INK_TEAL, 0.08), color: C_INK_TEAL }
                          : s === STATUS_CANCELLED
                            ? { borderColor: hexToRgba(C_CLAY, 0.3), color: C_CLAY }
                            : { borderColor: C_SAGE_LINE, color: "#8A9188" }}>
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <Field label="حالة الدفع">
            <button type="button" onClick={() => setIsPaid((p) => !p)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 btn-interactive"
                    style={isPaid
                      ? { borderColor: C_SUCCESS, backgroundColor: hexToRgba(C_SUCCESS, 0.1), color: C_SUCCESS }
                      : { borderColor: C_SAGE_LINE, color: "#8A9188" }}>
              {isPaid ? "✓ تم تحصيل المبلغ" : "لم يُحصَّل المبلغ بعد — اضغط للتأكيد عند الاستلام"}
            </button>
          </Field>

          {hasPaymentProof && (
            <Field label="تأكيد الدفع من العميل">
              <button type="button" onClick={() => setPaymentConfirmed((p) => !p)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 btn-interactive"
                      style={paymentConfirmed
                        ? { borderColor: C_SUCCESS, backgroundColor: hexToRgba(C_SUCCESS, 0.1), color: C_SUCCESS }
                        : { borderColor: C_SAGE_LINE, color: "#8A9188" }}>
                <CreditCard size={16} />
                {paymentConfirmed ? "✓ تم تأكيد الدفع" : "لم يتم التأكيد بعد — اضغط عند استلام الإثبات"}
              </button>
            </Field>
          )}

          <Field label="السمح بالتحميل">
            <button type="button" onClick={() => setDownloadAllowed((d) => !d)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 btn-interactive"
                    style={downloadAllowed
                      ? { borderColor: C_SUCCESS, backgroundColor: hexToRgba(C_SUCCESS, 0.1), color: C_SUCCESS }
                      : { borderColor: C_SAGE_LINE, color: "#8A9188" }}>
              {downloadAllowed
                ? <><Download size={16} /> تم السمح بالتحميل</>
                : <><Download size={16} /> اضغط للسمح بالتحميل بعد الدفع</>}
            </button>
          </Field>

          <Field label="ملاحظات الخبير" hint="">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="أضف ملاحظات..." />
          </Field>

          <Field label="الملفات النهائية" hint="يمكنك إضافة أكثر من ملف (مثل نسخة PDF ونسخة Excel)">
            {finalFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {finalFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                       style={{ backgroundColor: "#F5F6F0", border: `1px solid ${C_SAGE_LINE}` }}>
                    <span className="text-base truncate flex-1" style={{ color: C_INK }}>{f.name}</span>
                    <button type="button" onClick={() => removeFinalFile(i)} className="mr-2 flex-shrink-0"
                            style={{ color: C_CLAY }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <FileUploadInput onFile={addFinalFile} />
          </Field>

          <PrimaryButton onClick={handleSave} disabled={saving} loading={saving} className="w-full py-3 mt-2">
            حفظ التغييرات
          </PrimaryButton>

          {booking.status !== STATUS_CANCELLED && (
            <button type="button" onClick={() => setShowCancelModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 mt-3 btn-interactive"
                    style={{ borderColor: hexToRgba(C_CLAY, 0.3), color: C_CLAY }}>
              <XCircle size={16} /> إلغاء الحجز
            </button>
          )}
        </div>

        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
               style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
              <h3 className="font-bold text-base mb-3" style={{ color: C_INK }}>إلغاء الحجز</h3>
              <p className="text-base mb-3" style={{ color: "#8A9188" }}>
                أدخل سبب الإلغاء. ستتم إشارة العميل بالإلغاء.
              </p>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="سبب الإلغاء..."
                        rows={3}
                        className="w-full rounded-xl border px-4 py-3 text-sm resize-none outline-none focus:ring-2"
                        style={{ borderColor: C_SAGE_LINE, color: C_INK }} />
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => { setShowCancelModal(false); setCancelReason(""); }}
                        className="flex-1 py-2.5 rounded-xl border font-semibold text-sm btn-interactive"
                        style={{ borderColor: C_SAGE_LINE, color: "#8A9188" }}>
                  إلغاء
                </button>
                <PrimaryButton onClick={handleCancel} disabled={cancelling || !cancelReason.trim()} loading={cancelling}
                               className="flex-1 py-2.5 text-sm" style={{ backgroundColor: C_CLAY }}>
                  تأكيد الإلغاء
                </PrimaryButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FileUploadInput({ onFile }) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      if (isSupabaseConfigured()) {
        const url = await uploadToSupabaseStorage(file, "final-files");
        onFile({ name: file.name, url });
        return;
      }
      const MAX = 2 * 1024 * 1024;
      if (file.size > MAX) {
        setError("الملف كبير جداً — اضغط نسخ رابط بدلاً من ذلك");
        return;
      }
      const reader = new FileReader();
      const dataUrl = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      onFile({ name: file.name, url: dataUrl });
    } catch {
      setError("فشل رفع الملف");
    } finally {
      setUploading(false);
    }
  }

  function submitLink() {
    if (linkValue.trim()) {
      onFile({ name: linkValue.trim(), url: linkValue.trim() });
      setLinkMode(false);
      setLinkValue("");
    }
  }

  return (
    <div>
      {linkMode ? (
        <div className="flex gap-2">
          <input value={linkValue} onChange={(e) => setLinkValue(e.target.value)}
                 placeholder="https://..." className="flex-1 rounded-xl border px-3 py-2.5 text-sm"
                 style={{ borderColor: C_SAGE_LINE }} dir="ltr" />
          <PrimaryButton onClick={submitLink} className="px-4 text-sm">إضافة</PrimaryButton>
        </div>
      ) : (
        <div className="flex gap-2">
          <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-3 cursor-pointer text-sm"
                 style={{ borderColor: C_SAGE_LINE, color: "#8A9188" }}>
            <Upload size={16} /> {uploading ? "جارٍ الرفع..." : "اختر ملفاً"}
            <input type="file" accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png" onChange={handleFile}
                   className="hidden" disabled={uploading} />
          </label>
          <button type="button" onClick={() => setLinkMode(true)}
                  className="text-base px-3 whitespace-nowrap font-semibold rounded-xl border"
                  style={{ borderColor: C_SAGE_LINE, color: "#8A9188" }}>
            رابط
          </button>
        </div>
      )}
      {error && <p className="text-xs mt-1 flex items-center gap-1" style={{ color: C_CLAY }}><AlertCircle size={12} /> {error}</p>}
    </div>
  );
}
