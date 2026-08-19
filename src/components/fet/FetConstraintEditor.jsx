"use client";
import { useState } from "react";
import {
  Users, BookOpen, GraduationCap, DoorOpen, Layers, Clock, ShieldAlert,
  Plus, Trash2, Edit2, Check, X, AlertCircle, Sparkles, Sliders,
  Calendar, CheckSquare, Grid, ArrowLeft, ArrowRight, Settings2
} from "lucide-react";

export default function FetConstraintEditor({ model, onChange }) {
  // Navigation Steps mirroring the professional desktop Exp2Fet layout
  const [currentStep, setCurrentStep] = useState("general"); // general | teachers_quota | assignments | constraints | unavailability

  const updateModel = (updater) => {
    onChange((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      return next;
    });
  };

  const steps = [
    { key: "general", label: "1. الهيكل والمرافق والأفواج", icon: GraduationCap },
    { key: "teachers_quota", label: "2. تعداد الأساتذة بالمواد", icon: Users },
    { key: "assignments", label: "3. جدول إسناد الأساتذة للأفواج", icon: Layers },
    { key: "constraints", label: "4. القيود البيداغوجية والزمنية", icon: Sliders },
    { key: "unavailability", label: "5. شبكة تفريغات وأنصاف الأيام", icon: Clock },
  ];

  return (
    <div className="bg-white rounded-3xl border border-[#DCE2D6] overflow-hidden shadow-sm flex flex-col min-h-[600px]">
      {/* ── Top Step Ribbon (Exp2Fet Styled) ── */}
      <div className="bg-[#0F3D3E] p-2 sm:p-3 text-white flex items-center justify-between overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.key;
            return (
              <button
                key={step.key}
                onClick={() => setCurrentStep(step.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#3F7859] text-white shadow-md ring-2 ring-white/30"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon size={15} />
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>
        <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-[#E3A857] bg-black/20 px-3 py-1.5 rounded-xl">
          <span>المؤسسة: {model.institution || "متوسطة / ثانوية"}</span>
        </div>
      </div>

      {/* ── Main Step Container ── */}
      <div className="p-4 sm:p-6 flex-1 bg-[#F5F6F0]/50">
        {currentStep === "general" && (
          <GeneralStructureStep model={model} updateModel={updateModel} />
        )}
        {currentStep === "teachers_quota" && (
          <TeachersQuotaStep model={model} updateModel={updateModel} />
        )}
        {currentStep === "assignments" && (
          <AssignmentsMatrixStep model={model} updateModel={updateModel} />
        )}
        {currentStep === "constraints" && (
          <PedagogicalConstraintsStep model={model} updateModel={updateModel} />
        )}
        {currentStep === "unavailability" && (
          <UnavailabilityGridStep model={model} updateModel={updateModel} />
        )}
      </div>

      {/* ── Bottom Step Navigation Bar ── */}
      <div className="bg-white border-t border-[#DCE2D6] p-4 flex items-center justify-between">
        <button
          onClick={() => {
            const idx = steps.findIndex(s => s.key === currentStep);
            if (idx > 0) setCurrentStep(steps[idx - 1].key);
          }}
          disabled={currentStep === "general"}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#DCE2D6] text-xs font-bold text-[#0F3D3E] hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ArrowRight size={16} /> السابق
        </button>

        <div className="text-xs font-semibold text-[#8A9188]">
          الخطوة {steps.findIndex(s => s.key === currentStep) + 1} من {steps.length}
        </div>

        <button
          onClick={() => {
            const idx = steps.findIndex(s => s.key === currentStep);
            if (idx < steps.length - 1) setCurrentStep(steps[idx + 1].key);
          }}
          disabled={currentStep === "unavailability"}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0F3D3E] text-white text-xs font-bold hover:bg-[#175253] disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
        >
          التالي <ArrowLeft size={16} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   1. الخطوة الأولى: الهيكل العام والمرافق والأفواج التربوية (الشاشة 1 في الصورة)
   ========================================================================= */
function GeneralStructureStep({ model, updateModel }) {
  return (
    <div className="space-y-6">
      {/* اسم المؤسسة */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DCE2D6] shadow-xs flex flex-wrap items-center gap-4">
        <label className="text-xs font-bold text-[#0F3D3E] min-w-[120px]">اسم المؤسسة التعليمية:</label>
        <input
          type="text"
          value={model.institution || ""}
          onChange={(e) => updateModel({ institution: e.target.value })}
          placeholder="مثلاً: متوسطة بني جماتي"
          className="flex-1 min-w-[240px] px-4 py-2.5 text-xs font-bold rounded-xl border border-[#DCE2D6] bg-[#F5F6F0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3D3E]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── العمود الأيمن: الأفواج التربوية والمستويات ── */}
        <div className="bg-white rounded-2xl border border-[#DCE2D6] overflow-hidden shadow-xs">
          <div className="bg-[#10B981] p-3 text-white font-extrabold text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <GraduationCap size={16} /> الأفواج التربوية والمستويات
            </span>
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
              إجمالي الأقسام: {model.sections?.length || 0}
            </span>
          </div>

          <div className="p-4 space-y-3">
            {model.sections?.map((sec, idx) => {
              const secName = typeof sec === "string" ? sec : sec.name;
              const secYear = typeof sec === "object" ? sec.year : "";
              return (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-[#F5F6F0] rounded-xl border border-[#DCE2D6]">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </span>
                    <span className="font-extrabold text-xs text-[#0F3D3E]">{secName}</span>
                    {secYear && <span className="text-[10px] text-[#8A9188] bg-white px-2 py-0.5 rounded border border-[#DCE2D6]">{secYear}</span>}
                  </div>
                  <button
                    onClick={() => updateModel({ sections: model.sections.filter((_, i) => i !== idx) })}
                    className="text-red-500 hover:text-red-700 p-1 transition-colors"
                    title="حذف الفوج"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}

            {/* إضافة قسم جديد */}
            <div className="pt-2 flex gap-2">
              <input
                type="text"
                placeholder="اسم القسم الجديد (مثلاً: 1م1، 2ع1)"
                id="new-sec-input"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#DCE2D6] bg-white focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    updateModel({ sections: [...model.sections, { name: e.target.value.trim(), year: "" }] });
                    e.target.value = "";
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.getElementById("new-sec-input");
                  if (input && input.value.trim()) {
                    updateModel({ sections: [...model.sections, { name: input.value.trim(), year: "" }] });
                    input.value = "";
                  }
                }}
                className="bg-[#10B981] hover:bg-[#059669] text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              >
                <Plus size={14} /> إضافة
              </button>
            </div>
          </div>
        </div>

        {/* ── العمود الأيسر: المرافق التربوية والقاعات ── */}
        <div className="bg-white rounded-2xl border border-[#DCE2D6] overflow-hidden shadow-xs">
          <div className="bg-[#8B5CF6] p-3 text-white font-extrabold text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DoorOpen size={16} /> المرافق والقاعات التربوية
            </span>
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
              إجمالي القاعات: {model.rooms?.length || 0}
            </span>
          </div>

          <div className="p-4 space-y-3">
            {model.rooms?.map((r, idx) => {
              const rName = typeof r === "string" ? r : r.name;
              const rType = typeof r === "object" ? r.type : "standard";
              return (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-[#F5F6F0] rounded-xl border border-[#DCE2D6]">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#8B5CF6] text-white flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </span>
                    <span className="font-extrabold text-xs text-[#0F3D3E]">{rName}</span>
                    <span className="text-[10px] text-[#8A9188] bg-white px-2 py-0.5 rounded border border-[#DCE2D6]">
                      {rType === "lab" ? "مخبر" : rType === "workshop" ? "ورشة" : rType === "computer" ? "إعلام آلي" : rType === "sports" ? "ملعب" : "حجرة عادية"}
                    </span>
                  </div>
                  <button
                    onClick={() => updateModel({ rooms: model.rooms.filter((_, i) => i !== idx) })}
                    className="text-red-500 hover:text-red-700 p-1 transition-colors"
                    title="حذف القاعة"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}

            {/* إضافة قاعة جديدة */}
            <div className="pt-2 flex gap-2">
              <input
                type="text"
                placeholder="اسم القاعة (مثلاً: حجرة 1، مخبر 2)"
                id="new-room-input"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#DCE2D6] bg-white focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    updateModel({ rooms: [...model.rooms, { name: e.target.value.trim(), type: "standard", capacity: 40 }] });
                    e.target.value = "";
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.getElementById("new-room-input");
                  if (input && input.value.trim()) {
                    updateModel({ rooms: [...model.rooms, { name: input.value.trim(), type: "standard", capacity: 40 }] });
                    input.value = "";
                  }
                }}
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              >
                <Plus size={14} /> إضافة
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   2. الخطوة الثانية: تعداد الأساتذة والمواد (الشاشة 2 في الصورة)
   ========================================================================= */
const SUBJECT_ACCENTS = [
  { name: "اللغة العربية", color: "#3B82F6", label: "لغة عربية", icon: "📖" },
  { name: "التربية الإسلامية", color: "#10B981", label: "ت. إسلامية", icon: "🕌" },
  { name: "الرياضيات", color: "#6366F1", label: "رياضيات", icon: "📐" },
  { name: "اللغة الفرنسية", color: "#EC4899", label: "فرنسية", icon: "🇫🇷" },
  { name: "اللغة الإنجليزية", color: "#EF4444", label: "إنجليزية", icon: "🇬🇧" },
  { name: "التاريخ والجغرافيا", color: "#F59E0B", label: "اجتماعيات", icon: "🌍" },
  { name: "العلوم الطبيعية", color: "#14B8A6", label: "علوم طبيعية", icon: "🔬" },
  { name: "العلوم الفيزيائية", color: "#8B5CF6", label: "فيزياء", icon: "⚡" },
  { name: "التربية البدنية", color: "#E11D48", label: "ت. بدنية", icon: "⚽" },
  { name: "الإعلام الآلي", color: "#06B6D4", label: "إعلام آلي", icon: "💻" },
  { name: "التربية الفنية", color: "#F97316", label: "ت. فنية", icon: "🎨" },
  { name: "التربية الموسيقية", color: "#A855F7", label: "ت. موسيقية", icon: "🎵" },
  { name: "اللغة الأمازيغية", color: "#EAB308", label: "أمازيغية", icon: "♓" },
];

function TeachersQuotaStep({ model, updateModel }) {
  const subjects = model.subjects?.map(s => typeof s === "string" ? s : s.name) || [];

  // Group teachers by subject
  const teachersBySubject = {};
  subjects.forEach(s => teachersBySubject[s] = []);
  (model.teachers || []).forEach(t => {
    const tName = typeof t === "string" ? t : t.name;
    const tSubj = typeof t === "object" && t.subject ? t.subject : "عام";
    if (!teachersBySubject[tSubj]) teachersBySubject[tSubj] = [];
    teachersBySubject[tSubj].push(tName);
  });

  const handleAddTeacherToSubject = (subjectName) => {
    const currentList = teachersBySubject[subjectName] || [];
    const newIdx = currentList.length + 1;
    const newName = `${subjectName} ${newIdx}`;
    updateModel({
      teachers: [
        ...(model.teachers || []),
        { name: newName, subject: subjectName, targetHours: 18 }
      ]
    });
  };

  const handleRemoveTeacher = (teacherName) => {
    updateModel({
      teachers: (model.teachers || []).filter(t => (typeof t === "string" ? t : t.name) !== teacherName)
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3.5 rounded-2xl border border-[#DCE2D6] flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-xs text-[#0F3D3E]">تعداد وإسناد الأساتذة حسب كل مادة تعليمية</h4>
          <p className="text-[11px] text-[#8A9188]">انقر على زر (+ إضافة أستاذ) تحت كل مادة لإضافة أستاذ جديد فوراً.</p>
        </div>
        <span className="font-mono text-xs font-extrabold text-[#0F3D3E] bg-[#EDF2EE] px-3 py-1 rounded-xl">
          إجمالي الأساتذة: {model.teachers?.length || 0}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {subjects.map((subj, sIdx) => {
          const accent = SUBJECT_ACCENTS.find(a => subj.includes(a.label) || a.name === subj) || {
            color: "#64748B", label: subj, icon: "📚"
          };
          const tList = teachersBySubject[subj] || [];

          return (
            <div
              key={sIdx}
              className="bg-white rounded-2xl border border-[#DCE2D6] overflow-hidden shadow-xs flex flex-col"
            >
              {/* Header Box */}
              <div
                className="p-3 text-white font-extrabold text-xs flex items-center justify-between"
                style={{ backgroundColor: accent.color }}
              >
                <span className="flex items-center gap-1.5">
                  <span>{accent.icon}</span>
                  <span>{subj}</span>
                </span>
                <span className="text-[11px] bg-white/25 px-2 py-0.5 rounded-full font-mono">
                  {tList.length}
                </span>
              </div>

              {/* Body / Teachers List */}
              <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {tList.map((tName, tIdx) => (
                    <div
                      key={tIdx}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#F5F6F0] border border-[#DCE2D6] text-xs font-bold text-[#0F3D3E]"
                    >
                      <span className="truncate">{tName}</span>
                      <button
                        onClick={() => handleRemoveTeacher(tName)}
                        className="text-red-400 hover:text-red-600 transition-colors p-0.5"
                        title="حذف الأستاذ"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {tList.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-xs font-medium">
                      لا يوجد أساتذة
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleAddTeacherToSubject(subj)}
                  className="w-full py-2 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 mt-2"
                  style={{ backgroundColor: accent.color }}
                >
                  <Plus size={14} /> إضافة أستاذ
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   3. الخطوة الثالثة: جدول إسناد الأساتذة للأفواج (الشاشة 3 في الصورة)
   ========================================================================= */
function AssignmentsMatrixStep({ model, updateModel }) {
  const sections = model.sections || [];
  const subjects = model.subjects?.map(s => typeof s === "string" ? s : s.name) || [];
  const teachers = model.teachers?.map(t => typeof t === "string" ? t : t.name) || [];

  // Group activities to find who teaches what section
  // Map: `${sectionName}::${subjectName}` -> teacherName
  const currentAssignments = {};
  (model.activities || []).forEach(act => {
    if (act.students && act.subject) {
      currentAssignments[`${act.students}::${act.subject}`] = act.teacher;
    }
  });

  const handleTeacherAssign = (sectionName, subjectName, teacherName) => {
    const key = `${sectionName}::${subjectName}`;
    let updatedActivities = [...(model.activities || [])];

    // Filter out existing activities for this section and subject
    updatedActivities = updatedActivities.filter(
      a => !(a.students === sectionName && a.subject === subjectName)
    );

    if (teacherName) {
      // Re-add 2 activities (typical 2 periods per subject)
      const nextId1 = (model.activities?.length || 0) + 1;
      const nextId2 = nextId1 + 1;
      updatedActivities.push({
        id: nextId1,
        teacher: teacherName,
        subject: subjectName,
        students: sectionName,
        duration: 1,
        active: true
      });
      updatedActivities.push({
        id: nextId2,
        teacher: teacherName,
        subject: subjectName,
        students: sectionName,
        duration: 1,
        active: true
      });
    }

    updateModel({ activities: updatedActivities });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3.5 rounded-2xl border border-[#DCE2D6] flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-xs text-[#0F3D3E]">مصفوفة إسناد الأساتذة للأفواج التربوية</h4>
          <p className="text-[11px] text-[#8A9188]">اختر لكل قسم ومادة الأستاذ المكلف بتدريسها، وسيتم توليد الأنشطة وتوزيعها تلقائياً.</p>
        </div>
        <span className="font-mono text-xs font-extrabold text-[#0F3D3E] bg-[#EDF2EE] px-3 py-1 rounded-xl">
          إجمالي الأنشطة المسندة: {model.activities?.length || 0}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-[#DCE2D6] overflow-x-auto shadow-xs">
        <table className="w-full text-xs text-right border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-[#0F3D3E] text-white font-extrabold">
              <th className="p-3 border-l border-[#175253] w-24 text-center">القسم</th>
              {subjects.map((subj, idx) => (
                <th key={idx} className="p-2.5 border-l border-[#175253] text-center font-bold text-[11px]">
                  {subj}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF2EE]">
            {sections.map((sec, sIdx) => {
              const secName = typeof sec === "string" ? sec : sec.name;
              return (
                <tr key={sIdx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-extrabold text-center text-[#0F3D3E] bg-[#F5F6F0] border-l border-[#DCE2D6]">
                    {secName}
                  </td>
                  {subjects.map((subj, subjIdx) => {
                    const assignedTeacher = currentAssignments[`${secName}::${subj}`] || "";
                    // Filter teachers of this subject if possible
                    const matchingTeachers = (model.teachers || []).filter(t => {
                      const tSubj = typeof t === "object" ? t.subject : "";
                      return !tSubj || tSubj === subj;
                    }).map(t => typeof t === "string" ? t : t.name);

                    const optionsToDisplay = matchingTeachers.length > 0 ? matchingTeachers : teachers;

                    return (
                      <td key={subjIdx} className="p-1.5 border-l border-[#EDF2EE] text-center">
                        <select
                          value={assignedTeacher}
                          onChange={(e) => handleTeacherAssign(secName, subj, e.target.value)}
                          className={`w-full text-[11px] font-bold py-1.5 px-2 rounded-lg border transition-all ${
                            assignedTeacher
                              ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                              : "bg-white text-gray-400 border-gray-200"
                          }`}
                        >
                          <option value="">— غير مسند —</option>
                          {optionsToDisplay.map((tName, tIdx) => (
                            <option key={tIdx} value={tName}>{tName}</option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================================
   4. الخطوة الرابعة: القيود البيداغوجية والزمنية والمكانية (الشاشة 4 في الصورة)
   ========================================================================= */
function PedagogicalConstraintsStep({ model, updateModel }) {
  const constraints = model.constraints || {};

  const setGeneralConstraint = (key, val) => {
    updateModel({
      constraints: {
        ...constraints,
        generalConstraints: {
          ...(constraints.generalConstraints || {}),
          [key]: val
        }
      }
    });
  };

  const gen = constraints.generalConstraints || {
    maxGapsPerWeekTeachers: 1,
    maxGapsPerDayTeachers: 1,
    minHoursDailyTeachers: 2,
    maxHoursDailyTeachers: 6,
    maxGapsPerWeekStudents: 0,
    studentsStartEarly: true,
    minHoursDailyStudents: 3,
    maxRoomChangesPerDay: 1,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── القيود الزمنية للأساتذة ── */}
        <div className="bg-white rounded-2xl border border-[#DCE2D6] overflow-hidden shadow-xs">
          <div className="bg-[#3B82F6] p-3 text-white font-extrabold text-xs flex items-center gap-2">
            <Sliders size={16} /> القيود الزمنية الخاصة بالأساتذة (FET Time Constraints)
          </div>

          <div className="p-4 space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-[#F5F6F0] rounded-xl border border-[#DCE2D6]">
              <span className="font-bold text-[#0F3D3E]">أقصى فجوات أسبوعية للأساتذة (Max Gaps / Week)</span>
              <input
                type="number"
                min={0}
                max={10}
                value={gen.maxGapsPerWeekTeachers ?? 1}
                onChange={(e) => setGeneralConstraint("maxGapsPerWeekTeachers", Number(e.target.value))}
                className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-[#DCE2D6] bg-white text-[#0F3D3E]"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#F5F6F0] rounded-xl border border-[#DCE2D6]">
              <span className="font-bold text-[#0F3D3E]">أقصى فجوات في يوم حقيقي للأستاذ (Max Gaps / Day)</span>
              <input
                type="number"
                min={0}
                max={4}
                value={gen.maxGapsPerDayTeachers ?? 1}
                onChange={(e) => setGeneralConstraint("maxGapsPerDayTeachers", Number(e.target.value))}
                className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-[#DCE2D6] bg-white text-[#0F3D3E]"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#F5F6F0] rounded-xl border border-[#DCE2D6]">
              <span className="font-bold text-[#0F3D3E]">أدنى حصص يومية لكل أستاذ في يوم عمل (Min Daily)</span>
              <input
                type="number"
                min={1}
                max={6}
                value={gen.minHoursDailyTeachers ?? 2}
                onChange={(e) => setGeneralConstraint("minHoursDailyTeachers", Number(e.target.value))}
                className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-[#DCE2D6] bg-white text-[#0F3D3E]"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#F5F6F0] rounded-xl border border-[#DCE2D6]">
              <span className="font-bold text-[#0F3D3E]">أقصى حصص يومية لكل أستاذ (Max Daily)</span>
              <input
                type="number"
                min={3}
                max={8}
                value={gen.maxHoursDailyTeachers ?? 6}
                onChange={(e) => setGeneralConstraint("maxHoursDailyTeachers", Number(e.target.value))}
                className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-[#DCE2D6] bg-white text-[#0F3D3E]"
              />
            </div>
          </div>
        </div>

        {/* ── القيود الزمنية للطلاب والأفواج ── */}
        <div className="bg-white rounded-2xl border border-[#DCE2D6] overflow-hidden shadow-xs">
          <div className="bg-[#10B981] p-3 text-white font-extrabold text-xs flex items-center gap-2">
            <GraduationCap size={16} /> القيود الزمنية الخاصة بالطلاب والأفواج
          </div>

          <div className="p-4 space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-[#F5F6F0] rounded-xl border border-[#DCE2D6]">
              <span className="font-bold text-[#0F3D3E]">أقصى فجوات أسبوعية للطلاب (Gaps for Students)</span>
              <input
                type="number"
                min={0}
                max={2}
                value={gen.maxGapsPerWeekStudents ?? 0}
                onChange={(e) => setGeneralConstraint("maxGapsPerWeekStudents", Number(e.target.value))}
                className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-[#DCE2D6] bg-white text-[#0F3D3E]"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#F5F6F0] rounded-xl border border-[#DCE2D6]">
              <span className="font-bold text-[#0F3D3E]">كل الطلاب يبدأون باكراً في الحصة الأولى</span>
              <input
                type="checkbox"
                checked={gen.studentsStartEarly !== false}
                onChange={(e) => setGeneralConstraint("studentsStartEarly", e.target.checked)}
                className="w-4 h-4 text-[#0F3D3E] rounded border-gray-300 focus:ring-0"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#F5F6F0] rounded-xl border border-[#DCE2D6]">
              <span className="font-bold text-[#0F3D3E]">أدنى حصص يومية للأفواج في اليوم (Min Hours)</span>
              <input
                type="number"
                min={1}
                max={5}
                value={gen.minHoursDailyStudents ?? 3}
                onChange={(e) => setGeneralConstraint("minHoursDailyStudents", Number(e.target.value))}
                className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-[#DCE2D6] bg-white text-[#0F3D3E]"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#F5F6F0] rounded-xl border border-[#DCE2D6]">
              <span className="font-bold text-[#0F3D3E]">أقصى تغييرات للقاعة في اليوم للقسم الواحد</span>
              <input
                type="number"
                min={0}
                max={4}
                value={gen.maxRoomChangesPerDay ?? 1}
                onChange={(e) => setGeneralConstraint("maxRoomChangesPerDay", Number(e.target.value))}
                className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-[#DCE2D6] bg-white text-[#0F3D3E]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── ربط المواد بالقاعات المفضلة والملاعب والمخابر ── */}
      <div className="bg-white rounded-2xl border border-[#DCE2D6] overflow-hidden shadow-xs">
        <div className="bg-[#8B5CF6] p-3 text-white font-extrabold text-xs flex items-center gap-2">
          <DoorOpen size={16} /> القاعات والمرافق المفضلة للمواد (Subject Preferred Rooms)
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {model.subjects?.map((s, idx) => {
            const sName = typeof s === "string" ? s : s.name;
            const currentRoom = constraints.subjectPreferredRooms?.[sName] || "";

            const handleRoomChange = (roomName) => {
              const nextRooms = { ...(constraints.subjectPreferredRooms || {}) };
              if (roomName) nextRooms[sName] = roomName;
              else delete nextRooms[sName];

              updateModel({
                constraints: {
                  ...constraints,
                  subjectPreferredRooms: nextRooms
                }
              });
            };

            return (
              <div key={idx} className="bg-[#F5F6F0] p-3 rounded-xl border border-[#DCE2D6] flex flex-col gap-1.5">
                <span className="font-bold text-xs text-[#0F3D3E] truncate">{sName}</span>
                <select
                  value={currentRoom}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE2D6] bg-white font-medium text-[#0F3D3E] focus:outline-none"
                >
                  <option value="">أي حجرة عادية (تلقائي)</option>
                  {model.rooms?.map((r, rIdx) => {
                    const rName = typeof r === "string" ? r : r.name;
                    return <option key={rIdx} value={rName}>{rName}</option>;
                  })}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   5. الخطوة الخامسة: شبكة تفريغات الأساتذة وأنصاف الأيام (الشاشة 5 في الصورة)
   ========================================================================= */
function UnavailabilityGridStep({ model, updateModel }) {
  const days = model.days || ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const hours = model.hours || [];
  const teachers = model.teachers || [];
  const constraints = model.constraints || {};
  const unavailMap = constraints.teacherNotAvailableTimes || {};

  // Quick Half-day / Day bulk assign by Subject (Like top bar in Image 5)
  const applySubjectBulkHalfDay = (subjectName, dayName, period = "all") => {
    const matchingTeachers = teachers.filter(t => {
      const tSubj = typeof t === "object" ? t.subject : "";
      return tSubj === subjectName;
    }).map(t => typeof t === "string" ? t : t.name);

    if (matchingTeachers.length === 0) return;

    const nextUnavail = { ...unavailMap };
    matchingTeachers.forEach(tName => {
      let slots = nextUnavail[tName] ? [...nextUnavail[tName]] : [];
      let targetHours = hours;
      if (period === "morning") {
        targetHours = hours.slice(0, Math.ceil(hours.length / 2));
      } else if (period === "afternoon") {
        targetHours = hours.slice(Math.ceil(hours.length / 2));
      }

      targetHours.forEach(h => {
        if (!slots.some(s => s.day === dayName && s.hour === h)) {
          slots.push({ day: dayName, hour: h });
        }
      });
      nextUnavail[tName] = slots;
    });

    updateModel({
      constraints: {
        ...constraints,
        teacherNotAvailableTimes: nextUnavail
      }
    });
  };

  const toggleTeacherSlot = (teacherName, day, hour) => {
    const currentSlots = unavailMap[teacherName] || [];
    const isUnavail = currentSlots.some(s => s.day === day && s.hour === hour);
    let updated = [];
    if (isUnavail) {
      updated = currentSlots.filter(s => !(s.day === day && s.hour === hour));
    } else {
      updated = [...currentSlots, { day, hour }];
    }

    updateModel({
      constraints: {
        ...constraints,
        teacherNotAvailableTimes: {
          ...unavailMap,
          [teacherName]: updated
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* ── شريط التفريغات السريعة لمادة كاملة ── */}
      <div className="bg-[#0F3D3E] p-4 rounded-2xl text-white shadow-xs">
        <h4 className="font-extrabold text-xs text-[#E3A857] mb-2 flex items-center gap-2">
          <Clock size={16} /> التفريغ السريع للأساتذة وأنصاف الأيام البيداغوجية
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          {model.subjects?.slice(0, 6).map((s, idx) => {
            const sName = typeof s === "string" ? s : s.name;
            return (
              <div key={idx} className="flex items-center gap-1 bg-white/10 p-1.5 rounded-xl text-[11px] font-bold">
                <span>{sName}:</span>
                <button
                  onClick={() => applySubjectBulkHalfDay(sName, "الثلاثاء", "afternoon")}
                  className="bg-white/20 hover:bg-[#3F7859] px-2 py-0.5 rounded transition-all"
                >
                  مساء الثلاثاء
                </button>
                <button
                  onClick={() => applySubjectBulkHalfDay(sName, "الخميس", "afternoon")}
                  className="bg-white/20 hover:bg-[#3F7859] px-2 py-0.5 rounded transition-all"
                >
                  مساء الخميس
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── شبكة تفريغات الأساتذة الكاملة (Full Matrix Grid from Image 5) ── */}
      <div className="bg-white rounded-2xl border border-[#DCE2D6] overflow-x-auto shadow-xs">
        <table className="w-full text-xs text-center border-collapse min-w-[950px]">
          <thead>
            <tr className="bg-[#0F3D3E] text-white font-extrabold">
              <th className="p-3 border-l border-[#175253] w-28 text-right">المادة</th>
              <th className="p-3 border-l border-[#175253] w-32 text-right">الأستاذ</th>
              {days.map((day, dIdx) => (
                <th
                  key={dIdx}
                  colSpan={hours.length}
                  className="p-2 border-l border-[#175253] font-bold text-xs bg-[#175253]"
                >
                  {day}
                </th>
              ))}
            </tr>
            <tr className="bg-[#F5F6F0] text-[#0F3D3E] font-bold text-[10px]">
              <th className="p-1 border-l border-[#DCE2D6] bg-white"></th>
              <th className="p-1 border-l border-[#DCE2D6] bg-white"></th>
              {days.map((day, dIdx) =>
                hours.map((h, hIdx) => (
                  <th key={`${dIdx}-${hIdx}`} className="p-1 border-l border-[#DCE2D6] w-7">
                    {hIdx + 1}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF2EE]">
            {teachers.map((t, tIdx) => {
              const tName = typeof t === "string" ? t : t.name;
              const tSubj = typeof t === "object" ? t.subject : "";
              const slots = unavailMap[tName] || [];

              return (
                <tr key={tIdx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2 font-bold text-right text-[#0F3D3E] bg-[#F5F6F0] border-l border-[#DCE2D6] truncate max-w-[120px]">
                    {tSubj || "—"}
                  </td>
                  <td className="p-2 font-bold text-right text-[#0F3D3E] border-l border-[#DCE2D6] truncate max-w-[130px]">
                    {tName}
                  </td>
                  {days.map((day, dIdx) =>
                    hours.map((h, hIdx) => {
                      const isUnavail = slots.some(s => s.day === day && s.hour === h);
                      return (
                        <td
                          key={`${dIdx}-${hIdx}`}
                          onClick={() => toggleTeacherSlot(tName, day, h)}
                          className={`p-1 border-l border-[#EDF2EE] cursor-pointer transition-all select-none ${
                            isUnavail
                              ? "bg-red-500 text-white font-extrabold hover:bg-red-600"
                              : "bg-emerald-50/50 text-transparent hover:bg-emerald-200"
                          }`}
                          title={isUnavail ? "حصة مفرغة (انقر للإلغاء)" : "حصة متاحة (انقر للتفريغ)"}
                        >
                          <div className="w-5 h-5 mx-auto flex items-center justify-center text-[10px]">
                            {isUnavail ? "X" : ""}
                          </div>
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
