"use client";
import { useState, useRef } from "react";
import {
  Printer, Download, Save, CheckCircle2, Users, GraduationCap,
  Layers, Eye, FileText, ArrowRight, Share2, Sparkles, ZoomIn,
  ZoomOut, Palette, Check, Building2
} from "lucide-react";

/* ═══════════════════════════════════════════════════
   Harmonious Educational Subject Color Palettes
   ═══════════════════════════════════════════════════ */
const COLOR_PALETTE = [
  { bg: "#EBF5FB", border: "#2980B9", text: "#1A5276", badge: "#D4E6F1" }, // Blue
  { bg: "#EAFAF1", border: "#27AE60", text: "#196F3D", badge: "#D5F5E3" }, // Green
  { bg: "#FEF9E7", border: "#F39C12", text: "#9A7D0A", badge: "#FCF3CF" }, // Amber
  { bg: "#F4ECF7", border: "#8E44AD", text: "#5B2C6F", badge: "#E8DAEF" }, // Purple
  { bg: "#FDEDEC", border: "#E74C3C", text: "#922B21", badge: "#FADBD8" }, // Red
  { bg: "#E8F8F5", border: "#1ABC9C", text: "#117864", badge: "#D1F2EB" }, // Teal
  { bg: "#FBEEE6", border: "#E67E22", text: "#A04000", badge: "#F6DDCC" }, // Orange
  { bg: "#EAECEE", border: "#34495E", text: "#212F3D", badge: "#D5D8DC" }, // Navy / Slate
  { bg: "#F5EEF8", border: "#9B59B6", text: "#6C3483", badge: "#EBDEF0" }, // Violet
  { bg: "#E8F6F3", border: "#16A085", text: "#0E6655", badge: "#D0ECE7" }, // Emerald
];

function getSubjectColor(subject, allSubjects, isMonochrome = false) {
  if (isMonochrome) {
    return { bg: "#FFFFFF", border: "#000000", text: "#000000", badge: "#F0F0F0" };
  }
  const idx = allSubjects.indexOf(subject);
  return COLOR_PALETTE[idx >= 0 ? idx % COLOR_PALETTE.length : 0];
}

export default function FetPrintableTimetable({
  timetable = [],
  model,
  booking,
  resultFetContent,
  onSaveToBooking,
  onBack
}) {
  const [activeTab, setActiveTab] = useState("sections"); // "sections" | "teachers" | "master"
  const [selectedSection, setSelectedSection] = useState(
    model.sections?.[0]?.name || model.sections?.[0] || ""
  );
  const [selectedTeacher, setSelectedTeacher] = useState(
    model.teachers?.[0]?.name || model.teachers?.[0] || ""
  );
  const [printAllMode, setPrintAllMode] = useState(false);
  const [isMonochrome, setIsMonochrome] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const days = model.days || ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const hours = model.hours || [];
  const allSubjects = (model.subjects || []).map((s) => (typeof s === "string" ? s : s.name));
  const institutionName = model.institution || booking?.institution_name || "المؤسسة التعليمية";
  const wilaya = booking?.wilaya || "الجزائر";
  const currentYear = new Date().getFullYear();
  const schoolYear = `${currentYear} / ${currentYear + 1}`;

  // Execute standard print
  const handlePrint = (printAll = false) => {
    setPrintAllMode(printAll);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Download raw .fet file
  const handleDownloadFet = () => {
    if (!resultFetContent) return;
    const blob = new Blob([resultFetContent], { type: "text/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${institutionName.replace(/\s+/g, "_")}_جدول_الحصص.fet`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save to booking final_files
  const handleSave = async () => {
    if (!onSaveToBooking) return;
    setSaving(true);
    try {
      await onSaveToBooking({
        resultFetContent,
        timetable,
        model
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5" style={{ direction: "rtl" }}>
      {/* ── Control Action Toolbar (Hidden during Print) ── */}
      <div className="bg-white p-4 rounded-2xl border border-[#DCE2D6] shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        {/* Left: View Tabs */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex rounded-xl overflow-hidden border border-[#DCE2D6] bg-[#F5F6F0] p-1 shadow-2xs">
            <button
              onClick={() => { setActiveTab("sections"); setPrintAllMode(false); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                activeTab === "sections"
                  ? "bg-[#0F3D3E] text-white shadow-xs"
                  : "text-[#0F3D3E] hover:bg-white/60"
              }`}
            >
              <GraduationCap size={15} />
              جداول الأقسام ({model.sections?.length || 0})
            </button>
            <button
              onClick={() => { setActiveTab("teachers"); setPrintAllMode(false); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                activeTab === "teachers"
                  ? "bg-[#0F3D3E] text-white shadow-xs"
                  : "text-[#0F3D3E] hover:bg-white/60"
              }`}
            >
              <Users size={15} />
              جداول الأساتذة ({model.teachers?.length || 0})
            </button>
            <button
              onClick={() => { setActiveTab("master"); setPrintAllMode(false); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                activeTab === "master"
                  ? "bg-[#0F3D3E] text-white shadow-xs"
                  : "text-[#0F3D3E] hover:bg-white/60"
              }`}
            >
              <Layers size={15} />
              الجدول العام المجمع
            </button>
          </div>

          {/* Section Selector */}
          {activeTab === "sections" && !printAllMode && (
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3.5 py-2 text-xs rounded-xl border border-[#DCE2D6] bg-white font-extrabold text-[#0F3D3E] focus:outline-none focus:ring-2 focus:ring-[#0F3D3E] shadow-2xs"
            >
              {model.sections?.map((sec, i) => {
                const name = typeof sec === "string" ? sec : sec.name;
                return <option key={i} value={name}>فوج: {name}</option>;
              })}
            </select>
          )}

          {/* Teacher Selector */}
          {activeTab === "teachers" && !printAllMode && (
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="px-3.5 py-2 text-xs rounded-xl border border-[#DCE2D6] bg-white font-extrabold text-[#0F3D3E] focus:outline-none focus:ring-2 focus:ring-[#0F3D3E] shadow-2xs"
            >
              {model.teachers?.map((t, i) => {
                const name = typeof t === "string" ? t : t.name;
                return <option key={i} value={name}>الأستاذ: {name}</option>;
              })}
            </select>
          )}
        </div>

        {/* Right: Print, Display & Save Tools */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom & Color toggles */}
          <div className="flex items-center gap-1 bg-[#F5F6F0] p-1 rounded-xl border border-[#DCE2D6]">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(75, prev - 10))}
              className="p-1.5 rounded-lg text-[#0F3D3E] hover:bg-white transition-colors"
              title="تصغير الجدول"
            >
              <ZoomOut size={15} />
            </button>
            <span className="text-[11px] font-mono font-bold px-1 text-[#0F3D3E]">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(130, prev + 10))}
              className="p-1.5 rounded-lg text-[#0F3D3E] hover:bg-white transition-colors"
              title="تكبير الجدول"
            >
              <ZoomIn size={15} />
            </button>
            <div className="w-px h-4 bg-[#DCE2D6] mx-1" />
            <button
              onClick={() => setIsMonochrome(!isMonochrome)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                isMonochrome
                  ? "bg-black text-white"
                  : "text-[#0F3D3E] hover:bg-white"
              }`}
              title="تبديل نمط الألوان للطباعة"
            >
              <Palette size={13} />
              {isMonochrome ? "أبيض وأسود" : "ملون"}
            </button>
          </div>

          {/* Print Single Current Table */}
          <button
            onClick={() => handlePrint(false)}
            className="bg-[#0F3D3E] hover:bg-[#175253] text-white px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Printer size={15} />
            طباعة هذا الجدول (PDF)
          </button>

          {/* Print All in Bulk */}
          {activeTab !== "master" && (
            <button
              onClick={() => handlePrint(true)}
              className="border border-[#0F3D3E] text-[#0F3D3E] bg-white hover:bg-[#0F3D3E] hover:text-white px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Printer size={15} />
              {activeTab === "sections" ? "طباعة كل الأقسام" : "طباعة كل الأساتذة"}
            </button>
          )}

          {/* Download .fet */}
          {resultFetContent && (
            <button
              onClick={handleDownloadFet}
              className="border border-[#DCE2D6] bg-white hover:border-[#0F3D3E] text-[#0F3D3E] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              title="تحميل ملف FET الأصلي مع الجدول الزمني"
            >
              <Download size={14} />
              .fet
            </button>
          )}

          {/* Save to Booking */}
          {onSaveToBooking && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#3F7859] hover:bg-[#2D5841] text-white px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm active:scale-95"
            >
              {savedSuccess ? <CheckCircle2 size={15} /> : <Save size={15} />}
              {savedSuccess ? "تم الحفظ للعميل ✓" : saving ? "جارٍ الحفظ..." : "حفظ في ملفات الحجز"}
            </button>
          )}
        </div>
      </div>

      {/* ── Printable Workspace Container ── */}
      <div
        id="fet-printable-area"
        style={{ zoom: `${zoomLevel}%` }}
        className="transition-transform origin-top space-y-8"
      >
        {/* CASE 1: Sections Mode */}
        {activeTab === "sections" && (
          <>
            {printAllMode ? (
              model.sections?.map((sec, sIdx) => {
                const secName = typeof sec === "string" ? sec : sec.name;
                return (
                  <div
                    key={sIdx}
                    className="printable-page bg-white p-6 sm:p-9 rounded-3xl border border-[#DCE2D6] shadow-sm mb-8 print:border-none print:shadow-none print:p-0 print:m-0 print:page-break-after-always"
                  >
                    <TimetableHeader
                      institutionName={institutionName}
                      wilaya={wilaya}
                      schoolYear={schoolYear}
                      title={`جدول توقيت الفوج التربوي: ${secName}`}
                      subtitle="قسم / فوج دراسي"
                    />
                    <SingleTimetableGrid
                      filterType="students"
                      filterValue={secName}
                      timetable={timetable}
                      days={days}
                      hours={hours}
                      allSubjects={allSubjects}
                      isMonochrome={isMonochrome}
                    />
                    <TimetableFooter />
                  </div>
                );
              })
            ) : (
              <div className="bg-white p-6 sm:p-9 rounded-3xl border border-[#DCE2D6] shadow-sm print:border-none print:shadow-none print:p-0">
                <TimetableHeader
                  institutionName={institutionName}
                  wilaya={wilaya}
                  schoolYear={schoolYear}
                  title={`جدول توقيت الفوج التربوي: ${selectedSection}`}
                  subtitle="قسم / فوج دراسي"
                />
                <SingleTimetableGrid
                  filterType="students"
                  filterValue={selectedSection}
                  timetable={timetable}
                  days={days}
                  hours={hours}
                  allSubjects={allSubjects}
                  isMonochrome={isMonochrome}
                />
                <TimetableFooter />
              </div>
            )}
          </>
        )}

        {/* CASE 2: Teachers Mode */}
        {activeTab === "teachers" && (
          <>
            {printAllMode ? (
              model.teachers?.map((tch, tIdx) => {
                const tchName = typeof tch === "string" ? tch : tch.name;
                const tchSubj = typeof tch === "object" ? tch.subject : "";
                return (
                  <div
                    key={tIdx}
                    className="printable-page bg-white p-6 sm:p-9 rounded-3xl border border-[#DCE2D6] shadow-sm mb-8 print:border-none print:shadow-none print:p-0 print:m-0 print:page-break-after-always"
                  >
                    <TimetableHeader
                      institutionName={institutionName}
                      wilaya={wilaya}
                      schoolYear={schoolYear}
                      title={`جدول توقيت الأستاذ(ة): ${tchName}`}
                      subtitle={tchSubj ? `مادة التخصص: ${tchSubj}` : "أستاذ التعليم"}
                    />
                    <SingleTimetableGrid
                      filterType="teacher"
                      filterValue={tchName}
                      timetable={timetable}
                      days={days}
                      hours={hours}
                      allSubjects={allSubjects}
                      isMonochrome={isMonochrome}
                    />
                    <TimetableFooter />
                  </div>
                );
              })
            ) : (
              <div className="bg-white p-6 sm:p-9 rounded-3xl border border-[#DCE2D6] shadow-sm print:border-none print:shadow-none print:p-0">
                <TimetableHeader
                  institutionName={institutionName}
                  wilaya={wilaya}
                  schoolYear={schoolYear}
                  title={`جدول توقيت الأستاذ(ة): ${selectedTeacher}`}
                  subtitle="أستاذ التعليم"
                />
                <SingleTimetableGrid
                  filterType="teacher"
                  filterValue={selectedTeacher}
                  timetable={timetable}
                  days={days}
                  hours={hours}
                  allSubjects={allSubjects}
                  isMonochrome={isMonochrome}
                />
                <TimetableFooter />
              </div>
            )}
          </>
        )}

        {/* CASE 3: Master Timetable */}
        {activeTab === "master" && (
          <div className="bg-white p-6 sm:p-9 rounded-3xl border border-[#DCE2D6] shadow-sm print:border-none print:shadow-none print:p-0">
            <TimetableHeader
              institutionName={institutionName}
              wilaya={wilaya}
              schoolYear={schoolYear}
              title="الجدول العام المجمع لتوقيت المؤسسة (Master Timetable)"
              subtitle="جدول شامل لكافة الأقسام والأساتذة"
            />
            <MasterTimetableGrid
              model={model}
              timetable={timetable}
              days={days}
              hours={hours}
              allSubjects={allSubjects}
              isMonochrome={isMonochrome}
            />
            <TimetableFooter />
          </div>
        )}
      </div>

      {/* ── Advanced High-DPI Vector Print CSS Injector ── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 10pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, button, select, .print\\:hidden {
            display: none !important;
          }
          #fet-printable-area {
            zoom: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .printable-page {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          table {
            page-break-inside: avoid !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Header Component (Official Algerian Style)
   ═══════════════════════════════════════════════════ */
function TimetableHeader({ institutionName, wilaya, schoolYear, title, subtitle }) {
  return (
    <div className="border-b-2 border-[#0F3D3E] pb-3.5 mb-4 select-none">
      <div className="flex justify-between items-start text-xs font-bold text-[#0F3D3E]">
        <div className="text-right leading-relaxed">
          <p className="font-extrabold">الجمهورية الجزائرية الديمقراطية الشعبية</p>
          <p>وزارة التربية الوطنية</p>
          <p className="text-[11px] text-[#555]">مديرية التربية لولاية: {wilaya}</p>
        </div>

        <div className="text-center">
          <div className="inline-block px-4 py-1 rounded-xl bg-[#0F3D3E]/5 border border-[#0F3D3E]/20">
            <p className="font-black text-sm text-[#0F3D3E]">{institutionName}</p>
          </div>
          <p className="text-[11px] text-[#555] font-semibold mt-1">الموسم الدراسي: {schoolYear}</p>
        </div>

        <div className="text-left leading-relaxed">
          <p className="font-mono text-xs font-bold text-[#0F3D3E]">RÉPUBLIQUE ALGÉRIENNE</p>
          <p className="text-[10px] text-[#777]">Ministère de l'Éducation</p>
          <p className="font-mono text-[10px] text-[#3F7859] font-bold">FET Engine v7</p>
        </div>
      </div>

      <div className="text-center mt-3">
        <h2 className="text-base sm:text-lg font-black text-[#0F3D3E] tracking-wide inline-block border-b-2 border-[#0F3D3E] px-4 pb-1">
          {title}
        </h2>
        {subtitle && <p className="text-[11px] font-bold text-[#8A9188] mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Single Schedule Grid (Class or Teacher)
   ═══════════════════════════════════════════════════ */
function SingleTimetableGrid({ filterType, filterValue, timetable, days, hours, allSubjects, isMonochrome }) {
  return (
    <div className="overflow-x-auto border-2 border-[#0F3D3E] rounded-2xl overflow-hidden shadow-xs">
      <table className="w-full border-collapse text-center text-xs min-w-[700px]">
        <thead>
          <tr className="bg-[#0F3D3E] text-white font-extrabold print:bg-black print:text-white">
            <th className="p-3 border-l border-white/20 w-28 text-sm font-black">اليوم \ الحصة</th>
            {hours.map((h, i) => (
              <th key={i} className="p-2.5 border-l border-white/20 font-bold text-xs">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day, dIdx) => (
            <tr key={dIdx} className="border-b border-[#0F3D3E]/20">
              <td className="p-3 border-l border-[#0F3D3E]/30 font-black text-[#0F3D3E] bg-[#EDF2EE] text-sm print:bg-gray-100 print:text-black">
                {day}
              </td>
              {hours.map((hour, hIdx) => {
                const cellAct = timetable.find((item) => {
                  if (item.day !== day || item.hour !== hour) return false;
                  if (filterType === "students") {
                    return item.students && item.students.includes(filterValue);
                  }
                  if (filterType === "teacher") {
                    return item.teacher === filterValue;
                  }
                  return false;
                });

                if (cellAct) {
                  const style = getSubjectColor(cellAct.subject, allSubjects, isMonochrome);
                  return (
                    <td key={hIdx} className="p-1 border-l border-[#0F3D3E]/20 h-[82px] min-w-[110px]">
                      <div
                        className="h-full p-2 rounded-xl flex flex-col justify-between text-right transition-all border shadow-2xs print:border print:border-black"
                        style={{
                          backgroundColor: style.bg,
                          borderColor: style.border,
                          borderRightWidth: "4px"
                        }}
                      >
                        <div className="font-black text-xs truncate leading-tight" style={{ color: style.text }}>
                          {cellAct.subject}
                        </div>
                        <div className="text-[11px] font-bold truncate text-[#444]">
                          {filterType === "teacher" ? cellAct.students : cellAct.teacher}
                        </div>
                        {cellAct.room ? (
                          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-md inline-block self-start font-mono bg-white/80 border border-black/10 text-gray-700">
                            🏛️ {cellAct.room}
                          </div>
                        ) : (
                          <div />
                        )}
                      </div>
                    </td>
                  );
                }

                return (
                  <td key={hIdx} className="p-1 border-l border-[#0F3D3E]/20 bg-[#F5F6F0]/40 print:bg-white">
                    <div className="h-full min-h-[76px] flex items-center justify-center text-gray-300 font-mono text-xs">
                      —
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Master General Timetable Grid (All sections + teachers)
   ═══════════════════════════════════════════════════ */
function MasterTimetableGrid({ model, timetable, days, hours, allSubjects, isMonochrome }) {
  const sections = model.sections || [];

  return (
    <div className="overflow-x-auto border-2 border-[#0F3D3E] rounded-2xl overflow-hidden shadow-xs">
      <table className="w-full border-collapse text-center text-xs min-w-[950px]">
        <thead>
          <tr className="bg-[#0F3D3E] text-white font-extrabold print:bg-black">
            <th className="p-3 border-l border-white/20 w-24">الفوج</th>
            <th className="p-3 border-l border-white/20 w-24">اليوم</th>
            {hours.map((h, i) => (
              <th key={i} className="p-2 border-l border-white/20 font-bold text-[11px]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#0F3D3E]/20">
          {sections.map((sec, sIdx) => {
            const secName = typeof sec === "string" ? sec : sec.name;
            return days.map((day, dIdx) => (
              <tr key={`${sIdx}-${dIdx}`} className="hover:bg-slate-50">
                {dIdx === 0 && (
                  <td
                    rowSpan={days.length}
                    className="p-3 border-l-2 border-[#0F3D3E] font-black text-sm text-[#0F3D3E] bg-[#EDF2EE] align-middle"
                  >
                    {secName}
                  </td>
                )}
                <td className="p-2 border-l border-[#0F3D3E]/20 font-bold text-xs bg-gray-50 text-gray-700">
                  {day}
                </td>
                {hours.map((hour, hIdx) => {
                  const cellAct = timetable.find(
                    (item) =>
                      item.day === day &&
                      item.hour === hour &&
                      item.students &&
                      item.students.includes(secName)
                  );

                  if (cellAct) {
                    const style = getSubjectColor(cellAct.subject, allSubjects, isMonochrome);
                    return (
                      <td key={hIdx} className="p-1 border-l border-[#0F3D3E]/20 h-[56px] min-w-[95px]">
                        <div
                          className="h-full p-1.5 rounded-lg flex flex-col justify-between text-right leading-tight border"
                          style={{
                            backgroundColor: style.bg,
                            borderColor: style.border
                          }}
                        >
                          <div className="font-extrabold text-[10px] truncate" style={{ color: style.text }}>
                            {cellAct.subject}
                          </div>
                          <div className="text-[9px] font-bold truncate text-gray-700">
                            {cellAct.teacher}
                          </div>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td key={hIdx} className="p-1 border-l border-[#0F3D3E]/20 bg-gray-50/40 text-gray-300">
                      —
                    </td>
                  );
                })}
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Official Stamp & Signature Footer
   ═══════════════════════════════════════════════════ */
function TimetableFooter() {
  return (
    <div className="mt-7 pt-4 border-t border-[#DCE2D6] flex justify-between items-end text-xs font-bold text-[#0F3D3E] select-none">
      <div className="text-center w-56">
        <p className="mb-1 text-gray-600">ناظر الدروس / مستشار التربية</p>
        <div className="h-16 border border-dashed border-gray-400 rounded-xl bg-gray-50/60 flex items-center justify-center text-[10px] text-gray-400">
          (التأشيرة والختم)
        </div>
      </div>

      <div className="text-center text-[10px] text-gray-400">
        <p>تم إعداد هذا الجدول بنجاح بواسطة المنصة الذكية للجداول المدرسية</p>
        <p className="font-mono mt-0.5">School-Time FET Generation Platform</p>
      </div>

      <div className="text-center w-56">
        <p className="mb-1 text-[#0F3D3E] font-extrabold">مدير(ة) المؤسسة التعليمية</p>
        <div className="h-16 border border-dashed border-[#0F3D3E]/50 rounded-xl bg-gray-50/60 flex items-center justify-center text-[10px] text-gray-400">
          (التوقيع والختم الرسمي)
        </div>
      </div>
    </div>
  );
}
