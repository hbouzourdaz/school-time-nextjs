"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Calendar, DoorOpen, Users, FileText, ClipboardList,
  Upload, Trash2, Plus, AlertCircle, CheckCircle2,
} from "lucide-react";
import {
  C_INK, C_INK_TEAL, C_PAPER, C_SAGE_LINE, C_OCHRE, C_CLAY, C_SUCCESS,
  C_OCHRE_DARK, hexToRgba, FONT_STACK, PRICE_PER_SECTION, ROTATING_SECTIONS_FEE,
  LEVEL_MIDDLE, LEVEL_SECONDARY,
  DAYS_PATTERN_SUN_THU, DAYS_PATTERN_SAT_THU, DAYS_PATTERN_LABELS,
  MIDDLE_LEVELS, SECONDARY_STRUCTURE,
  WILAYAS, DEFAULT_SUBJECTS,
  createEmptyForm, generateId, seedTeachers, getSectionRows, groupSectionRows,
  computeTotalSections, computeTotalPrice, computeRotatingFee,
  buildBookingRecord, formatDZD, fileToBase64, compressImage,
} from "@/lib/utils";
import { getAllExperts } from "@/lib/experts";
import { saveBooking } from "@/lib/bookings";
import { isSupabaseConfigured, uploadToSupabaseStorage } from "@/lib/supabase";
import {
  TextInput, TextArea, Select, PrimaryButton, Field, Card, Modal,
} from "@/components/ui";

function NumberInput({ className = "", ...props }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      {...props}
      className={`rounded-xl border px-3 py-3 text-center text-base focus:outline-none focus:ring-2 ${className || "w-full"}`}
      style={{ borderColor: "#DCE2D6", color: "#0F3D3E", "--tw-ring-color": "rgba(15,61,62,0.3)" }}
    />
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b py-2.5 gap-3" style={{ borderColor: "#EDEFE9" }}>
      <span className="text-base flex-shrink-0" style={{ color: "#8A9188" }}>{label}</span>
      <span className="font-semibold text-base text-left" style={{ color: "#0F3D3E" }}>{value || "—"}</span>
    </div>
  );
}

function FileOrLinkInput({ label, accept, value, onChange, prefix }) {
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
        const url = await uploadToSupabaseStorage(file, prefix);
        onChange({ name: file.name, url });
        return;
      }
      const MAX = 2 * 1024 * 1024;
      if (file.size > MAX) {
        setError("الملف كبير جداً للتخزين المحلي (الحد 2 ميجابايت) — الصق رابطاً بدلاً من ذلك، أو فعّل Supabase.");
        return;
      }
      const dataUrl = file.type.startsWith("image/") ? await compressImage(file) : await fileToBase64(file);
      onChange({ name: file.name, url: dataUrl });
    } catch (err) {
      setError("فشل رفع الملف، حاول مرة أخرى");
    } finally {
      setUploading(false);
    }
  }

  function submitLink() {
    if (linkValue.trim()) {
      onChange({ name: linkValue.trim(), url: linkValue.trim() });
      setLinkMode(false);
      setLinkValue("");
    }
  }

  return (
    <div className="mb-4">
      <label className="block text-base font-bold mb-2" style={{ color: "#0F3D3E" }}>{label}</label>
      {value ? (
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
             style={{ backgroundColor: "#F5F6F0", border: `1px solid #DCE2D6` }}>
          <span className="text-base truncate flex-1" style={{ color: "#0F3D3E" }}>{value.name}</span>
          <button type="button" onClick={() => onChange(null)} className="mr-2 flex-shrink-0" style={{ color: "#B5533C" }}>
            <Trash2 size={16} />
          </button>
        </div>
      ) : linkMode ? (
        <div className="flex gap-2">
          <input value={linkValue} onChange={(e) => setLinkValue(e.target.value)}
                 placeholder="https://..." className="flex-1 rounded-xl border px-4 py-3 text-base"
                 style={{ borderColor: "#DCE2D6" }} />
          <PrimaryButton onClick={submitLink} className="px-4 text-base">إضافة</PrimaryButton>
        </div>
      ) : (
        <div className="flex gap-2">
          <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-3.5 cursor-pointer text-base"
                 style={{ borderColor: "#DCE2D6", color: "#8A9188" }}>
            <Upload size={16} /> {uploading ? "جارٍ الرفع..." : "اختر ملفاً"}
            <input type="file" accept={accept} onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
          <button type="button" onClick={() => setLinkMode(true)}
                  className="text-base px-4 whitespace-nowrap font-semibold rounded-xl border"
                  style={{ borderColor: "#DCE2D6", color: "#8A9188" }}>
            رابط
          </button>
        </div>
      )}
      {error && <p className="text-base mt-1.5 flex items-center gap-1.5" style={{ color: "#B5533C" }}><AlertCircle size={14} /> {error}</p>}
    </div>
  );
}

export default function BookingFormPage() {
  const router = useRouter();
  const [form, setForm] = useState(createEmptyForm);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [experts, setExperts] = useState([]);
  const [expertsLoading, setExpertsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setExpertsLoading(true);
      try {
        const data = await getAllExperts();
        setExperts(data.filter((e) => e.active !== false));
      } finally {
        setExpertsLoading(false);
      }
    })();
  }, []);

  const totalSections = useMemo(() => computeTotalSections(form), [form]);
  const totalPrice = useMemo(() => computeTotalPrice(form), [form]);

  const canSubmit = Boolean(
    form.level && form.applicantName.trim() && form.phone.trim() &&
    form.institutionName.trim() && form.wilaya && form.expertUsername &&
    form.daysPattern && form.morningPeriods && form.afternoonPeriods && totalSections > 0
  );

  const update = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  function handleSelectLevel(newLevel) {
    setForm((prev) => {
      if (prev.level === newLevel) return prev;
      return {
        ...prev,
        level: newLevel,
        sectionsBreakdown: {},
        teachersBreakdown: prev.teachersBreakdown.length === 0 ? seedTeachers(newLevel) : prev.teachersBreakdown,
      };
    });
  }

  function updateSectionCount(key, value) {
    setForm((prev) => ({ ...prev, sectionsBreakdown: { ...prev.sectionsBreakdown, [key]: value } }));
  }

  function updateTeacherSubject(id, value) {
    setForm((prev) => ({
      ...prev,
      teachersBreakdown: prev.teachersBreakdown.map((t) => t.id === id ? { ...t, subject: value } : t),
    }));
  }

  function updateTeacherCount(id, value) {
    setForm((prev) => ({
      ...prev,
      teachersBreakdown: prev.teachersBreakdown.map((t) => t.id === id ? { ...t, count: value } : t),
    }));
  }

  function addTeacherRow() {
    setForm((prev) => ({
      ...prev,
      teachersBreakdown: [...prev.teachersBreakdown, { id: generateId(), subject: "", count: "" }],
    }));
  }

  function removeTeacherRow(id) {
    setForm((prev) => ({
      ...prev,
      teachersBreakdown: prev.teachersBreakdown.filter((t) => t.id !== id),
    }));
  }

  async function handleConfirmBooking() {
    setSubmitting(true);
    try {
      const code = `BK-${Math.floor(1e5 + Math.random() * 9e5)}`;
      const pin = String(Math.floor(1e3 + Math.random() * 9e3));
      const record = buildBookingRecord(form, code, pin);
      const chosenExpert = experts.find((e) => e.username === form.expertUsername);
      record.expert_name = chosenExpert ? chosenExpert.name : "";
      await saveBooking(record);
      sessionStorage.setItem("lastBooking", JSON.stringify({ code, pin }));
      router.push("/confirmed");
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء إنشاء الحجز، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  }

  function ToggleButton({ active, onClick, children }) {
    return (
      <button type="button" onClick={onClick}
              className="flex-1 py-3.5 rounded-xl border-2 font-bold text-base transition-all"
              style={active
                ? { borderColor: "#0F3D3E", backgroundColor: "rgba(15,61,62,0.08)", color: "#0F3D3E" }
                : { borderColor: "#DCE2D6", color: "#8A9188" }}>
        {children}
      </button>
    );
  }

  return (
    <div className="pb-28 max-w-2xl mx-auto px-5 pt-10"
         style={{ backgroundColor: "#F5F6F0", minHeight: "100vh" }}>
      <button onClick={() => router.push("/")} className="text-base mb-5 flex items-center gap-1"
              style={{ color: "#8A9188" }}>
        ← الرئيسية
      </button>
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "#0F3D3E" }}>استمارة حجز إنجاز التوقيت</h1>
      <p className="text-base mb-8" style={{ color: "#8A9188" }}>أكمل جميع البيانات التالية لإنشاء جدول مؤسستك</p>

      {/* Card 1: Institution */}
      <Card icon={Building2} title="معلومات المؤسسة وصاحب الطلب" number="1">
        <Field label="الطور">
          <div className="flex gap-3">
            <ToggleButton active={form.level === LEVEL_MIDDLE} onClick={() => handleSelectLevel(LEVEL_MIDDLE)}>
              متوسط
            </ToggleButton>
            <ToggleButton active={form.level === LEVEL_SECONDARY} onClick={() => handleSelectLevel(LEVEL_SECONDARY)}>
              ثانوي
            </ToggleButton>
          </div>
        </Field>
        <Field label="اسم صاحب الطلب">
          <TextInput value={form.applicantName} onChange={(e) => update("applicantName", e.target.value)} placeholder="الاسم واللقب" />
        </Field>
        <Field label="الهاتف">
          <TextInput type="tel" inputMode="tel" dir="ltr" className="text-left"
                     value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="0555 12 34 56" />
        </Field>
        <Field label="البريد الإلكتروني">
          <TextInput type="email" dir="ltr" className="text-left"
                     value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="example@email.com" />
        </Field>
        <Field label="اسم المؤسسة">
          <TextInput value={form.institutionName} onChange={(e) => update("institutionName", e.target.value)} placeholder="مثال: متوسطة ابن خلدون" />
        </Field>
        <Field label="الولاية">
          <Select value={form.wilaya} onChange={(e) => update("wilaya", e.target.value)}>
            <option value="">اختر الولاية</option>
            {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
          </Select>
        </Field>
        <Field label="البلدية">
          <TextInput value={form.municipality} onChange={(e) => update("municipality", e.target.value)} placeholder="البلدية" />
        </Field>
      </Card>

      {/* Card 2: Expert */}
      <Card icon={Users} title="الخبير المسؤول" subtitle="اختر الخبير الذي سينفذ جدولك" number="2">
        {expertsLoading ? (
          <p className="text-base" style={{ color: "#8A9188" }}>جارٍ تحميل قائمة الخبراء...</p>
        ) : experts.length === 0 ? (
          <p className="text-base" style={{ color: "#8A9188" }}>لا يوجد خبراء متاحون بعد</p>
        ) : (
          <div className="space-y-3">
            {experts.map((exp) => (
              <button key={exp.username} type="button" onClick={() => update("expertUsername", exp.username)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border-2 text-right transition-all"
                      style={form.expertUsername === exp.username
                        ? { borderColor: "#0F3D3E", backgroundColor: "rgba(15,61,62,0.08)" }
                        : { borderColor: "#DCE2D6" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                     style={{ backgroundColor: "rgba(15,61,62,0.12)", color: "#0F3D3E" }}>
                  {exp.name.trim().charAt(0)}
                </div>
                <span className="font-bold text-base flex-1" style={{ color: "#0F3D3E" }}>{exp.name}</span>
                {form.expertUsername === exp.username && <CheckCircle2 size={18} color="#0F3D3E" />}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Card 3: Schedule */}
      <Card icon={Calendar} title="توقيت العمل" subtitle="أيام الدارسة وعدد الحصص لكل فترة" number="3">
        <Field label="أيام الدارسة">
          <div className="flex gap-3">
            <ToggleButton active={form.daysPattern === DAYS_PATTERN_SUN_THU} onClick={() => update("daysPattern", DAYS_PATTERN_SUN_THU)}>
              من الأحد إلى الخميس
            </ToggleButton>
            <ToggleButton active={form.daysPattern === DAYS_PATTERN_SAT_THU} onClick={() => update("daysPattern", DAYS_PATTERN_SAT_THU)}>
              من السبت إلى الخميس
            </ToggleButton>
          </div>
        </Field>
        <Field label="عدد حصص الفترة الصباحية">
          <div className="flex gap-3">
            {["4", "5"].map((n) => (
              <ToggleButton key={n} active={form.morningPeriods === n} onClick={() => update("morningPeriods", n)}>
                {n} حصة
              </ToggleButton>
            ))}
          </div>
        </Field>
        <Field label="عدد حصص الفترة المسائية">
          <div className="flex gap-3">
            {["4", "5"].map((n) => (
              <ToggleButton key={n} active={form.afternoonPeriods === n} onClick={() => update("afternoonPeriods", n)}>
                {n} حصة
              </ToggleButton>
            ))}
          </div>
        </Field>
        <Field label="بداية الفترة المسائية">
          <input type="time" value={form.afternoonStartTime}
                 onChange={(e) => update("afternoonStartTime", e.target.value)}
                 className="w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:ring-2"
                 style={{ borderColor: "#DCE2D6", color: "#0F3D3E", "--tw-ring-color": "rgba(15,61,62,0.3)" }} />
        </Field>
      </Card>

      {/* Card 4: Rooms */}
      <Card icon={DoorOpen} title="المرافق" number="4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="عدد الحجرات">
            <NumberInput min="0" value={form.numRooms} onChange={(e) => update("numRooms", e.target.value)} />
          </Field>
          <Field label="عدد المختبرات">
            <NumberInput min="0" value={form.numLabs} onChange={(e) => update("numLabs", e.target.value)} />
          </Field>
          <Field label="عدد الورشات">
            <NumberInput min="0" value={form.numWorkshops} onChange={(e) => update("numWorkshops", e.target.value)} />
          </Field>
          <Field label="قاعات الإعلام الآلي">
            <NumberInput min="0" value={form.numComputerRooms} onChange={(e) => update("numComputerRooms", e.target.value)} />
          </Field>
          <Field label="عدد الملاعب">
            <NumberInput min="0" value={form.numPlaygrounds} onChange={(e) => update("numPlaygrounds", e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* Card 5: Sections */}
      <Card icon={Users} title="الأقسام والاستاذة" subtitle="أدخل البيانات يدوياً أو إرفق صورة الخريطة" number="5">
        <Field label="طريقة إدخال الأقسام">
          <div className="flex gap-3">
            <ToggleButton active={form.sectionsMode === "manual"} onClick={() => update("sectionsMode", "manual")}>
              إدخال يدوي
            </ToggleButton>
            <ToggleButton active={form.sectionsMode === "map"} onClick={() => update("sectionsMode", "map")}>
              إرفاق الخريطة المرتبة
            </ToggleButton>
          </div>
        </Field>

        {form.sectionsMode === "manual" ? (
          !form.level ? (
            <p className="text-base rounded-xl p-4"
               style={{ backgroundColor: "rgba(198,138,46,0.12)", color: "#96691F" }}>
              يُرجى اختيار الطور أولاً
            </p>
          ) : (
            <>
              <p className="font-bold text-base mb-3" style={{ color: "#0F3D3E" }}>
                عدد الأقسام {form.level === LEVEL_SECONDARY ? "حسب المستويات والشعب" : "حسب المستويات"}
              </p>
              {form.level === LEVEL_MIDDLE ? (
                <div className="divide-y mb-4" style={{ borderColor: "#EDEFE9" }}>
                  {getSectionRows(form.level).map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-3 py-3">
                      <span className="text-base" style={{ color: "#0F3D3E" }}>{row.label}</span>
                      <NumberInput className="w-24" min="0" value={form.sectionsBreakdown[row.key] || ""}
                                   onChange={(e) => updateSectionCount(row.key, e.target.value)} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4">
                  {groupSectionRows(getSectionRows(form.level)).map(({ group, rows }) => (
                    <div key={group} className="mb-4">
                      <p className="text-base font-bold mb-2" style={{ color: "#0F3D3E" }}>{group}</p>
                      <div className="divide-y" style={{ borderColor: "#EDEFE9" }}>
                        {rows.map((row) => (
                          <div key={row.key} className="flex items-center justify-between gap-3 py-3">
                            <span className="text-base flex-1" style={{ color: "#0F3D3E" }}>{row.label}</span>
                            <NumberInput className="w-24" min="0" value={form.sectionsBreakdown[row.key] || ""}
                                         onChange={(e) => updateSectionCount(row.key, e.target.value)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        ) : (
          <>
            <FileOrLinkInput label="صورة الخريطة المرتبة" accept="image/*"
                             value={form.mapImage} onChange={(v) => update("mapImage", v)} prefix="maps" />
            <Field label="إجمالي عدد الأقسام">
              <NumberInput min="0" value={form.mapTotalSections}
                           onChange={(e) => update("mapTotalSections", e.target.value)} />
            </Field>
          </>
        )}

        <p className="text-base font-bold mt-4" style={{ color: "#0F3D3E" }}>
          إجمالي الأقسام: <span style={{ color: "#0F3D3E" }}>{totalSections}</span>
        </p>
      </Card>

      {/* Card 6: Rotating */}
      <Card icon={ClipboardList} title="الأقسام الدوّرة" number="6">
        <Field label="هل يوجد أقسام دوّرة؟">
          <div className="flex gap-3">
            <ToggleButton active={form.hasRotatingSections === true} onClick={() => update("hasRotatingSections", true)}>
              نعم
            </ToggleButton>
            <ToggleButton active={form.hasRotatingSections === false} onClick={() => update("hasRotatingSections", false)}>
              لا
            </ToggleButton>
          </div>
        </Field>
        {form.hasRotatingSections && (
          <>
            <Field label="أسماء الأقسام الدوّرة" hint="اكتب اسم كل قسم في سطر منفصل">
              <TextArea value={form.rotatingSectionsNames}
                        onChange={(e) => update("rotatingSectionsNames", e.target.value)}
                        placeholder={"مثال:\nالسنة الثالثة متوسط 3\nالسنة الرابعة متوسط 1"} />
            </Field>
            <p className="text-base rounded-xl p-4"
               style={{ backgroundColor: "rgba(198,138,46,0.1)", color: "#96691F" }}>
              سيُضاف {formatDZD(ROTATING_SECTIONS_FEE)} إلى التكلفة النهائية بسبب وجود أقسام دوّرة
            </p>
          </>
        )}
      </Card>

      {/* Card 7: Assignment */}
      <Card icon={FileText} title="الإسناد المرتب" subtitle="صورة أو PDF أو ملف إكسل" number="7">
        <FileOrLinkInput label="ملف الإسناد المرتب" accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
                         value={form.assignmentFile} onChange={(v) => update("assignmentFile", v)} prefix="assignments" />
      </Card>

      {/* Card 8: Teachers */}
      <Card icon={ClipboardList} title="ملاحظات المعلمين" number="8">
        <Field label="المعلمون والاستاذة" hint="أدخل بيانات يدوياً أو إرفق صورة الخريطة المرتبة أعلى">
          {form.teachersBreakdown.map((t) => (
            <div key={t.id} className="flex items-center gap-2 mb-3">
              <select value={t.subject} onChange={(e) => updateTeacherSubject(t.id, e.target.value)}
                      className="flex-1 rounded-xl border px-3 py-3 text-base bg-white"
                      style={{ borderColor: "#DCE2D6", color: "#0F3D3E" }}>
                <option value="">المادة...</option>
                {(DEFAULT_SUBJECTS[form.level] || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <NumberInput className="w-20" min="0" value={t.count}
                           onChange={(e) => updateTeacherCount(t.id, e.target.value)} placeholder="عدد" />
              <button type="button" onClick={() => removeTeacherRow(t.id)} style={{ color: "#B5533C" }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addTeacherRow}
                  className="flex items-center gap-1.5 text-base font-bold mt-2"
                  style={{ color: "#0F3D3E" }}>
            <Plus size={16} /> إضافة مادة
          </button>
        </Field>
      </Card>

      {/* Card 9: Notes */}
      <Card icon={FileText} title="ملاحظات إضافية" number="9">
        <Field label="ملاحظات العمل الموجّه">
          <TextArea value={form.notesGuidedWork} onChange={(e) => update("notesGuidedWork", e.target.value)}
                    placeholder="أضف ملاحظات..." />
        </Field>
        <Field label="ملاحظات التكملة والتثقيف">
          <TextArea value={form.notesCatchUpTech} onChange={(e) => update("notesCatchUpTech", e.target.value)}
                    placeholder="أضف ملاحظات..." />
        </Field>
        <Field label="ملاحظات عامة">
          <TextArea value={form.notesGeneral} onChange={(e) => update("notesGeneral", e.target.value)}
                    placeholder="أضف ملاحظات..." />
        </Field>
      </Card>

      {/* Price + Submit */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white px-5 py-3 border-t flex items-center gap-4"
           style={{ borderColor: "#F59E0B", boxShadow: "0 -4px 24px rgba(198,138,46,0.18)" }}>
        <div className="flex-shrink-0">
          <p className="text-xl font-extrabold leading-tight" style={{ color: "#0F3D3E" }}>{formatDZD(totalPrice)}</p>
          <p className="text-xs" style={{ color: "#8A9188" }}>{totalSections} قسم</p>
        </div>
        <PrimaryButton onClick={() => setReviewOpen(true)} disabled={!canSubmit || submitting}
                       className="ml-auto px-6 py-3 text-base whitespace-nowrap">
          مراجعة وإرسال الطلب
        </PrimaryButton>
      </div>

      {/* Review Modal */}
      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="مراجعة الطلب">
        <div className="space-y-1 mb-5">
          <SummaryRow label="المؤسسة" value={form.institutionName} />
          <SummaryRow label="صاحب الطلب" value={form.applicantName} />
          <SummaryRow label="الهاتف" value={form.phone} />
          <SummaryRow label="البريد" value={form.email} />
          <SummaryRow label="الولاية" value={form.wilaya} />
          <SummaryRow label="البلدية" value={form.municipality} />
          <SummaryRow label="الطور" value={form.level} />
          <SummaryRow label="الخبير" value={experts.find((e) => e.username === form.expertUsername)?.name || form.expertUsername} />
          <SummaryRow label="أيام الدارسة" value={DAYS_PATTERN_LABELS[form.daysPattern] || form.daysPattern} />
          <SummaryRow label="الحصص الصباحية" value={`${form.morningPeriods} حصة`} />
          <SummaryRow label="الحصص المسائية" value={`${form.afternoonPeriods} حصة`} />
          <SummaryRow label="بداية المسائية" value={form.afternoonStartTime} />
          <SummaryRow label="عدد الأقسام" value={totalSections} />
          {form.hasRotatingSections && <SummaryRow label="الأقسام الدوّرة" value="نعم" />}
          <SummaryRow label="الإجمالي" value={<span className="font-extrabold text-xl">{formatDZD(totalPrice)}</span>} />
        </div>
        <PrimaryButton onClick={handleConfirmBooking} disabled={submitting} className="w-full py-4 text-lg">
          {submitting ? "جارٍ الحفظ..." : "تأكيد الحجز"}
        </PrimaryButton>
      </Modal>
    </div>
  );
}
