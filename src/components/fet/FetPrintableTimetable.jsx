"use client";
import { useState, useMemo } from "react";
import {
  Printer, Download, Save, CheckCircle2, Users, GraduationCap,
  Layers, Eye, FileText, ArrowRight, Share2, Sparkles, ZoomIn,
  ZoomOut, Palette, Check, Building2, Clock, Calendar
} from "lucide-react";

/* ═══════════════════════════════════════════════════
   Harmonious Educational Palette (Exp2Fet Styled)
   ═══════════════════════════════════════════════════ */
const SUBJECT_COLORS = {
  "لغة عربية": { bg: "#BAE6FD", border: "#0284C7", text: "#0369A1", subBg: "#E0F2FE" }, // Light Blue
  "التربية الإسلامية": { bg: "#FEF08A", border: "#CA8A04", text: "#854D0E", subBg: "#FEF9C3" }, // Yellow / Gold
  "الرياضيات": { bg: "#FECDD3", border: "#E11D48", text: "#9F1239", subBg: "#FFE4E6" }, // Rose / Pink
  "اللغة الفرنسية": { bg: "#FED7AA", border: "#EA580C", text: "#9A3412", subBg: "#FFEDD5" }, // Orange / Peach
  "اللغة الإنجليزية": { bg: "#DDD6FE", border: "#7C3AED", text: "#5B21B6", subBg: "#EDE9FE" }, // Purple / Violet
  "التاريخ والجغرافيا": { bg: "#BBF7D0", border: "#16A34A", text: "#166534", subBg: "#DCFCE7" }, // Mint Green
  "العلوم الطبيعية": { bg: "#99F6E4", border: "#0D9488", text: "#115E59", subBg: "#CCFBF1" }, // Teal
  "العلوم الفيزيائية": { bg: "#E9D5FF", border: "#9333EA", text: "#6B21A8", subBg: "#F3E8FF" }, // Light Violet
  "التربية البدنية": { bg: "#BAE6FD", border: "#0284C7", text: "#075985", subBg: "#E0F2FE" }, // Sky Blue
  "الإعلام الآلي": { bg: "#A7F3D0", border: "#059669", text: "#065F46", subBg: "#D1FAE5" }, // Emerald
  "اللغة الأمازيغية": { bg: "#FDE68A", border: "#D97706", text: "#92400E", subBg: "#FEF3C7" }, // Amber
  "التربية التشكيلية": { bg: "#FBCFE8", border: "#DB2777", text: "#9D174D", subBg: "#FCE7F3" }, // Pink
  "التربية الموسيقية": { bg: "#C7D2FE", border: "#4F46E5", text: "#3730A3", subBg: "#E0E7FF" }, // Indigo
};

const FALLBACK_PALETTES = [
  { bg: "#BAE6FD", border: "#0284C7", text: "#0369A1", subBg: "#E0F2FE" },
  { bg: "#FECDD3", border: "#E11D48", text: "#9F1239", subBg: "#FFE4E6" },
  { bg: "#FED7AA", border: "#EA580C", text: "#9A3412", subBg: "#FFEDD5" },
  { bg: "#DDD6FE", border: "#7C3AED", text: "#5B21B6", subBg: "#EDE9FE" },
  { bg: "#BBF7D0", border: "#16A34A", text: "#166534", subBg: "#DCFCE7" },
  { bg: "#99F6E4", border: "#0D9488", text: "#115E59", subBg: "#CCFBF1" },
];

function getSubjectTheme(subjectName, isMonochrome = false) {
  if (isMonochrome) {
    return { bg: "#FFFFFF", border: "#000000", text: "#000000", subBg: "#F3F4F6" };
  }
  if (!subjectName) return FALLBACK_PALETTES[0];

  for (const [key, val] of Object.entries(SUBJECT_COLORS)) {
    if (subjectName.includes(key) || key.includes(subjectName)) return val;
  }

  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) hash += subjectName.charCodeAt(i);
  return FALLBACK_PALETTES[hash % FALLBACK_PALETTES.length];
}

function cleanStr(s) {
  if (!s) return "";
  return String(s).trim().replace(/[\s\-_()]/g, "").toLowerCase();
}

export default function FetPrintableTimetable({
  timetable = [],
  model = {},
  booking,
  resultFetContent,
  teachersXmlContent,
  subgroupsXmlContent,
  onSaveToBooking,
  onBack
}) {
  const [activeTab, setActiveTab] = useState("sections"); // "sections" | "teachers" | "master"

  // Collect sections and teachers safely from model AND timetable
  const sectionsList = useMemo(() => {
    const fromModel = (model.sections || []).map(s => typeof s === "string" ? s : s.name).filter(Boolean);
    const fromTable = Array.from(new Set(timetable.map(a => a.students).filter(Boolean)));
    const merged = Array.from(new Set([...fromModel, ...fromTable]));
    return merged.length > 0 ? merged : ["الفوج 1"];
  }, [model.sections, timetable]);

  const teachersList = useMemo(() => {
    const fromModel = (model.teachers || []).map(t => typeof t === "string" ? t : t.name).filter(Boolean);
    const fromTable = Array.from(new Set(timetable.map(a => a.teacher).filter(Boolean)));
    const merged = Array.from(new Set([...fromModel, ...fromTable]));
    return merged.length > 0 ? merged : ["أستاذ 1"];
  }, [model.teachers, timetable]);

  const [selectedSection, setSelectedSection] = useState(sectionsList[0] || "");
  const [selectedTeacher, setSelectedTeacher] = useState(teachersList[0] || "");
  const [printAllMode, setPrintAllMode] = useState(false);
  const [isMonochrome, setIsMonochrome] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Strip morning/afternoon suffixes from day names (e.g. "الأحد ص", "الأحد م" → "الأحد")
  const stripDaySuffix = (d) => d ? d.replace(/\s*[صمابمساءصباح]+$/u, "").trim() : d;

  // Collect days (unique base names, preserving order from model or timetable)
  const days = useMemo(() => {
    const rawDays = (model.days && model.days.length > 0)
      ? model.days
      : Array.from(new Set(timetable.map(a => a.day).filter(Boolean)));
    // Deduplicate after stripping suffixes, preserving insertion order
    const seen = new Set();
    const result = [];
    for (const d of rawDays) {
      const base = stripDaySuffix(d);
      if (!seen.has(base)) { seen.add(base); result.push(base); }
    }
    return result.length > 0 ? result : ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  }, [model.days, timetable]);

  const hours = useMemo(() => {
    const rawHours = (model.hours && model.hours.length > 0)
      ? model.hours
      : Array.from(new Set(timetable.map(a => a.hour).filter(Boolean)));
    // Strip any trailing ص/م suffix from hour labels (e.g. "ح1 ص" → "ح1")
    const seen = new Set();
    const result = [];
    for (const h of rawHours) {
      const base = h ? h.replace(/\s*[صمابمساءصباح]+$/u, "").trim() : h;
      if (!seen.has(base)) { seen.add(base); result.push(base); }
    }
    if (result.length > 0) return result;
    return [
      "08:00-09:00",
      "09:00-10:00",
      "10:00-11:00",
      "11:00-12:00",
      "13:00-14:00",
      "14:00-15:00",
      "15:00-16:00",
      "16:00-17:00"
    ];
  }, [model.hours, timetable]);

  const institutionName = (model.institution || booking?.institution_name || "المؤسسة").replace(/\s+/g, "_");

  // Execute standard print
  const handlePrint = (printAll = false) => {
    setPrintAllMode(printAll);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Download helpers for the 3 specific files
  const downloadFile = (content, fileName, mimeType = "text/xml;charset=utf-8") => {
    if (!content) return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 1. Download _data_and_timetable.fet
  const handleDownloadFet = () => {
    if (!resultFetContent) return;
    downloadFile(resultFetContent, `${institutionName}_data_and_timetable.fet`);
  };

  // 2. Download _teachers.xml
  const handleDownloadTeachersXml = () => {
    downloadFile(teachersXmlContent, `${institutionName}_teachers.xml`);
  };

  // 3. Download _subgroups.xml
  const handleDownloadSubgroupsXml = () => {
    downloadFile(subgroupsXmlContent, `${institutionName}_subgroups.xml`);
  };

  // Save the 3 files strictly to booking final_files
  const handleSave = async () => {
    if (!onSaveToBooking) return;
    setSaving(true);
    try {
      await onSaveToBooking({
        resultFetContent,
        teachersXmlContent,
        subgroupsXmlContent,
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

  const activeSectionName = selectedSection || sectionsList[0] || "";
  const activeTeacherName = selectedTeacher || teachersList[0] || "";

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
              جداول الأقسام ({sectionsList.length})
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
              جداول الأساتذة ({teachersList.length})
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
              value={activeSectionName}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3.5 py-2 text-xs rounded-xl border border-[#DCE2D6] bg-white font-extrabold text-[#0F3D3E] focus:outline-none focus:ring-2 focus:ring-[#0F3D3E] shadow-2xs"
            >
              {sectionsList.map((secName, i) => (
                <option key={i} value={secName}>فوج: {secName}</option>
              ))}
            </select>
          )}

          {/* Teacher Selector */}
          {activeTab === "teachers" && !printAllMode && (
            <select
              value={activeTeacherName}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="px-3.5 py-2 text-xs rounded-xl border border-[#DCE2D6] bg-white font-extrabold text-[#0F3D3E] focus:outline-none focus:ring-2 focus:ring-[#0F3D3E] shadow-2xs"
            >
              {teachersList.map((tName, i) => (
                <option key={i} value={tName}>الأستاذ(ة): {tName}</option>
              ))}
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

          {/* Download 1: .fet */}
          {resultFetContent && (
            <button
              onClick={handleDownloadFet}
              className="border border-[#DCE2D6] bg-white hover:border-[#0F3D3E] text-[#0F3D3E] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
              title="تحميل ملف FET الكامل مع الجدول الزمني (_data_and_timetable.fet)"
            >
              <Download size={13} />
              .fet
            </button>
          )}

          {/* Download 2: teachers.xml */}
          {teachersXmlContent && (
            <button
              onClick={handleDownloadTeachersXml}
              className="border border-[#DCE2D6] bg-white hover:border-[#0F3D3E] text-[#0F3D3E] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
              title="تحميل ملف جدول الأساتذة XML (_teachers.xml)"
            >
              <Download size={13} />
              الأساتذة .xml
            </button>
          )}

          {/* Download 3: subgroups.xml */}
          {subgroupsXmlContent && (
            <button
              onClick={handleDownloadSubgroupsXml}
              className="border border-[#DCE2D6] bg-white hover:border-[#0F3D3E] text-[#0F3D3E] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
              title="تحميل ملف جدول الأقسام والفصول XML (_subgroups.xml)"
            >
              <Download size={13} />
              الأقسام .xml
            </button>
          )}

          {/* Save the 3 files to Booking */}
          {onSaveToBooking && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#3F7859] hover:bg-[#2D5841] text-white px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm active:scale-95"
              title="حفظ الملفات الثلاثة (.fet, teachers.xml, subgroups.xml) في ملفات الحجز"
            >
              {savedSuccess ? <CheckCircle2 size={15} /> : <Save size={15} />}
              {savedSuccess ? "تم حفظ الملفات الثلاثة ✓" : saving ? "جارٍ الحفظ..." : "حفظ الملفات الـ 3 في الحجز"}
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
              sectionsList.map((secName, sIdx) => (
                <div
                  key={sIdx}
                  className="printable-page bg-white p-6 sm:p-8 rounded-3xl border border-[#DCE2D6] shadow-sm mb-8 print:border-none print:shadow-none print:p-0 print:m-0 print:page-break-after-always"
                >
                  <Exp2FetSectionTable
                    sectionName={secName}
                    timetable={timetable}
                    days={days}
                    hours={hours}
                    model={model}
                    isMonochrome={isMonochrome}
                  />
                </div>
              ))
            ) : (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#DCE2D6] shadow-sm print:border-none print:shadow-none print:p-0">
                <Exp2FetSectionTable
                  sectionName={activeSectionName}
                  timetable={timetable}
                  days={days}
                  hours={hours}
                  model={model}
                  isMonochrome={isMonochrome}
                />
              </div>
            )}
          </>
        )}

        {/* CASE 2: Teachers Mode */}
        {activeTab === "teachers" && (
          <>
            {printAllMode ? (
              teachersList.map((tchName, tIdx) => (
                <div
                  key={tIdx}
                  className="printable-page bg-white p-6 sm:p-8 rounded-3xl border border-[#DCE2D6] shadow-sm mb-8 print:border-none print:shadow-none print:p-0 print:m-0 print:page-break-after-always"
                >
                  <Exp2FetTeacherTable
                    teacherName={tchName}
                    teacherSubj={model.teachers?.find(t => (typeof t === "string" ? t : t.name) === tchName)?.subject || ""}
                    teacherIdx={tIdx + 1}
                    timetable={timetable}
                    days={days}
                    hours={hours}
                    model={model}
                    isMonochrome={isMonochrome}
                  />
                </div>
              ))
            ) : (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#DCE2D6] shadow-sm print:border-none print:shadow-none print:p-0">
                <Exp2FetTeacherTable
                  teacherName={activeTeacherName}
                  teacherSubj={model.teachers?.find(t => (typeof t === "string" ? t : t.name) === activeTeacherName)?.subject || ""}
                  teacherIdx={Math.max(1, teachersList.indexOf(activeTeacherName) + 1)}
                  timetable={timetable}
                  days={days}
                  hours={hours}
                  model={model}
                  isMonochrome={isMonochrome}
                />
              </div>
            )}
          </>
        )}

        {/* CASE 3: Master Timetable */}
        {activeTab === "master" && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#DCE2D6] shadow-sm print:border-none print:shadow-none print:p-0">
            <Exp2FetMasterTable
              model={model}
              sectionsList={sectionsList}
              timetable={timetable}
              days={days}
              hours={hours}
              isMonochrome={isMonochrome}
            />
          </div>
        )}
      </div>

      {/* ── Precision Vector Print Styling ── */}
      <style jsx global>{`
        .striped-cell {
          background-color: #FAFAFA;
          background-image: repeating-linear-gradient(
            45deg,
            #F1F1F1,
            #F1F1F1 5px,
            #FAFAFA 5px,
            #FAFAFA 10px
          );
        }
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 7mm;
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
          .striped-cell {
            background-color: #FFFFFF !important;
            background-image: repeating-linear-gradient(
              45deg,
              #E5E7EB,
              #E5E7EB 4px,
              #FFFFFF 4px,
              #FFFFFF 8px
            ) !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Helper: Safe Activity Finder (Matches by string or normalized)
   ═══════════════════════════════════════════════════ */
function getMatchingActivities(timetable, filterType, filterValue, day, hour, dayIndex, hourIndex, allDays, allHours) {
  // Strip morning/afternoon suffix from any day string
  const stripSuffix = (d) => d ? d.replace(/\s*[صمابمساءصباح]+$/u, "").trim() : d;

  return (timetable || []).filter((item) => {
    // 1. Day match — compare base day names (ignoring ص/م suffix)
    const itemBase = stripSuffix(item.day);
    const dayBase  = stripSuffix(day);
    const dayMatch = (
      itemBase === dayBase ||
      cleanStr(itemBase) === cleanStr(dayBase)
    );
    if (!dayMatch) return false;

    // 2. Hour match — also strip any ص/م suffix from hour labels
    const itemHourBase = item.hour ? item.hour.replace(/\s*[صمابمساءصباح]+$/u, "").trim() : item.hour;
    const hourBase     = hour      ? hour.replace(/\s*[صمابمساءصباح]+$/u, "").trim() : hour;
    const hourMatch = (
      itemHourBase === hourBase ||
      cleanStr(itemHourBase) === cleanStr(hourBase) ||
      (allHours && allHours.indexOf(item.hour) === hourIndex) ||
      (itemHourBase && hourBase && (itemHourBase.includes(hourBase) || hourBase.includes(itemHourBase)))
    );
    if (!hourMatch) return false;

    // 3. Filter match
    if (filterType === "students") {
      return (
        item.students === filterValue ||
        cleanStr(item.students) === cleanStr(filterValue) ||
        (item.students && item.students.includes(filterValue)) ||
        (filterValue && filterValue.includes(item.students))
      );
    }
    if (filterType === "teacher") {
      return (
        item.teacher === filterValue ||
        cleanStr(item.teacher) === cleanStr(filterValue) ||
        (item.teacher && item.teacher.includes(filterValue))
      );
    }
    return true;
  });
}

/* ═══════════════════════════════════════════════════
   1. Teacher Timetable Component (Exp2Fet Layout)
   ═══════════════════════════════════════════════════ */
function Exp2FetTeacherTable({ teacherName, teacherSubj, teacherIdx, timetable, days, hours, model, isMonochrome }) {
  // Find all activities for this teacher
  const teacherActs = (timetable || []).filter(
    a => a.teacher === teacherName || cleanStr(a.teacher) === cleanStr(teacherName)
  );
  const totalHours = teacherActs.reduce((acc, a) => acc + (a.duration || 1), 0);
  const dutyHours = 20;
  const surplusHours = totalHours - dutyHours;

  const assignedSections = Array.from(new Set(teacherActs.map(a => a.students).filter(Boolean)));
  const primarySubject = teacherSubj || teacherActs[0]?.subject || "المادة التعليمية";

  return (
    <div className="space-y-4">
      {/* ── Top Header Section (Exp2Fet Image 1) ── */}
      <div className="flex items-center justify-between pb-3 select-none">
        {/* Right: Subject Name in Huge Bold Font */}
        <div className="text-right">
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F3D3E] tracking-tight">
            {primarySubject}
          </h2>
        </div>

        {/* Center: Teacher Badge and Name */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#5B8FB9] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            A{teacherIdx || 1}
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-gray-400">جدول التوقيت الأسبوعي للأستاذ(ة)</p>
            <p className="text-xl font-black text-[#0F3D3E] leading-tight">{teacherName}</p>
          </div>
        </div>

        {/* Left: Hours Quota Table */}
        <div className="border border-gray-300 rounded-xl overflow-hidden text-xs text-center font-bold min-w-[170px] shadow-2xs">
          <div className="grid grid-cols-2 border-b border-gray-200 bg-gray-50/80 py-1 px-2">
            <span className="font-extrabold text-[#0F3D3E]">{totalHours} سا</span>
            <span className="text-gray-500 font-semibold">عدد ساعات العمل</span>
          </div>
          <div className="grid grid-cols-2 border-b border-gray-200 bg-white py-1 px-2">
            <span className="font-extrabold text-[#0F3D3E]">{dutyHours} سا</span>
            <span className="text-gray-500 font-semibold">عدد ساعات العمل الواجبة</span>
          </div>
          <div className="grid grid-cols-2 bg-emerald-50 text-emerald-800 py-1 px-2">
            <span className="font-black">{surplusHours >= 0 ? `${surplusHours} سا` : `${Math.abs(surplusHours)} سا ناقصة`}</span>
            <span className="font-bold">{surplusHours >= 0 ? "عدد الساعات الفائضة" : "عدد الساعات الناقصة"}</span>
          </div>
        </div>
      </div>

      {/* ── Main Timetable Matrix (Exp2Fet Image 1) ── */}
      <div className="border-2 border-[#1E293B] rounded-xl overflow-hidden shadow-xs">
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr className="bg-[#1E293B] text-white font-extrabold text-xs divide-x divide-x-reverse divide-gray-700">
              <th className="p-2.5 w-20 font-black">اليوم</th>
              {hours.map((h, i) => (
                <th key={i} className="p-2.5 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {days.map((day, dIdx) => (
              <tr key={dIdx} className="h-[74px]">
                {/* Day Header Column */}
                <td className="bg-[#1E293B] text-white font-black text-xs w-20 border-l border-gray-400">
                  {day}
                </td>

                {/* Hours Columns */}
                {hours.map((hour, hIdx) => {
                  const acts = getMatchingActivities(timetable, "teacher", teacherName, day, hour, dIdx, hIdx, days, hours);

                  if (acts.length > 0) {
                    const cellAct = acts[0];
                    const theme = getSubjectTheme(cellAct.students || cellAct.subject, isMonochrome);
                    const isTD = cellAct.subject && (cellAct.subject.includes("TD") || cellAct.subject.includes("تطبيقي"));

                    return (
                      <td key={hIdx} className="p-1 border-l border-gray-300">
                        <div
                          className="h-full p-1.5 rounded-lg flex flex-col justify-between items-center text-center transition-all shadow-2xs"
                          style={{ backgroundColor: theme.bg }}
                        >
                          <span className="font-black text-xs text-[#0F3D3E]">
                            {cellAct.students}
                          </span>
                          <span className="text-[10px] font-bold text-gray-700">
                            {isTD ? `${cellAct.subject}` : cellAct.subject}
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-black/10 text-gray-800">
                            {cellAct.room || "القاعة_1"}
                          </span>
                        </div>
                      </td>
                    );
                  }

                  // Non-working / Free Slot
                  return (
                    <td key={hIdx} className="p-1 border-l border-gray-300 striped-cell">
                      <div className="h-full min-h-[64px]" />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Assigned Sections Footer List ── */}
      <div className="pt-2">
        <p className="text-xs font-bold text-[#0F3D3E] mb-1.5">
          لائحة الأقسام المسندة للأستاذ(ة) حسب المواد:
        </p>
        <div className="border border-gray-300 rounded-xl p-2.5 flex items-center justify-between bg-white text-xs font-bold shadow-2xs">
          <span className="text-gray-700">{primarySubject}</span>
          <div className="flex items-center gap-2 flex-wrap">
            {assignedSections.map((sec, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] font-extrabold text-xs"
              >
                {sec}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Director Stamp & Signature Line ── */}
      <div className="pt-4 flex justify-start items-center text-xs font-bold text-[#0F3D3E]">
        <span>ختم وتوقيع السيد مدير المؤسسة</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   2. Section Timetable Component (Exp2Fet Layout)
   ═══════════════════════════════════════════════════ */
function Exp2FetSectionTable({ sectionName, timetable, days, hours, model, isMonochrome }) {
  const sectionActs = (timetable || []).filter(
    a => a.students && (a.students === sectionName || a.students.includes(sectionName) || cleanStr(a.students) === cleanStr(sectionName))
  );
  const totalHours = sectionActs.reduce((acc, a) => acc + (a.duration || 1), 0);

  const teachersBySubjectMap = {};
  sectionActs.forEach(act => {
    if (act.subject && act.teacher) {
      teachersBySubjectMap[act.subject] = act.teacher;
    }
  });

  return (
    <div className="space-y-4">
      {/* ── Top Header Section (Exp2Fet Image 2) ── */}
      <div className="flex items-center justify-between pb-3 select-none">
        {/* Right: Section Badge and Name */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#C86428] text-white flex items-center justify-center font-black text-base shadow-xs">
            1
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-gray-400">التوقيت الأسبوعي لقسم</p>
            <h2 className="text-2xl font-black text-[#0F3D3E] leading-tight">{sectionName}</h2>
          </div>
        </div>

        {/* Left: Total Hours Pill Badge */}
        <div className="px-5 py-2 rounded-2xl bg-gray-100 border border-gray-200 font-extrabold text-xs text-[#0F3D3E] shadow-2xs">
          عدد الساعات <span className="font-mono text-sm">{totalHours || 31}</span> سا
        </div>
      </div>

      {/* ── Main Timetable Matrix (Exp2Fet Image 2) ── */}
      <div className="border-2 border-[#1E293B] rounded-xl overflow-hidden shadow-xs">
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr className="bg-[#1E293B] text-white font-extrabold text-xs divide-x divide-x-reverse divide-gray-700">
              <th className="p-2.5 w-20 font-black">اليوم</th>
              {hours.map((h, i) => (
                <th key={i} className="p-2.5 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {days.map((day, dIdx) => (
              <tr key={dIdx} className="h-[80px]">
                {/* Day Header Column */}
                <td className="bg-[#1E293B] text-white font-black text-xs w-20 border-l border-gray-400">
                  {day}
                </td>

                {/* Hours Columns */}
                {hours.map((hour, hIdx) => {
                  const acts = getMatchingActivities(timetable, "students", sectionName, day, hour, dIdx, hIdx, days, hours);

                  // Single Activity Cell
                  if (acts.length === 1) {
                    const cellAct = acts[0];
                    const theme = getSubjectTheme(cellAct.subject, isMonochrome);

                    return (
                      <td key={hIdx} className="p-1 border-l border-gray-300">
                        <div
                          className="h-full p-1.5 rounded-lg flex flex-col justify-between items-center text-center transition-all shadow-2xs"
                          style={{ backgroundColor: theme.bg }}
                        >
                          <span className="font-black text-xs text-[#0F3D3E]">
                            {cellAct.subject}
                          </span>
                          <span className="text-[10px] font-bold text-gray-700">
                            {cellAct.teacher}
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-black/10 text-gray-800">
                            {cellAct.room || "القاعة_1"}
                          </span>
                        </div>
                      </td>
                    );
                  }

                  // Split Subgroup Cell (TP / TD)
                  if (acts.length > 1) {
                    return (
                      <td key={hIdx} className="p-0.5 border-l border-gray-300">
                        <div className="h-full flex flex-col gap-0.5">
                          {acts.map((subAct, subIdx) => {
                            const subTheme = getSubjectTheme(subAct.subject, isMonochrome);
                            return (
                              <div
                                key={subIdx}
                                className="flex-1 p-1 rounded-md flex items-center justify-between text-[9px] font-bold px-1.5 shadow-2xs"
                                style={{ backgroundColor: subTheme.bg }}
                              >
                                <span className="font-black text-[#0F3D3E]">{subAct.subject}</span>
                                <span className="text-gray-700">{subAct.teacher}</span>
                                <span className="px-1 py-0.2 rounded bg-white/90 text-[8px]">
                                  {subAct.room || "مخبر"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  }

                  // Non-working Slot
                  return (
                    <td key={hIdx} className="p-1 border-l border-gray-300 striped-cell">
                      <div className="h-full min-h-[70px]" />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Assigned Teachers Matrix Footer Table (Exp2Fet Image 2) ── */}
      <div className="pt-2">
        <p className="text-xs font-bold text-[#0F3D3E] mb-1.5">
          لائحة الأساتذة المسندين حسب المواد:
        </p>
        <div className="border border-gray-400 rounded-xl overflow-hidden bg-white shadow-2xs">
          <table className="w-full text-xs text-center border-collapse">
            <tbody>
              {chunkArray(Object.entries(teachersBySubjectMap), 4).map((rowGroup, rIdx) => (
                <tr key={rIdx} className="border-b border-gray-200 divide-x divide-x-reverse divide-gray-200">
                  {rowGroup.map(([subj, tch], cIdx) => (
                    <td key={cIdx} className="p-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-black text-[#0F3D3E]">{subj}</span>
                        <span className="font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">{tch}</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Director Stamp & Signature Line ── */}
      <div className="pt-4 flex justify-start items-center text-xs font-bold text-[#0F3D3E]">
        <span>ختم وتوقيع السيد مدير المؤسسة</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   3. Master Timetable Component
   ═══════════════════════════════════════════════════ */
function Exp2FetMasterTable({ model, sectionsList, timetable, days, hours, isMonochrome }) {
  return (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <h2 className="text-xl font-black text-[#0F3D3E]">
          الجدول العام المجمع لتوقيت المؤسسة
        </h2>
        <p className="text-xs text-gray-500 font-bold mt-0.5">
          {model.institution || "المؤسسة التعليمية"}
        </p>
      </div>

      <div className="border-2 border-[#1E293B] rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full border-collapse text-center text-xs min-w-[950px]">
          <thead>
            <tr className="bg-[#1E293B] text-white font-extrabold divide-x divide-x-reverse divide-gray-700">
              <th className="p-2.5 w-20">الفوج</th>
              <th className="p-2.5 w-20">اليوم</th>
              {hours.map((h, i) => (
                <th key={i} className="p-2 text-[11px] font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {sectionsList.map((secName, sIdx) => {
              return days.map((day, dIdx) => (
                <tr key={`${sIdx}-${dIdx}`} className="h-[52px] hover:bg-slate-50">
                  {dIdx === 0 && (
                    <td
                      rowSpan={days.length}
                      className="p-2 border-l-2 border-[#1E293B] font-black text-sm text-[#0F3D3E] bg-gray-100 align-middle"
                    >
                      {secName}
                    </td>
                  )}
                  <td className="p-2 border-l border-gray-300 font-bold text-xs bg-gray-50 text-gray-700">
                    {day}
                  </td>
                  {hours.map((hour, hIdx) => {
                    const acts = getMatchingActivities(timetable, "students", secName, day, hour, dIdx, hIdx, days, hours);

                    if (acts.length > 0) {
                      const cellAct = acts[0];
                      const theme = getSubjectTheme(cellAct.subject, isMonochrome);
                      return (
                        <td key={hIdx} className="p-0.5 border-l border-gray-300">
                          <div
                            className="h-full p-1 rounded-md flex flex-col justify-between items-center text-center text-[10px]"
                            style={{ backgroundColor: theme.bg }}
                          >
                            <span className="font-extrabold text-[#0F3D3E] truncate">{cellAct.subject}</span>
                            <span className="font-bold text-gray-700 text-[9px] truncate">{cellAct.teacher}</span>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={hIdx} className="p-0.5 border-l border-gray-200 striped-cell">
                        <div className="h-full min-h-[44px]" />
                      </td>
                    );
                  })}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      <div className="pt-4 flex justify-start items-center text-xs font-bold text-[#0F3D3E]">
        <span>ختم وتوقيع السيد مدير المؤسسة</span>
      </div>
    </div>
  );
}

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}
