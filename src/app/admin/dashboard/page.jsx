"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, ClipboardList, BarChart2, Settings, Users,
  Copy, Check, RefreshCw, Trash2, Upload, Plus, Eye, EyeOff, ArrowRight,
  CreditCard, Download, Clock, Wallet, XCircle, CheckCircle, UserCheck, UserX, Database,
  Sparkles, Play, FileCode, FolderCheck
} from "lucide-react";
import {
  C_INK, C_INK_TEAL, C_PAPER, C_CLAY, C_SAGE_LINE, C_SUCCESS, C_OCHRE,
  hexToRgba, formatDZD, formatDate, ALL_STATUSES_WITH_CANCEL, STATUS_CANCELLED, STATUS_REJECTED,
  computeStats, generateExpertPassword,
  PAYMENT_METHOD_LABELS, REG_STATUS_PENDING, REG_STATUS_APPROVED, REG_STATUS_REJECTED,
  getAdminPaymentInfo, saveAdminPaymentInfo,
} from "@/lib/utils";
import { isSupabaseConfigured, uploadToSupabaseStorage, testSupabaseConnection } from "@/lib/supabase";
import { getAllBookings, updateBookingByCode, deleteBooking } from "@/lib/bookings";
import { getAllExperts, saveExpert, updateExpert, deleteExpert } from "@/lib/experts";
import { getAllRegistrationRequests, updateRegistrationRequest, deleteRegistrationRequest } from "@/lib/registrations";
import { getNotificationsForAdmin, markAllReadForAdmin, getUnreadCountForAdmin } from "@/lib/notifications";
import {
  StatusBadge, SummaryRow, Modal, PrimaryButton, TextInput, Field, useToast, NotificationBell,
} from "@/components/ui";
import FetBookingGeneratorModal from "@/components/fet/FetBookingGeneratorModal";

const tabs = [
  { key: "bookings", label: "الحجوزات",   icon: ClipboardList },
  { key: "registrations", label: "طلبات التسجيل", icon: UserCheck },
  { key: "stats",    label: "الإحصائيات", icon: BarChart2 },
  { key: "experts",  label: "الخبراء",    icon: Users },
  { key: "settings", label: "الإعدادات",  icon: Settings },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("bookings");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getNotificationsForAdmin();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch {}
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  async function handleMarkAllRead() {
    await markAllReadForAdmin();
    loadNotifications();
  }

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("adminAuth") !== "1") {
      router.replace("/admin/login");
    }
  }, [router]);

  function handleLogout() {
    sessionStorage.removeItem("adminAuth");
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: C_PAPER }}>
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between"
           style={{ borderColor: C_SAGE_LINE }}>
        <div>
          <h1 className="font-extrabold text-lg" style={{ color: "#0F3D3E" }}>لوحة تحكم الأدمن</h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={isSupabaseConfigured()
                  ? { backgroundColor: hexToRgba(C_SUCCESS, 0.15), color: C_SUCCESS }
                  : { backgroundColor: hexToRgba(C_CLAY, 0.12), color: C_CLAY }}>
            {isSupabaseConfigured() ? "● متصل بـ Supabase" : "● وضع محلي"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell notifications={notifications} unreadCount={unreadCount}
                            onMarkAllRead={handleMarkAllRead} />
          <button onClick={handleLogout} className="flex items-center gap-1 text-base" style={{ color: "#8A9188" }}>
            <LogOut size={16} /> خروج
          </button>
        </div>
      </div>

      <div className="flex border-b bg-white overflow-x-auto scrollbar-hide" style={{ borderColor: C_SAGE_LINE }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
                  className="flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors"
                  style={activeTab === key
                    ? { borderColor: C_INK_TEAL, color: C_INK_TEAL }
                    : { borderColor: "transparent", color: "#8A9188" }}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-16">
        {activeTab === "bookings" && <BookingsTab />}
        {activeTab === "registrations" && <RegistrationsTab />}
        {activeTab === "stats"    && <StatsTab />}
        {activeTab === "experts"  && <ExpertsTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

function BookingsTab() {
  return <BookingsList />;
}

function RegistrationsTab() {
  return <RegistrationRequestsList />;
}

function StatsTab() {
  return <StatsView />;
}

function ExpertsTab() {
  return <ExpertsManager />;
}

function SettingsTab() {
  return <SettingsForm />;
}

// ===== Bookings List =====
function BookingsList() {
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState(null);

  async function load() {
    setLoading(true);
    try { setBookings(await getAllBookings()); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = bookings.filter(b => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (b.institution_name||"").toLowerCase().includes(q) ||
           (b.applicant_name||"").toLowerCase().includes(q) ||
           (b.phone||"").includes(q) ||
           (b.code||"").toLowerCase().includes(q);
  });

  if (selected) {
    return <BookingDetail booking={selected} onBack={() => { setSelected(null); load(); }} />;
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <TextInput value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..." className="flex-1" />
        <button onClick={load} className="p-2.5 rounded-xl border btn-interactive" style={{ borderColor: C_SAGE_LINE }}>
          <RefreshCw size={18} color="#8A9188" className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      {loading ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <span className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: C_INK_TEAL, borderTopColor: "transparent" }} />
          <p className="text-base" style={{ color:"#8A9188" }}>جارٍ التحميل...</p>
        </div>
      ) : filtered.length === 0 ? <p className="text-base text-center py-8" style={{ color:"#8A9188" }}>لا توجد حجوزات بعد</p> :
       <div className="space-y-3">
          {filtered.map(b => (
            <button key={b.code} onClick={() => setSelected(b)}
                    className="w-full text-right bg-white rounded-xl p-4 card-interactive"
                    style={{ border:`1px solid ${C_SAGE_LINE}` }}>
              <div className="flex justify-between items-start mb-1.5">
                <span className="font-bold" style={{ color: C_INK }}>{b.institution_name}</span>
                <StatusBadge status={b.status} />
              </div>
              <div className="flex justify-between text-sm mb-1" style={{ color:"#8A9188" }}>
                <span>{b.level} · {b.total_sections} قسم · <span className="font-mono">{formatDZD(b.total_price)}</span></span>
                <span className="font-mono">{b.code}</span>
              </div>
              {b.payment_method && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                        style={b.payment_confirmed
                          ? { backgroundColor: hexToRgba(C_SUCCESS, 0.12), color: C_SUCCESS }
                          : { backgroundColor: hexToRgba(C_OCHRE, 0.12), color: C_OCHRE }}>
                    {b.payment_confirmed ? "✓ دفع مؤكد" : "⏳ بانتظار تأكيد الدفع"}
                  </span>
                  {b.download_allowed && (
                    <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: hexToRgba(C_INK_TEAL, 0.12), color: C_INK_TEAL }}>
                      تحميل مسموح
                    </span>
                  )}
                </div>
              )}
              {b.status === STATUS_CANCELLED && (
                <div className="mt-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: hexToRgba(C_CLAY, 0.12), color: C_CLAY }}>
                    ✗ تم الإلغاء
                  </span>
                </div>
              )}
              {b.status === STATUS_REJECTED && (
                <div className="mt-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: hexToRgba(C_CLAY, 0.12), color: C_CLAY }}>
                    ✗ مرفوض
                  </span>
                </div>
              )}
            </button>
          ))}
       </div>}
    </div>
  );
}

function BookingDetail({ booking: initial, onBack }) {
  const toast = useToast();
  const [booking, setBooking] = useState(initial);
  const [status, setStatus]   = useState(initial.status);
  const [isPaid, setIsPaid]   = useState(!!initial.is_paid);
  const [paymentConfirmed, setPaymentConfirmed] = useState(!!initial.payment_confirmed);
  const [downloadAllowed, setDownloadAllowed] = useState(!!initial.download_allowed);
  const [finalFiles, setFinalFiles] = useState(initial.final_files || []);
  const [saving, setSaving]   = useState(false);
  const [adminConfirmed, setAdminConfirmed] = useState(!!initial.admin_confirmed);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState(initial.rejected_reason || "");
  const [rejecting, setRejecting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showFetModal, setShowFetModal] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateBookingByCode(booking.code, {
        status, is_paid: isPaid,
        payment_confirmed: paymentConfirmed,
        download_allowed: downloadAllowed,
        final_files: finalFiles,
        admin_confirmed: adminConfirmed,
        updated_at: new Date().toISOString()
      });
      setBooking(updated);
      toast.add("تم حفظ التحديثات بنجاح", "success");
      onBack();
    } catch {
      toast.add("فشل حفظ التحديثات", "error");
    } finally { setSaving(false); }
  }

  async function handleReject() {
    setShowRejectModal(false);
    setRejecting(true);
    try {
      const updated = await updateBookingByCode(booking.code, {
        status: STATUS_REJECTED,
        rejected_reason: rejectReason.trim(),
        admin_confirmed: false,
        updated_at: new Date().toISOString()
      });
      setBooking(updated);
      toast.add("تم رفض الطلب بنجاح", "success");
      onBack();
    } catch {
      toast.add("فشل رفض الطلب", "error");
    } finally { setRejecting(false); }
  }

  async function handleDelete() {
    setShowDeleteModal(false);
    setDeleting(true);
    try {
      await deleteBooking(booking.code);
      toast.add("تم حذف الحجز بنجاح", "success");
      onBack();
    } catch {
      toast.add("فشل حذف الحجز", "error");
    } finally { setDeleting(false); }
  }

  async function addFinalFile(fileObj) {
    if (fileObj) setFinalFiles(prev => [...prev, fileObj]);
  }

  const paymentMethodLabel = booking.payment_method
    ? PAYMENT_METHOD_LABELS[booking.payment_method] || booking.payment_method
    : null;

  return (
    <div>
      <button onClick={onBack} className="text-base mb-4 flex items-center gap-1" style={{ color:"#8A9188" }}>
        <ArrowRight size={16} /> العودة للقائمة
      </button>

      {/* ─── FET Generator Action Banner ─── */}
      <div className="rounded-2xl p-4 sm:p-5 text-white mb-4 shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4"
           style={{ background: "linear-gradient(135deg, #0F3D3E 0%, #1B5E5F 100%)" }}>
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
            <Sparkles size={18} className="text-amber-300 flex-shrink-0" />
            رفع ملف FET وإنتاج ملفات الحجز الثلاثة
          </h3>
          <p className="text-[11px] sm:text-xs text-white/80 mt-1 leading-relaxed">
            رفع ملف .fet مباشرة لتشغيل محرك FET وإنتاج ملفات (<span className="font-mono text-amber-200">.fet</span> و <span className="font-mono text-amber-200">teachers.xml</span> و <span className="font-mono text-amber-200">subgroups.xml</span>) وحفظها في الحجز.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFetModal(true)}
          className="bg-white hover:bg-white/95 text-[#0F3D3E] font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap self-stretch sm:self-center flex-shrink-0"
        >
          <Upload size={14} className="text-[#0F3D3E]" />
          رفع ملف FET وإنتاج الملفات
        </button>
      </div>

      <div className="bg-white rounded-2xl p-5 mb-4" style={{ border:`1px solid ${C_SAGE_LINE}` }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-extrabold text-lg" style={{ color: C_INK }}>{booking.institution_name}</p>
            <p className="text-xs font-mono" style={{ color:"#8A9188" }}>{booking.code}</p>
          </div>
          <StatusBadge status={status} />
        </div>
        <div className="space-y-0.5 mb-4">
          <SummaryRow label="مقدم الطلب"  value={booking.applicant_name} />
          <SummaryRow label="الهاتف"       value={booking.phone} />
          <SummaryRow label="الولاية"      value={booking.wilaya} />
          <SummaryRow label="الطور"        value={booking.level} />
          <SummaryRow label="عدد الأقسام"  value={booking.total_sections} />
          <SummaryRow label="الإجمالي"     value={formatDZD(booking.total_price)} />
          <SummaryRow label="تاريخ الطلب"  value={formatDate(booking.created_at)} />
        </div>

        {/* ─── Saved Final Files Section ─── */}
        {booking.final_files && booking.final_files.length > 0 && (
          <div className="bg-[#EDF7F2] rounded-2xl p-4 sm:p-5 mb-4 border border-[#3F7859]/30">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <FileCode size={18} className="text-[#3F7859]" />
                <h4 className="font-extrabold text-sm text-[#0F3D3E]">
                  ملفات الحجز النهائية المحفوظة ({booking.final_files.length})
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3F7859] text-white">
                متاحة للعميل
              </span>
            </div>
            <div className="space-y-2">
              {booking.final_files.map((file, idx) => (
                <div key={idx} className="bg-white p-3 rounded-xl border border-[#DCE2D6] flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-[#0F3D3E] text-white text-[10px] font-mono font-bold flex items-center justify-center flex-shrink-0">
                      {file.name.endsWith(".fet") ? "FET" : "XML"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-[#0F3D3E] truncate font-mono">{file.name}</p>
                      <p className="text-[10px] text-[#8A9188]">{file.uploaded_at ? formatDate(file.uploaded_at) : "ملف مرفوع"}</p>
                    </div>
                  </div>
                  <a
                    href={file.url}
                    download={file.name}
                    className="bg-[#F5F6F0] hover:bg-[#0F3D3E] text-[#0F3D3E] hover:text-white border border-[#DCE2D6] px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0"
                  >
                    <Download size={13} />
                    تحميل
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {booking.status === STATUS_CANCELLED && booking.cancel_reason && (
          <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: hexToRgba(C_CLAY, 0.1), border:`1px solid ${hexToRgba(C_CLAY, 0.3)}` }}>
            <div className="flex items-center gap-2 mb-1">
              <XCircle size={14} color={C_CLAY} />
              <span className="text-xs font-bold" style={{ color: C_CLAY }}>
                تم الإلغاء من طرف {booking.cancelled_by === "expert" ? "الخبير" : "الأدمن"}
              </span>
            </div>
            <p className="text-xs" style={{ color:"#8A9188" }}>{booking.cancel_reason}</p>
          </div>
        )}

        {booking.status === STATUS_REJECTED && booking.rejected_reason && (
          <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: hexToRgba(C_CLAY, 0.1), border:`1px solid ${hexToRgba(C_CLAY, 0.3)}` }}>
            <div className="flex items-center gap-2 mb-1">
              <XCircle size={14} color={C_CLAY} />
              <span className="text-xs font-bold" style={{ color: C_CLAY }}>تم الرفض من طرف الأدمن</span>
            </div>
            <p className="text-xs" style={{ color:"#8A9188" }}>{booking.rejected_reason}</p>
          </div>
        )}

        {paymentMethodLabel && (
          <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: hexToRgba(C_OCHRE, 0.08), border:`1px solid ${hexToRgba(C_OCHRE, 0.2)}` }}>
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={14} color={C_OCHRE} />
              <span className="text-xs font-bold" style={{ color: C_OCHRE }}>وسيلة الدفع: {paymentMethodLabel}</span>
            </div>
            {booking.payment_proof_name && (
              <p className="text-xs" style={{ color:"#8A9188" }}>إثبات الدفع: {booking.payment_proof_name}</p>
            )}
            {booking.payment_submitted_at && (
              <p className="text-xs" style={{ color:"#8A9188" }}>أُرسل في: {formatDate(booking.payment_submitted_at)}</p>
            )}
          </div>
        )}

        {booking.payment_proof_url && (
          <div className="mb-4">
            <a href={booking.payment_proof_url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 text-xs font-semibold py-2 px-3 rounded-xl border"
               style={{ borderColor: C_INK_TEAL, color: C_INK_TEAL }}>
              <Eye size={14} /> عرض إثبات الدفع
            </a>
          </div>
        )}

        <Field label="تأكيد الأدمن للطلب">
          <button onClick={() => setAdminConfirmed(p => !p)}
                   className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 btn-interactive"
                  style={adminConfirmed
                    ? { borderColor: C_SUCCESS, backgroundColor: hexToRgba(C_SUCCESS, 0.1), color: C_SUCCESS }
                    : { borderColor: C_SAGE_LINE, color: "#8A9188" }}>
            <CheckCircle size={16} />
            {adminConfirmed ? "✓ تم تأكيد الطلب من الأدمن" : "لم يتم التأكيد بعد — اضغط للتأكيد"}
          </button>
        </Field>

        <Field label="حالة الطلب">
          <div className="flex gap-2 flex-wrap">
            {ALL_STATUSES_WITH_CANCEL.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold border-2 min-w-[90px]"
                      style={status===s ? { borderColor: C_INK_TEAL, backgroundColor:hexToRgba(C_INK_TEAL,0.08), color: C_INK_TEAL }
                                       : s === STATUS_CANCELLED
                                         ? { borderColor: hexToRgba(C_CLAY, 0.3), color: C_CLAY }
                                         : { borderColor: C_SAGE_LINE, color:"#8A9188" }}>
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label="حالة الدفع">
          <button onClick={() => setIsPaid(p => !p)}
                   className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 btn-interactive"
                  style={isPaid ? { borderColor:C_SUCCESS, backgroundColor:hexToRgba(C_SUCCESS,0.1), color:C_SUCCESS }
                                : { borderColor: C_SAGE_LINE, color:"#8A9188" }}>
            {isPaid ? "✓ تم تحصيل المبلغ" : "لم يُحصَّل المبلغ بعد — اضغط للتأكيد عند الاستلام"}
          </button>
        </Field>

        <Field label="تأكيد الدفع من العميل">
          <button onClick={() => setPaymentConfirmed(p => !p)}
                   className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 btn-interactive"
                  style={paymentConfirmed
                    ? { borderColor: C_SUCCESS, backgroundColor: hexToRgba(C_SUCCESS, 0.1), color: C_SUCCESS }
                    : { borderColor: C_SAGE_LINE, color: "#8A9188" }}>
            <CreditCard size={16} />
            {paymentConfirmed ? "✓ تم تأكيد الدفع" : "لم يتم التأكيد بعد — اضغط عند استلام الإثبات"}
          </button>
        </Field>

        <Field label="السماح بالتحميل">
          <button onClick={() => setDownloadAllowed(p => !p)}
                   className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 btn-interactive"
                  style={downloadAllowed
                    ? { borderColor: C_INK_TEAL, backgroundColor: hexToRgba(C_INK_TEAL, 0.08), color: C_INK_TEAL }
                    : { borderColor: C_SAGE_LINE, color: "#8A9188" }}>
            <Download size={16} />
            {downloadAllowed ? "✓ مسموح بالتحميل" : "التحميل ممنوع — اضغط للسماح بعد الدفع"}
          </button>
        </Field>

        <PrimaryButton onClick={handleSave} disabled={saving} loading={saving} className="w-full py-3">
          حفظ التحديثات
        </PrimaryButton>

        <button onClick={() => setShowRejectModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 mt-3 btn-interactive"
                style={{ borderColor: hexToRgba(C_CLAY, 0.3), color: C_CLAY }}>
          <XCircle size={16} /> رفض الطلب
        </button>

        <button onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 mt-2 btn-interactive"
                style={{ borderColor: hexToRgba(C_CLAY, 0.5), color: C_CLAY }}>
          <Trash2 size={16} /> حذف الحجز نهائياً
        </button>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
            <h3 className="font-bold text-base mb-3" style={{ color: C_INK }}>رفض الطلب</h3>
            <p className="text-base mb-3" style={{ color: "#8A9188" }}>
              أدخل سبب الرفض. سيتم إشعار العميل بالرفض.
            </p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="سبب الرفض..."
                      rows={3}
                      className="w-full rounded-xl border px-4 py-3 text-sm resize-none outline-none focus:ring-2"
                      style={{ borderColor: C_SAGE_LINE, color: C_INK }} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowRejectModal(false); setRejectReason(initial.rejected_reason || ""); }}
                      className="flex-1 py-2.5 rounded-xl border font-semibold text-sm btn-interactive"
                      style={{ borderColor: C_SAGE_LINE, color: "#8A9188" }}>
                إلغاء
              </button>
              <PrimaryButton onClick={handleReject} disabled={rejecting || !rejectReason.trim()} loading={rejecting}
                             className="flex-1 py-2.5 text-sm" style={{ backgroundColor: C_CLAY }}>
                تأكيد الرفض
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
            <h3 className="font-bold text-base mb-3" style={{ color: C_CLAY }}>حذف الحجز نهائياً</h3>
            <p className="text-base mb-3" style={{ color: "#8A9188" }}>
              هل أنت متأكد من حذف هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowDeleteModal(false)}
                      className="flex-1 py-2.5 rounded-xl border font-semibold text-sm btn-interactive"
                      style={{ borderColor: C_SAGE_LINE, color: "#8A9188" }}>
                إلغاء
              </button>
              <PrimaryButton onClick={handleDelete} disabled={deleting} loading={deleting}
                             className="flex-1 py-2.5 text-sm" style={{ backgroundColor: C_CLAY }}>
                نعم، حذف
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* FET Generator Modal */}
      {showFetModal && (
        <FetBookingGeneratorModal
          booking={booking}
          onClose={() => setShowFetModal(false)}
          onSaved={(updated) => {
            setBooking(updated);
            if (updated.final_files) setFinalFiles(updated.final_files);
            if (updated.status) setStatus(updated.status);
            toast.add("تم حفظ الجداول بنجاح في ملفات الحجز!", "success");
          }}
        />
      )}
    </div>
  );
}

// ===== Registration Requests =====
function RegistrationRequestsList() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoading(true);
    try { setRequests(await getAllRegistrationRequests()); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  if (selected) {
    return <RegistrationDetail request={selected} onBack={() => { setSelected(null); load(); }} />;
  }

  const pending = requests.filter(r => r.status === REG_STATUS_PENDING);
  const processed = requests.filter(r => r.status !== REG_STATUS_PENDING);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-base font-bold" style={{ color: C_INK }}>
          طلبات التسجيل ({pending.length} قيد المراجعة)
        </span>
        <button onClick={load} className="p-2 rounded-lg btn-interactive" style={{ color: C_INK_TEAL }}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <span className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: C_INK_TEAL, borderTopColor: "transparent" }} />
          <p className="text-base" style={{ color: "#8A9188" }}>جارٍ التحميل...</p>
        </div>
      ) : requests.length === 0 ? (
        <p className="text-base text-center py-8" style={{ color: "#8A9188" }}>لا توجد طلبات تسجيل بعد</p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold mb-2" style={{ color: C_OCHRE }}>قيد المراجعة</p>
              <div className="space-y-2">
                {pending.map(r => (
                  <button key={r.id} onClick={() => setSelected(r)}
                          className="w-full text-right bg-white rounded-xl p-4 card-interactive"
                          style={{ border: `1px solid ${hexToRgba(C_OCHRE, 0.3)}` }}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-base" style={{ color: C_INK }}>{r.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: hexToRgba(C_OCHRE, 0.15), color: C_OCHRE }}>
                        قيد المراجعة
                      </span>
                    </div>
                    <p className="text-xs font-mono" style={{ color: "#8A9188" }}>{r.username}</p>
                    <p className="text-xs" style={{ color: "#8A9188" }}>{formatDate(r.created_at)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {processed.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "#8A9188" }}>تمت المراجعة</p>
              <div className="space-y-2">
                {processed.map(r => (
                  <button key={r.id} onClick={() => setSelected(r)}
                          className="w-full text-right bg-white rounded-xl p-4 card-interactive"
                          style={{ border: `1px solid ${C_SAGE_LINE}` }}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-base" style={{ color: C_INK }}>{r.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                            style={r.status === REG_STATUS_APPROVED
                              ? { backgroundColor: hexToRgba(C_SUCCESS, 0.15), color: C_SUCCESS }
                              : { backgroundColor: hexToRgba(C_CLAY, 0.15), color: C_CLAY }}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs font-mono" style={{ color: "#8A9188" }}>{r.username}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RegistrationDetail({ request: initial, onBack }) {
  const toast = useToast();
  const [request, setRequest] = useState(initial);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleApprove() {
    setProcessing(true);
    try {
      await updateRegistrationRequest(request.id, {
        status: REG_STATUS_APPROVED,
        updated_at: new Date().toISOString(),
      });
      const now = new Date().toISOString();
      await saveExpert({
        username: request.username,
        name: request.name,
        email: request.email,
        phone: request.phone,
        password: request.password,
        ccp_number: request.ccp_number,
        baridimob_number: request.baridimob_number,
        active: true,
        created_at: now,
        updated_at: now,
      });
      toast.add("تم قبول الطلب وإنشاء حساب الخبير", "success");
      onBack();
    } catch {
      toast.add("فشل قبول الطلب", "error");
    } finally { setProcessing(false); }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setProcessing(true);
    try {
      await updateRegistrationRequest(request.id, {
        status: REG_STATUS_REJECTED,
        rejection_reason: rejectReason.trim(),
        updated_at: new Date().toISOString(),
      });
      toast.add("تم رفض الطلب", "success");
      onBack();
    } catch {
      toast.add("فشل رفض الطلب", "error");
    } finally { setProcessing(false); }
  }

  async function handleDelete() {
    setProcessing(true);
    try {
      await deleteRegistrationRequest(request.id);
      toast.add("تم حذف الطلب", "success");
      onBack();
    } catch {
      toast.add("فشل الحذف", "error");
    } finally { setProcessing(false); }
  }

  const paymentLabel = request.payment_method ? PAYMENT_METHOD_LABELS[request.payment_method] : "—";

  return (
    <div>
      <button onClick={onBack} className="text-base mb-4 flex items-center gap-1" style={{ color: "#8A9188" }}>
        <ArrowRight size={16} /> العودة للقائمة
      </button>

      <div className="bg-white rounded-2xl p-5 mb-4" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-extrabold text-lg" style={{ color: C_INK }}>{request.name}</p>
            <p className="text-xs font-mono" style={{ color: "#8A9188" }}>{request.username}</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={request.status === REG_STATUS_APPROVED
                  ? { backgroundColor: hexToRgba(C_SUCCESS, 0.15), color: C_SUCCESS }
                  : request.status === REG_STATUS_REJECTED
                    ? { backgroundColor: hexToRgba(C_CLAY, 0.15), color: C_CLAY }
                    : { backgroundColor: hexToRgba(C_OCHRE, 0.15), color: C_OCHRE }}>
            {request.status}
          </span>
        </div>

        <div className="space-y-0.5 mb-4">
          <SummaryRow label="الاسم الكامل" value={request.name} />
          <SummaryRow label="اسم المستخدم" value={request.username} />
          <SummaryRow label="البريد الإلكتروني" value={request.email} />
          <SummaryRow label="رقم الهاتف" value={request.phone} />
          <SummaryRow label="رقم CCP" value={request.ccp_number || "—"} />
          <SummaryRow label="رقم BaridiMob" value={request.baridimob_number || "—"} />
          <SummaryRow label="وسيلة الدفع" value={paymentLabel} />
          <SummaryRow label="رسوم التسجيل" value={formatDZD(request.registration_fee)} />
          <SummaryRow label="تاريخ الطلب" value={formatDate(request.created_at)} />
        </div>

        {request.payment_proof_url && (
          <div className="mb-4">
            <a href={request.payment_proof_url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 text-xs font-semibold py-2 px-3 rounded-xl border btn-interactive"
               style={{ borderColor: C_INK_TEAL, color: C_INK_TEAL }}>
              <Eye size={14} /> عرض إثبات الدفع
            </a>
          </div>
        )}

        {request.rejection_reason && (
          <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: hexToRgba(C_CLAY, 0.1), border: `1px solid ${hexToRgba(C_CLAY, 0.3)}` }}>
            <p className="text-xs font-bold mb-1" style={{ color: C_CLAY }}>سبب الرفض:</p>
            <p className="text-xs" style={{ color: "#8A9188" }}>{request.rejection_reason}</p>
          </div>
        )}

        {request.status === REG_STATUS_PENDING && (
          <div className="flex gap-2">
            <PrimaryButton onClick={handleApprove} disabled={processing} loading={processing}
                           className="flex-1 py-3" style={{ backgroundColor: C_SUCCESS }}>
              قبول وإنشاء الحساب
            </PrimaryButton>
            <button onClick={() => setShowRejectModal(true)}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm border-2 btn-interactive"
                    style={{ borderColor: hexToRgba(C_CLAY, 0.3), color: C_CLAY }}>
              رفض
            </button>
          </div>
        )}

        <button onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 mt-3 btn-interactive"
                style={{ borderColor: hexToRgba(C_CLAY, 0.5), color: C_CLAY }}>
          <Trash2 size={16} /> حذف الطلب
        </button>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
            <h3 className="font-bold text-base mb-3" style={{ color: C_INK }}>رفض طلب التسجيل</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder="سبب الرفض..."
                      rows={3}
                      className="w-full rounded-xl border px-4 py-3 text-sm resize-none outline-none focus:ring-2"
                      style={{ borderColor: C_SAGE_LINE, color: C_INK }} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowRejectModal(false); setRejectReason(""); }}
                      className="flex-1 py-2.5 rounded-xl border font-semibold text-sm btn-interactive"
                      style={{ borderColor: C_SAGE_LINE, color: "#8A9188" }}>
                إلغاء
              </button>
              <PrimaryButton onClick={handleReject} disabled={processing || !rejectReason.trim()} loading={processing}
                             className="flex-1 py-2.5 text-sm" style={{ backgroundColor: C_CLAY }}>
                تأكيد الرفض
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Stats =====
function StatsView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  async function load() {
    setLoading(true);
    try { setBookings(await getAllBookings()); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const stats = computeStats(bookings);

  if (loading) return <p className="text-base" style={{ color:"#8A9188" }}>جارٍ تحميل الإحصائيات...</p>;

  return (
    <div>
      <button onClick={load} className="text-base mb-4 font-semibold" style={{ color: C_INK_TEAL }}>تحديث</button>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl p-4 text-center" style={{ backgroundColor: hexToRgba(C_INK_TEAL, 0.08) }}>
          <p className="text-base mb-1" style={{ color:"#8A9188" }}>إجمالي الطلبات</p>
          <p className="text-2xl font-extrabold font-mono" style={{ color: C_INK_TEAL }}>{stats.totalRequests}</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ backgroundColor: hexToRgba(C_OCHRE, 0.1) }}>
          <p className="text-base mb-1" style={{ color:"#8A9188" }}>المبالغ المحصَّلة</p>
          <p className="text-lg font-extrabold font-mono" style={{ color: C_OCHRE }}>{formatDZD(stats.totalCollected)}</p>
          <p className="text-xs" style={{ color:"#8A9188" }}>من أصل {formatDZD(stats.totalValue)}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 mb-4" style={{ border:`1px solid ${C_SAGE_LINE}` }}>
        <h3 className="font-bold text-base mb-3" style={{ color: C_INK }}>حسب الطور</h3>
        {Object.keys(stats.byLevel).length === 0
          ? <p className="text-base" style={{ color:"#8A9188" }}>لا توجد بيانات بعد</p>
          : Object.entries(stats.byLevel).map(([lv,cnt]) => <SummaryRow key={lv} label={lv} value={cnt} />)}
      </div>
      <div className="bg-white rounded-2xl p-4" style={{ border:`1px solid ${C_SAGE_LINE}` }}>
        <h3 className="font-bold text-base mb-3" style={{ color: C_INK }}>حسب الخبير</h3>
        {Object.keys(stats.byExpert).length === 0
          ? <p className="text-base" style={{ color:"#8A9188" }}>لا توجد بيانات بعد</p>
          : Object.entries(stats.byExpert).map(([name,s]) => (
            <div key={name} className="rounded-xl p-3 mb-2" style={{ backgroundColor:"#F5F6F0" }}>
              <p className="font-semibold text-sm mb-1.5" style={{ color: C_INK }}>{name}</p>
              <SummaryRow label="عدد الطلبات" value={s.count} />
              <SummaryRow label="القيمة" value={formatDZD(s.value)} />
              <SummaryRow label="المحصَّل" value={formatDZD(s.collected)} />
            </div>
          ))}
      </div>
    </div>
  );
}

// ===== Experts Manager =====
function ExpertsManager() {
  const toast = useToast();
  const [experts, setExperts]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [newName, setNewName]     = useState("");
  const [newUsername, setNewUser] = useState("");
  const [creating, setCreating]   = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [justCreated, setJustCreated] = useState(null);

  async function load() {
    setLoading(true);
    try { setExperts(await getAllExperts()); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function handleCreate() {
    const name  = newName.trim();
    const uname = newUsername.trim().toLowerCase().replace(/\s+/g,"_");
    if (!name || !uname) { setCreateErr("أدخل الاسم واسم المستخدم"); return; }
    if (experts.find(e => e.username === uname)) { setCreateErr("اسم المستخدم مستخدم بالفعل"); return; }
    setCreating(true); setCreateErr("");
    const now = new Date().toISOString();
    const pwd  = generateExpertPassword();
    const expert = { username: uname, name, password: pwd, active: true, created_at: now, updated_at: now };
    try {
      await saveExpert(expert);
      setJustCreated({ username: uname, password: pwd, name });
      setNewName(""); setNewUser(""); setShowAdd(false); load();
    } catch { setCreateErr("فشل الإنشاء، حاول مجدداً"); }
    finally { setCreating(false); }
  }

  async function handleToggle(exp) {
    await updateExpert(exp.username, { active: exp.active === false, updated_at: new Date().toISOString() });
    load();
  }

  async function handleReset(exp) {
    const newPwd = generateExpertPassword();
    await updateExpert(exp.username, { password: newPwd, updated_at: new Date().toISOString() });
    setJustCreated({ username: exp.username, password: newPwd, name: exp.name, reset: true });
    load();
  }

  async function handleDeleteExpert(exp) {
    try {
      await deleteExpert(exp.username);
      toast.add("تم حذف الخبير بنجاح", "success");
      load();
    } catch {
      toast.add("فشل حذف الخبير", "error");
    }
  }

  return (
    <div>
      {justCreated && (
        <div className="rounded-xl p-4 mb-4 text-sm"
             style={{ backgroundColor: hexToRgba(C_SUCCESS, 0.12), border:`1px solid ${hexToRgba(C_SUCCESS, 0.3)}` }}>
          <p className="font-bold mb-1" style={{ color: C_SUCCESS }}>
            {justCreated.reset ? "تم إعادة تعيين كلمة المرور" : "تم إنشاء الحساب"} ✅
          </p>
          <p className="font-mono text-sm mb-1" style={{ color: C_INK }}>
            المستخدم: {justCreated.username}
          </p>
          <p className="font-mono text-sm mb-2" style={{ color: C_INK }}>
            كلمة المرور: {justCreated.password}
          </p>
          <button onClick={() => setJustCreated(null)} className="text-xs underline" style={{ color:"#8A9188" }}>إغلاق</button>
        </div>
      )}

      {showAdd ? (
        <div className="bg-white rounded-2xl p-5 mb-4" style={{ border:`1px solid ${C_SAGE_LINE}` }}>
          <h3 className="font-bold mb-4" style={{ color: C_INK }}>إضافة خبير جديد</h3>
          <Field label="الاسم الكامل"><TextInput value={newName} onChange={e=>setNewName(e.target.value)} placeholder="محمد الأمين" /></Field>
          <Field label="اسم المستخدم"><TextInput value={newUsername} onChange={e=>setNewUser(e.target.value)} placeholder="m_amine" dir="ltr" /></Field>
          {createErr && <p className="text-base mb-3" style={{ color: C_CLAY }}>{createErr}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setShowAdd(false); setCreateErr(""); }}
                    className="flex-1 py-2.5 rounded-xl border font-semibold text-sm btn-interactive" style={{ borderColor: C_SAGE_LINE, color:"#8A9188" }}>
              إلغاء
            </button>
            <PrimaryButton onClick={handleCreate} disabled={creating} loading={creating} className="flex-1 py-2.5 text-sm">
              إنشاء الحساب
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold mb-4 btn-interactive"
                style={{ backgroundColor: C_INK_TEAL, color: C_PAPER }}>
          <Plus size={16} /> إضافة خبير جديد
        </button>
      )}

      {loading ? <p className="text-base" style={{ color:"#8A9188" }}>جارٍ التحميل...</p> :
       experts.length === 0 ? <p className="text-base" style={{ color:"#8A9188" }}>لا يوجد خبراء مسجّلون بعد</p> :
       <div className="space-y-3">
          {experts.map(exp => <ExpertRow key={exp.username} exp={exp} onToggle={handleToggle} onReset={handleReset} onDelete={handleDeleteExpert} />)}
       </div>}
    </div>
  );
}

function ExpertRow({ exp, onToggle, onReset, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  function copy(text) {
    navigator.clipboard?.writeText(text).catch(()=>{});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden card-interactive"
         style={{ border: `1px solid ${C_SAGE_LINE}`, transition: "all 0.2s ease" }}>
      {/* Collapsed: name + status */}
      <button onClick={() => setExpanded(e => !e)}
              className="w-full flex items-center justify-between p-4 text-right"
              style={{ background: "transparent", border: "none", cursor: "pointer" }}>
        <div className="flex items-center gap-2">
          <span className="font-bold" style={{ color: C_INK }}>{exp.name}</span>
          {exp.active === false && (
            <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: hexToRgba(C_CLAY, 0.12), color: C_CLAY }}>
              معطَّل
            </span>
          )}
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C_INK} strokeWidth="2.5"
             style={{ transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${hexToRgba(C_SAGE_LINE, 0.6)}` }}>
          <p className="text-xs font-mono mt-3 mb-3" style={{ color:"#8A9188" }} dir="ltr">
            المستخدم: {exp.username}
          </p>

          {(exp.ccp_number || exp.baridimob_number) && (
            <div className="rounded-lg p-2 mb-3" style={{ backgroundColor:"#F5F6F0" }}>
              <p className="text-xs font-bold mb-1" style={{ color: C_INK }}>وسيلة الدفع:</p>
              {exp.ccp_number && (
                <p className="text-xs font-mono" style={{ color:"#8A9188" }} dir="ltr">CCP: {exp.ccp_number}</p>
              )}
              {exp.baridimob_number && (
                <p className="text-xs font-mono" style={{ color:"#8A9188" }} dir="ltr">BaridiMob: {exp.baridimob_number}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <button onClick={() => setShowPass(s=>!s)} className="text-xs font-semibold" style={{ color: C_INK_TEAL }}>
              {showPass ? <><EyeOff size={12} className="inline ml-1"/>إخفاء</> : <><Eye size={12} className="inline ml-1"/>إظهار كلمة المرور</>}
            </button>
            {showPass && (
              <>
                <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor:"#F5F6F0", color: C_INK }} dir="ltr">
                  {exp.password}
                </span>
                <button onClick={() => copy(exp.password)} style={{ color: C_INK_TEAL }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => onToggle(exp)} className="flex-1 text-xs font-semibold py-2 rounded-lg border"
                    style={{ borderColor: C_SAGE_LINE, color:"#8A9188" }}>
              {exp.active !== false ? "تعطيل الحساب" : "تفعيل الحساب"}
            </button>
            <button onClick={() => onReset(exp)} className="flex-1 text-xs font-semibold py-2 rounded-lg border"
                    style={{ borderColor: C_SAGE_LINE, color:"#8A9188" }}>
              إعادة تعيين كلمة المرور
            </button>
          </div>
          <button onClick={() => setShowDelete(true)}
                  className="w-full text-xs font-semibold py-2 rounded-lg border mt-2"
                  style={{ borderColor: hexToRgba(C_CLAY, 0.3), color: C_CLAY }}>
            <Trash2 size={12} className="inline ml-1" /> حذف الخبير
          </button>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
            <h3 className="font-bold text-base mb-3" style={{ color: C_CLAY }}>حذف الخبير</h3>
            <p className="text-base mb-3" style={{ color: "#8A9188" }}>
              هل أنت متأكد من حذف الخبير <strong>{exp.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowDelete(false)}
                      className="flex-1 py-2.5 rounded-xl border font-semibold text-sm"
                      style={{ borderColor: C_SAGE_LINE, color: "#8A9188" }}>
                إلغاء
              </button>
              <PrimaryButton onClick={() => { setShowDelete(false); onDelete(exp); }}
                             className="flex-1 py-2.5 text-sm" style={{ backgroundColor: C_CLAY }}>
                نعم، حذف
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Settings =====
function SettingsForm() {
  const toast = useToast();
  const [url, setUrl]       = useState("");
  const [key, setKey]       = useState("");
  const [busy, setBusy]     = useState(false);
  const [result, setResult] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateLog, setMigrateLog] = useState([]);

  const [adminPayment, setAdminPayment] = useState(() => getAdminPaymentInfo());
  const [paymentSaved, setPaymentSaved] = useState(false);

  async function handleSave() {
    const cleanUrl = url.trim().replace(/\/+$/, "");
    const cleanKey = key.trim();
    if (!cleanUrl || !cleanKey) { setResult({ ok: false, message: "يرجى إدخال الرابط والمفتاح معًا" }); return; }
    setBusy(true); setResult(null);
    const test = await testSupabaseConnection(cleanUrl, cleanKey);
    localStorage.setItem("app-config:supabase", JSON.stringify({ url: cleanUrl, key: cleanKey }));
    setBusy(false);
    setResult(test.ok
      ? { ok: true, message: "تم الحفظ والاتصال بقاعدة البيانات ناجح ✅" }
      : { ok: false, message: `تم الحفظ، لكن اختبار الاتصال فشل: ${test.message}` });
  }

  async function handleMigrateToSupabase() {
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
    if (!supaUrl || !supaKey) {
      toast.add("متغيرات البيئة NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY غير محددة", "error");
      return;
    }

    setMigrating(true);
    setMigrateLog([]);
    const log = (msg) => setMigrateLog(prev => [...prev, msg]);

    // Collect all bookings from localStorage
    const bookings = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("booking:")) {
          try { bookings.push(JSON.parse(localStorage.getItem(k))); } catch {}
        }
      }
    } catch {}

    log(`📦 وجدت ${bookings.length} حجزاً في المتصفح (localStorage)`);

    let successCount = 0;
    let errorCount = 0;

    for (const booking of bookings) {
      try {
        const res = await fetch(`${supaUrl}/rest/v1/bookings`, {
          method: "POST",
          headers: {
            apikey: supaKey,
            Authorization: `Bearer ${supaKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal,resolution=ignore-duplicates",
          },
          body: JSON.stringify([booking]),
        });
        if (res.ok || res.status === 409) {
          successCount++;
          log(`✅ ${booking.code} — ${booking.institution_name}`);
        } else {
          const txt = await res.text().catch(() => "");
          errorCount++;
          log(`❌ ${booking.code} — خطأ ${res.status}: ${txt.substring(0, 80)}`);
        }
      } catch (e) {
        errorCount++;
        log(`❌ ${booking.code} — ${e.message}`);
      }
    }

    log(`\n🏁 انتهى: ${successCount} نجح، ${errorCount} فشل`);
    if (successCount > 0) {
      toast.add(`تم ترحيل ${successCount} حجزاً إلى Supabase بنجاح!`, "success");
    }
    setMigrating(false);
  }

  function handlePaymentSave() {
    saveAdminPaymentInfo(adminPayment);
    setPaymentSaved(true);
    toast.add("تم حفظ أرقام الحسابات بنجاح", "success");
    setTimeout(() => setPaymentSaved(false), 2000);
  }

  return (
    <div className="max-w-md">
      <div className="bg-white rounded-2xl p-5 mb-5" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={18} color={C_OCHRE} />
          <h3 className="font-bold text-base" style={{ color: C_INK }}>أرقام حسابات الإدارة للدفع</h3>
        </div>
        <p className="text-base mb-4" style={{ color: "#8A9188" }}>
          هذه الأرقام تظهر للخبراء عند التسجيل لدفع رسوم التسجيل.
        </p>

        <Field label="الاسم على الحساب (CCP)">
          <TextInput value={adminPayment.ccp_name} dir="ltr"
                     onChange={e => setAdminPayment(p => ({ ...p, ccp_name: e.target.value }))} placeholder="BELHOCINE NAWEL" />
        </Field>
        <Field label="رقم الحساب CCP">
          <TextInput value={adminPayment.ccp_number} dir="ltr"
                     onChange={e => setAdminPayment(p => ({ ...p, ccp_number: e.target.value }))} placeholder="1620661515" />
        </Field>
        <Field label="الاسم على بريد موب (BaridiMob)">
          <TextInput value={adminPayment.baridimob_name} dir="ltr"
                     onChange={e => setAdminPayment(p => ({ ...p, baridimob_name: e.target.value }))} placeholder="BELHOCINE NAWEL" />
        </Field>
        <Field label="رقم بريد موب (BaridiMob)">
          <TextInput value={adminPayment.baridimob_number} dir="ltr"
                     onChange={e => setAdminPayment(p => ({ ...p, baridimob_number: e.target.value }))} placeholder="079999002206615182" />
        </Field>

        <PrimaryButton onClick={handlePaymentSave} className="w-full py-3">
          {paymentSaved ? "✓ تم الحفظ" : "حفظ أرقام الحسابات"}
        </PrimaryButton>
      </div>

      <div className="bg-white rounded-2xl p-5" style={{ border: `1px solid ${C_SAGE_LINE}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Database size={18} color={C_INK_TEAL} />
          <h3 className="font-bold text-base" style={{ color: C_INK }}>اتصال قاعدة البيانات</h3>
        </div>
        <p className="text-base mb-4" style={{ color:"#8A9188" }}>
          أدخل بيانات مشروعك على Supabase لتفعيل التخزين السحابي الحقيقي لحفظ الحجوزات وملفات الإثبات.
        </p>
        <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: hexToRgba(C_INK_TEAL, 0.06), border: `1px solid ${hexToRgba(C_INK_TEAL, 0.15)}` }}>
          <p className="text-xs" style={{ color: C_INK_TEAL }}>
            <strong>ماذا يُفعّل؟</strong> حفظ الحجوزات والملفات في السحابة بدلاً من متصفحك فقط.
          </p>
        </div>
        <Field label="رابط المشروع (Project URL)">
          <TextInput value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://xxxxx.supabase.co" dir="ltr" />
        </Field>
        <Field label="المفتاح العام (anon public key)">
          <textarea value={key} onChange={e=>setKey(e.target.value)} placeholder="eyJhbGciOi..."
                    dir="ltr" rows={3}
                    className="w-full rounded-xl border px-4 py-3 text-sm font-mono resize-none outline-none focus:ring-2"
                    style={{ borderColor: C_SAGE_LINE, color: C_INK }} />
        </Field>
        {result && (
          <div className="rounded-xl p-3 mb-4 text-sm"
               style={{ backgroundColor: hexToRgba(result.ok ? C_SUCCESS : C_CLAY, 0.12),
                        color: result.ok ? C_SUCCESS : C_CLAY }}>
            {result.message}
          </div>
        )}
        <PrimaryButton onClick={handleSave} disabled={busy} loading={busy} className="w-full py-3">
          حفظ واختبار الاتصال
        </PrimaryButton>
      </div>

      {/* ─── Data Migration Card ─── */}
      <div className="bg-white rounded-2xl p-5 mt-5" style={{ border: `1px solid ${hexToRgba(C_OCHRE, 0.5)}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Database size={18} color={C_OCHRE} />
          <h3 className="font-bold text-base" style={{ color: C_INK }}>ترحيل البيانات المحلية إلى Supabase</h3>
        </div>
        <p className="text-sm mb-3" style={{ color: "#8A9188" }}>
          إذا كانت لديك حجوزات محفوظة في المتصفح (localStorage) قبل ربط Supabase، استخدم هذا الزر لرفعها إلى قاعدة البيانات السحابية دفعةً واحدة. العملية آمنة ولا تُكرر الحجوزات الموجودة مسبقاً.
        </p>

        {migrateLog.length > 0 && (
          <div className="rounded-xl p-3 mb-4 font-mono text-xs overflow-y-auto max-h-48 space-y-1 text-right"
               style={{ backgroundColor: "#F5F6F0", border: `1px solid ${C_SAGE_LINE}` }}
               dir="ltr">
            {migrateLog.map((line, i) => (
              <div key={i} className={
                line.startsWith("✅") ? "text-green-700" :
                line.startsWith("❌") ? "text-red-600" :
                line.startsWith("🏁") ? "font-bold text-[#0F3D3E]" :
                "text-gray-500"
              }>{line}</div>
            ))}
          </div>
        )}

        <PrimaryButton
          onClick={handleMigrateToSupabase}
          disabled={migrating}
          loading={migrating}
          className="w-full py-3"
          style={{ backgroundColor: C_OCHRE }}
        >
          {migrating ? "جاري الترحيل..." : "ترحيل الحجوزات من المتصفح → Supabase"}
        </PrimaryButton>
      </div>
    </div>
  );
}
