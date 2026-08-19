"use client";
import { useState, useRef } from "react";
import {
  Printer, Download, Save, CheckCircle2, Users, GraduationCap,
  Layers, Eye, FileText, ArrowRight, Share2, Sparkles
} from "lucide-react";

/* ═══════════════════════════════════════════════════
   Subject cell color palette (Screen & Print friendly)
   ═══════════════════════════════════════════════════ */
const CELL_COLORS = [
  { bg: "#EDF7F2", border: "#3F7859", text: "#1B4332" },
  { bg: "#EEF0FB", border: "#4361EE", text: "#1E2A78" },
  { bg: "#FFF3E0", border: "#E8850C", text: "#7A4100" },
  { bg: "#FCE4EC", border: "#D63384", text: "#7B1340" },
  { bg: "#E8F5E9", border: "#2E7D32", text: "#1B5E20" },
  { bg: "#F3E5F5", border: "#7B1FA2", text: "#4A0072" },
  { bg: "#E0F7FA", border: "#00838F", text: "#004D40" },
  { bg: "#FFF8E1", border: "#F9A825", text: "#7C5200" },
  { bg: "#EFEBE9", border: "#795548", text: "#3E2723" },
  { bg: "#E8EAF6", border: "#3949AB", text: "#1A237E" },
];

function getSubjectStyle(subject, allSubjects) {
  const idx = allSubjects.indexOf(subject);
  return CELL_COLORS[idx >= 0 ? idx % CELL_COLORS.length : 0];
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
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const days = model.days || ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const hours = model.hours || [];
  const allSubjects = (model.subjects || []).map((s) => (typeof s === "string" ? s : s.name));
  const institutionName = model.institution || booking?.institution_name || "المؤسسة التعليمية";
  const wilaya = booking?.wilaya || "الجزائر";
  const currentYear = new Date().getFullYear();
  const schoolYear = `${currentYear} / ${currentYear + 1}`;

  // Print execution
  const handlePrint = (printAll = false) => {
    setPrintAllMode(printAll);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Download .fet file
  const handleDownloadFet = () => {
    if (!resultFetContent) return;
    const blob = new Blob([resultFetContent], { type: "text/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${institutionName.replace(/\s+/g, "_")}_timetable.fet`;
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
    <div className="space-y-6" style={{ direction: "rtl" }}>
      {/* ── Action Control Bar (Hidden on Print) ── */}
      <div className="bg-white p-4 rounded-2xl border border-[#DCE2D6] shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        {/* Left: View Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl overflow-hidden border border-[#DCE2D6] bg-[#F5F6F0] p-1">
            <button
              onClick={() => { setActiveTab("sections"); setPrintAllMode(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "sections"
                  ? "bg-[#0F3D3E] text-white shadow-xs"
                  : "text-[#0F3D3E] hover:bg-white/60"
              }`}
            >
              <GraduationCap size={15} />
              جداول الأقسام
            </button>
            <button
              onClick={() => { setActiveTab("teachers"); setPrintAllMode(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "teachers"
                  ? "bg-[#0F3D3E] text-white shadow-xs"
                  : "text-[#0F3D3E] hover:bg-white/60"
              }`}
            >
              <Users size={15} />
              جداول الأساتذة
            </button>
            <button
              onClick={() => { setActiveTab("master"); setPrintAllMode(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "master"
                  ? "bg-[#0F3D3E] text-white shadow-xs"
                  : "text-[#0F3D3E] hover:bg-white/60"
              }`}
            >
              <Layers size={15} />
              الجدول العام
            </button>
          </div>

          {/* Item Selector Dropdown */}
          {activeTab === "sections" && !printAllMode && (
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-[#DCE2D6] bg-white font-bold text-[#0F3D3E] focus:outline-none focus:ring-1 focus:ring-[#0F3D3E]"
            >
              {model.sections?.map((sec, i) => {
                const name = typeof sec === "string" ? sec : sec.name;
                return <option key={i} value={name}>{name}</option>;
              })}
            </select>
          )}

          {activeTab === "teachers" && !printAllMode && (
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-[#DCE2D6] bg-white font-bold text-[#0F3D3E] focus:outline-none focus:ring-1 focus:ring-[#0F3D3E]"
            >
              {model.teachers?.map((t, i) => {
                const name = typeof t === "string" ? t : t.name;
                return <option key={i} value={name}>{name}</option>;
              })}
            </select>
          )}
        </div>

        {/* Right: Print & Export Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Print Single Current Table */}
          <button
            onClick={() => handlePrint(false)}
            className="bg-[#0F3D3E] hover:bg-[#175253] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Printer size={15} />
            طباعة الجدول المعروض (PDF)
          </button>

          {/* Print All in Bulk */}
          {activeTab !== "master" && (
            <button
              onClick={() => handlePrint(true)}
              className="border border-[#0F3D3E] text-[#0F3D3E] hover:bg-[#0F3D3E] hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Printer size={15} />
              {activeTab === "sections" ? "طباعة كل الأقسام دفعة واحدة" : "طباعة كل الأساتذة دفعة واحدة"}
            </button>
          )}

          {/* Download .fet */}
          {resultFetContent && (
            <button
              onClick={handleDownloadFet}
              className="border border-[#DCE2D6] hover:border-[#0F3D3E] text-[#0F3D3E] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              title="تحميل ملف FET الأصلي مع الجدول الزمني"
            >
              <Download size={14} />
              ملف .fet
            </button>
          )}

          {/* Save to Booking */}
          {onSaveToBooking && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#3F7859] hover:bg-[#2D5841] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              {savedSuccess ? <CheckCircle2 size={15} /> : <Save size={15} />}
              {savedSuccess ? "تم الحفظ في الحجز ✓" : saving ? "جارٍ الحفظ..." : "حفظ في ملفات الحجز"}
            </button>
          )}
        </div>
      </div>

      {/* ── Print Content Area ── */}
      <div id="fet-printable-area" className="space-y-10">
        {/* CASE 1: Sections Mode */}
        {activeTab === "sections" && (
          <>
            {printAllMode ? (
              // Print ALL sections
              model.sections?.map((sec, sIdx) => {
                const secName = typeof sec === "string" ? sec : sec.name;
                return (
                  <div key={sIdx} className="printable-page bg-white p-6 sm:p-8 rounded-3xl border border-[#DCE2D6] shadow-sm mb-8 print:border-none print:shadow-none print:p-0 print:m-0 print:page-break-after-always">
                    <TimetableHeader
                      institutionName={institutionName}
                      wilaya={wilaya}
                      schoolYear={schoolYear}
                      title={`جدول توقيت القسم: ${secName}`}
                      subtitle="قسم / فوج تربوي"
                    />
                    <SingleTimetableGrid
                      filterType="students"
                      filterValue={secName}
                      timetable={timetable}
                      days={days}
                      hours={hours}
                      allSubjects={allSubjects}
                    />
                    <TimetableFooter />
                  </div>
                );
              })
            ) : (
              // Single Selected Section
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#DCE2D6] shadow-sm print:border-none print:shadow-none print:p-0">
                <TimetableHeader
                  institutionName={institutionName}
                  wilaya={wilaya}
                  schoolYear={schoolYear}
                  title={`جدول توقيت القسم: ${selectedSection}`}
                  subtitle="قسم / فوج تربوي"
                />
                <SingleTimetableGrid
                  filterType="students"
                  filterValue={selectedSection}
                  timetable={timetable}
                  days={days}
                  hours={hours}
                  allSubjects={allSubjects}
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
              // Print ALL teachers
              model.teachers?.map((tch, tIdx) => {
                const tchName = typeof tch === "string" ? tch : tch.name;
                const tchSubj = typeof tch === "object" ? tch.subject : "";
                return (
                  <div key={tIdx} className="printable-page bg-white p-6 sm:p-8 rounded-3xl border border-[#DCE2D6] shadow-sm mb-8 print:border-none print:shadow-none print:p-0 print:m-0 print:page-break-after-always">
                    <TimetableHeader
                      institutionName={institutionName}
                      wilaya={wilaya}
                      schoolYear={schoolYear}
                      title={`جدول توقيت الأستاذ(ة): ${tchName}`}
                      subtitle={tchSubj ? `مادة: ${tchSubj}` : "أستاذ التعليم"}
                    />
                    <SingleTimetableGrid
                      filterType="teacher"
                      filterValue={tchName}
                      timetable={timetable}
                      days={days}
                      hours={hours}
                      allSubjects={allSubjects}
                    />
                    <TimetableFooter />
                  </div>
                );
              })
            ) : (
              // Single Selected Teacher
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#DCE2D6] shadow-sm print:border-none print:shadow-none print:p-0">
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
                />
                <TimetableFooter />
              </div>
            )}
          </>
        )}

        {/* CASE 3: Master General Grid */}
        {activeTab === "master" && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#DCE2D6] shadow-sm print:border-none print:shadow-none print:p-0">
            <TimetableHeader
              institutionName={institutionName}
              wilaya={wilaya}
              schoolYear={schoolYear}
              title="الجدول العام لتوقيت المؤسسة (Master Timetable)"
              subtitle="مجمع لجميع الأقسام والأساتذة"
            />
            <MasterTimetableGrid
              model={model}
              timetable={timetable}
              days={days}
              hours={hours}
              allSubjects={allSubjects}
            />
            <TimetableFooter />
          </div>
        )}
      </div>

      {/* ── Print CSS Injector ── */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            font-size: 11pt !important;
          }
          nav, button, select, .print\\:hidden {
            display: none !important;
          }
          .printable-page {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 20px 0 !important;
          }
          table {
            page-break-inside: avoid !important;
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
    <div className="border-b-2 border-[#0F3D3E] pb-4 mb-5 select-none">
      <div className="flex justify-between items-start text-[11px] font-bold text-[#0F3D3E] mb-3">
        <div className="text-right">
          <p>الجمهورية الجزائرية الديمقراطية الشعبية</p>
          <p>وزارة التربية الوطنية</p>
          <p>مديرية التربية لولاية {wilaya}</p>
        </div>
        <div className="text-center font-extrabold text-xs">
          <p>{institutionName}</p>
          <p className="text-[10px] text-[#8A9188]">الموسم الدراسي: {schoolYear}</p>
        </div>
        <div className="text-left font-mono text-[10px] text-[#8A9188]">
          <p>School Timetable FET</p>
        </div>
      </div>

      <div className="text-center mt-2">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#0F3D3E] tracking-wide inline-block border-b border-[#0F3D3E] pb-0.5">
          {title}
        </h2>
        {subtitle && <p className="text-xs font-semibold text-[#8A9188] mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Single Schedule Grid (Class or Teacher)
   ═══════════════════════════════════════════════════ */
function SingleTimetableGrid({ filterType, filterValue, timetable, days, hours, allSubjects }) {
  return (
    <div className="overflow-x-auto border-2 border-[#0F3D3E] rounded-xl overflow-hidden shadow-xs">
      <table className="w-full border-collapse text-center text-xs min-w-[650px]">
        <thead>
          <tr className="bg-[#0F3D3E] text-white font-extrabold">
            <th className="p-3 border-l border-[#175253] w-28 text-sm">اليوم \ الحصة</th>
            {hours.map((h, i) => (
              <th key={i} className="p-2.5 border-l border-[#175253] font-bold text-[11px]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day, dIdx) => (
            <tr key={dIdx} className="border-b border-[#DCE2D6]">
              <td className="p-3 border-l border-[#DCE2D6] font-extrabold text-[#0F3D3E] bg-[#EDF2EE]/60 text-sm">
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
                  const style = getSubjectStyle(cellAct.subject, allSubjects);
                  return (
                    <td key={hIdx} className="p-1 border-l border-[#DCE2D6] h-[78px] min-w-[110px]">
                      <div
                        className="h-full p-2 rounded-lg flex flex-col justify-between text-right transition-all print:border print:border-gray-400"
                        style={{
                          backgroundColor: style.bg,
                          borderRight: `3px solid ${style.border}`
                        }}
                      >
                        <div className="font-extrabold text-[11px] truncate leading-tight" style={{ color: style.text }}>
                          {cellAct.subject}
                        </div>
                        <div className="text-[10px] font-bold truncate" style={{ color: style.border }}>
                          {filterType === "teacher" ? cellAct.students : cellAct.teacher}
                        </div>
                        {cellAct.room && (
                          <div className="text-[9px] font-semibold text-gray-500 truncate">
                            🏛️ {cellAct.room}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                }

                return (
                  <td key={hIdx} className="p-1 border-l border-[#DCE2D6] h-[78px]">
                    <div className="h-full rounded-lg bg-[#F5F6F0]/40 flex items-center justify-center">
                      <span className="text-gray-300 font-bold select-none">—</span>
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
   Master Schedule Grid (General School View)
   ═══════════════════════════════════════════════════ */
function MasterTimetableGrid({ model, timetable, days, hours, allSubjects }) {
  const sections = model.sections || [];

  return (
    <div className="overflow-x-auto border-2 border-[#0F3D3E] rounded-xl overflow-hidden shadow-xs">
      <table className="w-full border-collapse text-center text-xs min-w-[800px]">
        <thead>
          <tr className="bg-[#0F3D3E] text-white font-extrabold">
            <th className="p-2.5 border-l border-[#175253] w-24">القسم</th>
            <th className="p-2.5 border-l border-[#175253] w-20">اليوم</th>
            {hours.map((h, i) => (
              <th key={i} className="p-2 border-l border-[#175253] font-bold text-[10px]">
                {h.split(" ")[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((sec, sIdx) => {
            const secName = typeof sec === "string" ? sec : sec.name;
            return days.map((day, dIdx) => (
              <tr
                key={`${sIdx}-${dIdx}`}
                className={`border-b border-[#DCE2D6] ${
                  dIdx === days.length - 1 ? "border-b-2 border-b-[#0F3D3E]" : ""
                }`}
              >
                {dIdx === 0 && (
                  <td
                    rowSpan={days.length}
                    className="p-2 border-l-2 border-[#0F3D3E] font-extrabold text-[#0F3D3E] bg-[#EDF2EE]/70 align-middle text-sm"
                  >
                    {secName}
                  </td>
                )}
                <td className="p-1.5 border-l border-[#DCE2D6] font-bold text-[#0F3D3E] bg-[#F5F6F0]/50 text-xs">
                  {day}
                </td>
                {hours.map((hour, hIdx) => {
                  const cellAct = timetable.find(
                    (item) => item.day === day && item.hour === hour && item.students && item.students.includes(secName)
                  );

                  if (cellAct) {
                    const style = getSubjectStyle(cellAct.subject, allSubjects);
                    return (
                      <td key={hIdx} className="p-1 border-l border-[#DCE2D6] h-[48px] min-w-[90px]">
                        <div
                          className="h-full p-1 rounded flex flex-col justify-center text-right overflow-hidden"
                          style={{
                            backgroundColor: style.bg,
                            borderRight: `2px solid ${style.border}`
                          }}
                        >
                          <p className="font-bold text-[10px] truncate" style={{ color: style.text }}>
                            {cellAct.subject}
                          </p>
                          <p className="text-[9px] font-semibold truncate text-[#8A9188]">
                            {cellAct.teacher}
                          </p>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td key={hIdx} className="p-1 border-l border-[#DCE2D6] h-[48px]">
                      <div className="h-full rounded bg-[#F5F6F0]/20 flex items-center justify-center">
                        <span className="text-gray-300 font-bold text-[9px] select-none">—</span>
                      </div>
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
   Footer Component (Official Stamp & Signatures)
   ═══════════════════════════════════════════════════ */
function TimetableFooter() {
  return (
    <div className="mt-8 pt-4 flex justify-between items-center text-xs font-bold text-[#0F3D3E] select-none">
      <div className="text-center w-48">
        <p>ناظر الدروس / مستشار التربية</p>
        <div className="h-14 mt-1 border-b border-dashed border-gray-300" />
      </div>
      <div className="text-center w-48">
        <p>ختم وتوقيع مدير المؤسسة</p>
        <div className="h-14 mt-1 border-b border-dashed border-gray-300" />
      </div>
    </div>
  );
}
