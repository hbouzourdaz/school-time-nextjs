"use client";
import { useState } from "react";
import {
  Users, BookOpen, GraduationCap, DoorOpen, Layers, Clock, ShieldAlert,
  Plus, Trash2, Edit2, Check, X, AlertCircle, Sparkles, Sliders
} from "lucide-react";

export default function FetConstraintEditor({ model, onChange }) {
  const [activeTab, setActiveTab] = useState("teachers");

  const updateModel = (updater) => {
    onChange((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      return next;
    });
  };

  const tabs = [
    { key: "teachers", label: "الأساتذة", count: model.teachers?.length || 0, icon: Users },
    { key: "subjects", label: "المواد", count: model.subjects?.length || 0, icon: BookOpen },
    { key: "sections", label: "الأقسام", count: model.sections?.length || 0, icon: GraduationCap },
    { key: "rooms", label: "القاعات", count: model.rooms?.length || 0, icon: DoorOpen },
    { key: "activities", label: "الأنشطة", count: model.activities?.length || 0, icon: Layers },
    { key: "constraints", label: "القيود المتقدمة", count: countConstraints(model.constraints), icon: Sliders },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#DCE2D6] overflow-hidden shadow-sm">
      {/* Tabs Bar */}
      <div className="flex border-b border-[#EDF2EE] bg-[#F5F6F0] overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                isActive
                  ? "border-[#0F3D3E] text-[#0F3D3E] bg-white shadow-sm"
                  : "border-transparent text-[#8A9188] hover:text-[#0F3D3E] hover:bg-white/50"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isActive ? "bg-[#EDF2EE] text-[#0F3D3E]" : "bg-gray-200 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Body */}
      <div className="p-5">
        {activeTab === "teachers" && <TeachersTab model={model} updateModel={updateModel} />}
        {activeTab === "subjects" && <SubjectsTab model={model} updateModel={updateModel} />}
        {activeTab === "sections" && <SectionsTab model={model} updateModel={updateModel} />}
        {activeTab === "rooms" && <RoomsTab model={model} updateModel={updateModel} />}
        {activeTab === "activities" && <ActivitiesTab model={model} updateModel={updateModel} />}
        {activeTab === "constraints" && <ConstraintsTab model={model} updateModel={updateModel} />}
      </div>
    </div>
  );
}

function countConstraints(constraints) {
  if (!constraints) return 0;
  let count = 0;
  if (constraints.teacherNotAvailableTimes) {
    Object.values(constraints.teacherNotAvailableTimes).forEach((arr) => {
      if (arr && arr.length > 0) count++;
    });
  }
  if (constraints.teacherMaxHoursDaily) {
    count += Object.keys(constraints.teacherMaxHoursDaily).length;
  }
  if (constraints.teacherMaxDaysPerWeek) {
    count += Object.keys(constraints.teacherMaxDaysPerWeek).length;
  }
  if (constraints.subjectPreferredRooms) {
    count += Object.keys(constraints.subjectPreferredRooms).length;
  }
  return count;
}

/* ==========================================
   1. Teachers Tab
   ========================================== */
function TeachersTab({ model, updateModel }) {
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherSubject, setNewTeacherSubject] = useState(model.subjects?.[0] || "");

  const handleAdd = () => {
    if (!newTeacherName.trim()) return;
    updateModel((prev) => ({
      ...prev,
      teachers: [
        ...prev.teachers,
        { name: newTeacherName.trim(), subject: newTeacherSubject, targetHours: 18 }
      ]
    }));
    setNewTeacherName("");
  };

  const handleRemove = (index) => {
    const teacherToRemove = model.teachers[index]?.name;
    updateModel((prev) => ({
      ...prev,
      teachers: prev.teachers.filter((_, i) => i !== index),
      // Also clean up constraints for this teacher
      constraints: {
        ...prev.constraints,
        teacherNotAvailableTimes: Object.fromEntries(
          Object.entries(prev.constraints?.teacherNotAvailableTimes || {}).filter(([k]) => k !== teacherToRemove)
        ),
        teacherMaxHoursDaily: Object.fromEntries(
          Object.entries(prev.constraints?.teacherMaxHoursDaily || {}).filter(([k]) => k !== teacherToRemove)
        ),
        teacherMaxDaysPerWeek: Object.fromEntries(
          Object.entries(prev.constraints?.teacherMaxDaysPerWeek || {}).filter(([k]) => k !== teacherToRemove)
        )
      }
    }));
  };

  return (
    <div className="space-y-4">
      {/* Add New Teacher */}
      <div className="bg-[#F5F6F0] p-4 rounded-xl border border-[#DCE2D6] flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={newTeacherName}
          onChange={(e) => setNewTeacherName(e.target.value)}
          placeholder="اسم الأستاذ الجديد (مثلاً: أ. أحمد)"
          className="flex-1 min-w-[200px] px-3 py-2 text-xs rounded-lg border border-[#DCE2D6] bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3D3E]"
        />
        <select
          value={newTeacherSubject}
          onChange={(e) => setNewTeacherSubject(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-[#DCE2D6] bg-white font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D3E]"
        >
          {model.subjects?.map((s, i) => (
            <option key={i} value={typeof s === "string" ? s : s.name}>
              {typeof s === "string" ? s : s.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          className="bg-[#0F3D3E] hover:bg-[#175253] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <Plus size={14} /> إضافة أستاذ
        </button>
      </div>

      {/* Teachers List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
        {model.teachers?.map((t, idx) => {
          const tName = typeof t === "string" ? t : t.name;
          const tSubj = typeof t === "object" ? t.subject : "";
          const hasUnavail =
            model.constraints?.teacherNotAvailableTimes?.[tName]?.length > 0;
          return (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#DCE2D6] hover:border-[#0F3D3E] transition-all shadow-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-xs text-[#0F3D3E] truncate">{tName}</p>
                  {hasUnavail && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="يحتوي على تفريغات" />
                  )}
                </div>
                {tSubj && <p className="text-[10px] text-[#8A9188] truncate">{tSubj}</p>}
              </div>
              <button
                onClick={() => handleRemove(idx)}
                className="text-[#8A9188] hover:text-red-600 p-1 rounded-lg transition-colors ml-1"
                title="حذف الأستاذ"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================
   2. Subjects Tab
   ========================================== */
function SubjectsTab({ model, updateModel }) {
  const [newSubject, setNewSubject] = useState("");

  const handleAdd = () => {
    if (!newSubject.trim()) return;
    updateModel((prev) => ({
      ...prev,
      subjects: [...prev.subjects, newSubject.trim()]
    }));
    setNewSubject("");
  };

  const handleRemove = (index) => {
    updateModel((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-4">
      {/* Add New Subject */}
      <div className="bg-[#F5F6F0] p-4 rounded-xl border border-[#DCE2D6] flex items-center gap-3">
        <input
          type="text"
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          placeholder="اسم المادة الجديدة (مثلاً: اللغة العربية، الرياضيات...)"
          className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#DCE2D6] bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3D3E]"
        />
        <button
          onClick={handleAdd}
          className="bg-[#0F3D3E] hover:bg-[#175253] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <Plus size={14} /> إضافة مادة
        </button>
      </div>

      {/* Subjects List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto pr-1">
        {model.subjects?.map((s, idx) => {
          const sName = typeof s === "string" ? s : s.name;
          return (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#DCE2D6] shadow-xs"
            >
              <span className="font-bold text-xs text-[#0F3D3E] truncate">{sName}</span>
              <button
                onClick={() => handleRemove(idx)}
                className="text-[#8A9188] hover:text-red-600 p-1 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================
   3. Sections Tab
   ========================================== */
function SectionsTab({ model, updateModel }) {
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionYear, setNewSectionYear] = useState("الأقسام");

  const handleAdd = () => {
    if (!newSectionName.trim()) return;
    updateModel((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        { name: newSectionName.trim(), year: newSectionYear.trim() || "الأقسام" }
      ]
    }));
    setNewSectionName("");
  };

  const handleRemove = (index) => {
    updateModel((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-4">
      {/* Add New Section */}
      <div className="bg-[#F5F6F0] p-4 rounded-xl border border-[#DCE2D6] flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={newSectionName}
          onChange={(e) => setNewSectionName(e.target.value)}
          placeholder="اسم القسم / الفوج (مثلاً: 1م1، 2ع1...)"
          className="flex-1 min-w-[160px] px-3 py-2 text-xs rounded-lg border border-[#DCE2D6] bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3D3E]"
        />
        <input
          type="text"
          value={newSectionYear}
          onChange={(e) => setNewSectionYear(e.target.value)}
          placeholder="المستوى / السنة (مثلاً: الأولى متوسط)"
          className="w-48 px-3 py-2 text-xs rounded-lg border border-[#DCE2D6] bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3D3E]"
        />
        <button
          onClick={handleAdd}
          className="bg-[#0F3D3E] hover:bg-[#175253] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <Plus size={14} /> إضافة قسم
        </button>
      </div>

      {/* Sections List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto pr-1">
        {model.sections?.map((sec, idx) => {
          const sName = typeof sec === "string" ? sec : sec.name;
          const sYear = typeof sec === "object" ? sec.year : "";
          return (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#DCE2D6] shadow-xs"
            >
              <div className="min-w-0">
                <p className="font-bold text-xs text-[#0F3D3E] truncate">{sName}</p>
                {sYear && <p className="text-[10px] text-[#8A9188] truncate">{sYear}</p>}
              </div>
              <button
                onClick={() => handleRemove(idx)}
                className="text-[#8A9188] hover:text-red-600 p-1 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================
   4. Rooms Tab
   ========================================== */
function RoomsTab({ model, updateModel }) {
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState("standard");
  const [newRoomCap, setNewRoomCap] = useState("40");

  const roomTypes = [
    { key: "standard", label: "حجرة عادية" },
    { key: "lab", label: "مخبر علوم / فيزياء" },
    { key: "workshop", label: "ورشة تكنولوجيا" },
    { key: "computer", label: "قاعة إعلام آلي" },
    { key: "sports", label: "ملعب / قاعة رياضة" },
  ];

  const handleAdd = () => {
    if (!newRoomName.trim()) return;
    updateModel((prev) => ({
      ...prev,
      rooms: [
        ...prev.rooms,
        {
          name: newRoomName.trim(),
          type: newRoomType,
          capacity: Number(newRoomCap) || 40
        }
      ]
    }));
    setNewRoomName("");
  };

  const handleRemove = (index) => {
    updateModel((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-4">
      {/* Add New Room */}
      <div className="bg-[#F5F6F0] p-4 rounded-xl border border-[#DCE2D6] flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="اسم القاعة (مثلاً: حجرة 1، مخبر 2...)"
          className="flex-1 min-w-[160px] px-3 py-2 text-xs rounded-lg border border-[#DCE2D6] bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3D3E]"
        />
        <select
          value={newRoomType}
          onChange={(e) => setNewRoomType(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-[#DCE2D6] bg-white font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D3E]"
        >
          {roomTypes.map((rt) => (
            <option key={rt.key} value={rt.key}>
              {rt.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          className="bg-[#0F3D3E] hover:bg-[#175253] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <Plus size={14} /> إضافة قاعة
        </button>
      </div>

      {/* Rooms List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto pr-1">
        {model.rooms?.map((r, idx) => {
          const rName = typeof r === "string" ? r : r.name;
          const rType = typeof r === "object" ? r.type : "standard";
          const typeLabel = roomTypes.find((t) => t.key === rType)?.label || "حجرة";
          return (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#DCE2D6] shadow-xs"
            >
              <div className="min-w-0">
                <p className="font-bold text-xs text-[#0F3D3E] truncate">{rName}</p>
                <p className="text-[10px] text-[#8A9188] truncate">{typeLabel}</p>
              </div>
              <button
                onClick={() => handleRemove(idx)}
                className="text-[#8A9188] hover:text-red-600 p-1 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================
   5. Activities Tab
   ========================================== */
function ActivitiesTab({ model, updateModel }) {
  const [teacher, setTeacher] = useState(
    model.teachers?.[0]?.name || model.teachers?.[0] || ""
  );
  const [subject, setSubject] = useState(
    model.subjects?.[0]?.name || model.subjects?.[0] || ""
  );
  const [students, setStudents] = useState(
    model.sections?.[0]?.name || model.sections?.[0] || ""
  );
  const [duration, setDuration] = useState(1);

  const handleAdd = () => {
    if (!subject || !students) return;
    const newId = (model.activities?.length || 0) + 1;
    updateModel((prev) => ({
      ...prev,
      activities: [
        ...prev.activities,
        {
          id: newId,
          teacher: teacher || "أستاذ عام",
          subject,
          students,
          duration: Number(duration) || 1,
          active: true
        }
      ]
    }));
  };

  const handleRemove = (id) => {
    updateModel((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id)
    }));
  };

  return (
    <div className="space-y-4">
      {/* Add New Activity */}
      <div className="bg-[#F5F6F0] p-4 rounded-xl border border-[#DCE2D6] flex flex-wrap items-center gap-3">
        <select
          value={teacher}
          onChange={(e) => setTeacher(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-[#DCE2D6] bg-white font-semibold flex-1 min-w-[140px]"
        >
          {model.teachers?.map((t, i) => {
            const name = typeof t === "string" ? t : t.name;
            return <option key={i} value={name}>{name}</option>;
          })}
        </select>

        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-[#DCE2D6] bg-white font-semibold flex-1 min-w-[140px]"
        >
          {model.subjects?.map((s, i) => {
            const name = typeof s === "string" ? s : s.name;
            return <option key={i} value={name}>{name}</option>;
          })}
        </select>

        <select
          value={students}
          onChange={(e) => setStudents(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-[#DCE2D6] bg-white font-semibold flex-1 min-w-[140px]"
        >
          {model.sections?.map((sec, i) => {
            const name = typeof sec === "string" ? sec : sec.name;
            return <option key={i} value={name}>{name}</option>;
          })}
        </select>

        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="px-3 py-2 text-xs rounded-lg border border-[#DCE2D6] bg-white font-bold w-24"
        >
          <option value={1}>1 ساعة</option>
          <option value={2}>2 ساعة</option>
        </select>

        <button
          onClick={handleAdd}
          className="bg-[#0F3D3E] hover:bg-[#175253] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <Plus size={14} /> إضافة حصة
        </button>
      </div>

      {/* Activities Table */}
      <div className="overflow-x-auto border border-[#DCE2D6] rounded-xl max-h-96 overflow-y-auto">
        <table className="w-full text-xs text-right min-w-[600px]">
          <thead className="bg-[#EDF2EE] text-[#0F3D3E] font-bold sticky top-0">
            <tr>
              <th className="p-3 w-12 text-center">#</th>
              <th className="p-3">الأستاذ</th>
              <th className="p-3">المادة</th>
              <th className="p-3">الفوج / القسم</th>
              <th className="p-3 text-center">المدة</th>
              <th className="p-3 text-center w-16">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF2EE]">
            {model.activities?.map((act, i) => (
              <tr key={act.id || i} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-semibold text-[#8A9188] text-center">{act.id || i + 1}</td>
                <td className="p-3 font-semibold text-[#0F3D3E]">{act.teacher || "—"}</td>
                <td className="p-3 font-semibold">{act.subject}</td>
                <td className="p-3 text-[#3F7859] font-bold">{act.students}</td>
                <td className="p-3 text-center font-bold">{act.duration}h</td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => handleRemove(act.id)}
                    className="text-[#8A9188] hover:text-red-600 p-1 rounded-lg transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ==========================================
   6. Advanced Constraints Tab
   ========================================== */
function ConstraintsTab({ model, updateModel }) {
  const [selectedTeacher, setSelectedTeacher] = useState(
    model.teachers?.[0]?.name || model.teachers?.[0] || ""
  );

  const days = model.days || ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const hours = model.hours || [];

  // Teacher Not Available Times
  const teacherUnavail = model.constraints?.teacherNotAvailableTimes?.[selectedTeacher] || [];

  const isSlotUnavailable = (day, hour) => {
    return teacherUnavail.some((s) => s.day === day && s.hour === hour);
  };

  const toggleSlot = (day, hour) => {
    const isUnavail = isSlotUnavailable(day, hour);
    let updatedSlots = [];
    if (isUnavail) {
      updatedSlots = teacherUnavail.filter((s) => !(s.day === day && s.hour === hour));
    } else {
      updatedSlots = [...teacherUnavail, { day, hour }];
    }

    updateModel((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        teacherNotAvailableTimes: {
          ...(prev.constraints?.teacherNotAvailableTimes || {}),
          [selectedTeacher]: updatedSlots
        }
      }
    }));
  };

  // Quick preset actions for the selected teacher
  const setPreset = (action) => {
    let slots = [...teacherUnavail];
    if (action === "clear") {
      slots = [];
    } else if (action === "tuesday_pm") {
      // Half day Tuesday afternoon
      hours.slice(Math.floor(hours.length / 2)).forEach((h) => {
        if (!slots.some((s) => s.day === "الثلاثاء" && s.hour === h)) {
          slots.push({ day: "الثلاثاء", hour: h });
        }
      });
    } else if (action === "thursday_pm") {
      hours.slice(Math.floor(hours.length / 2)).forEach((h) => {
        if (!slots.some((s) => s.day === "الخميس" && s.hour === h)) {
          slots.push({ day: "الخميس", hour: h });
        }
      });
    }

    updateModel((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        teacherNotAvailableTimes: {
          ...(prev.constraints?.teacherNotAvailableTimes || {}),
          [selectedTeacher]: slots
        }
      }
    }));
  };

  // Teacher Max Hours Daily
  const maxHoursDaily = model.constraints?.teacherMaxHoursDaily?.[selectedTeacher] || 6;
  const setMaxHoursDaily = (val) => {
    updateModel((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        teacherMaxHoursDaily: {
          ...(prev.constraints?.teacherMaxHoursDaily || {}),
          [selectedTeacher]: Number(val) || 6
        }
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* ── Section A: Teacher Availability Grid ── */}
      <div className="bg-[#F5F6F0] p-4 sm:p-5 rounded-2xl border border-[#DCE2D6]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="font-bold text-sm text-[#0F3D3E] flex items-center gap-2">
              <Clock size={16} />
              أوقات وتفريغات الأساتذة (Teacher Not Available Times)
            </h4>
            <p className="text-[11px] text-[#8A9188] mt-0.5">
              انقر على أي حصة في الجدول لجعلها <span className="text-red-600 font-bold">غير متاحة (تفريغ)</span> للأستاذ المحدد
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#8A9188]">اختر الأستاذ:</span>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#DCE2D6] bg-white font-bold text-[#0F3D3E] focus:outline-none focus:ring-1 focus:ring-[#0F3D3E]"
            >
              {model.teachers?.map((t, i) => {
                const name = typeof t === "string" ? t : t.name;
                return <option key={i} value={name}>{name}</option>;
              })}
            </select>
          </div>
        </div>

        {/* Quick presets buttons */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[10px] font-bold text-[#8A9188]">تفريغ سريع:</span>
          <button
            onClick={() => setPreset("tuesday_pm")}
            className="text-[10px] font-bold bg-white border border-[#DCE2D6] hover:border-[#0F3D3E] px-2.5 py-1 rounded-lg text-[#0F3D3E] transition-all"
          >
            + تفريغ مساء الثلاثاء
          </button>
          <button
            onClick={() => setPreset("thursday_pm")}
            className="text-[10px] font-bold bg-white border border-[#DCE2D6] hover:border-[#0F3D3E] px-2.5 py-1 rounded-lg text-[#0F3D3E] transition-all"
          >
            + تفريغ مساء الخميس
          </button>
          <button
            onClick={() => setPreset("clear")}
            className="text-[10px] font-bold bg-white border border-red-200 text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-all"
          >
            إلغاء كل التفريغات
          </button>
        </div>

        {/* Interactive Availability Grid */}
        <div className="overflow-x-auto border border-[#DCE2D6] rounded-xl bg-white shadow-xs">
          <table className="w-full border-collapse text-xs text-center min-w-[500px]">
            <thead>
              <tr className="bg-[#0F3D3E] text-white font-bold">
                <th className="p-2.5 border-l border-[#175253] w-24">اليوم</th>
                {hours.map((h, i) => (
                  <th key={i} className="p-2 border-l border-[#175253] font-medium text-[11px]">
                    {h.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day, dIdx) => (
                <tr key={dIdx} className="border-b border-[#EDF2EE]">
                  <td className="p-2.5 border-l border-[#EDF2EE] font-bold text-[#0F3D3E] bg-[#EDF2EE]/50">
                    {day}
                  </td>
                  {hours.map((hour, hIdx) => {
                    const unavail = isSlotUnavailable(day, hour);
                    return (
                      <td
                        key={hIdx}
                        onClick={() => toggleSlot(day, hour)}
                        className={`p-2 border-l border-[#EDF2EE] cursor-pointer transition-all select-none ${
                          unavail
                            ? "bg-red-50 text-red-700 font-extrabold hover:bg-red-100"
                            : "bg-emerald-50/40 text-emerald-800 font-semibold hover:bg-emerald-100/60"
                        }`}
                        title={unavail ? "حصة غير متاحة (انقر لجعلها متاحة)" : "حصة متاحة (انقر للتفريغ)"}
                      >
                        <div className="flex items-center justify-center py-1">
                          {unavail ? (
                            <span className="text-[11px] font-bold flex items-center gap-1 text-red-600">
                              <X size={13} /> تفريغ
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-700 flex items-center gap-0.5 opacity-70">
                              <Check size={13} /> متاح
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary for selected teacher */}
        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-[#8A9188]">
          <span>إجمالي الحصص المفرغة: <strong className="text-red-600">{teacherUnavail.length}</strong> حصة</span>
          <div className="flex items-center gap-2">
            <span>الحد الأقصى للحصص باليوم:</span>
            <input
              type="number"
              min={1}
              max={8}
              value={maxHoursDaily}
              onChange={(e) => setMaxHoursDaily(e.target.value)}
              className="w-14 px-2 py-1 text-center font-bold rounded border border-[#DCE2D6] bg-white text-[#0F3D3E]"
            />
          </div>
        </div>
      </div>

      {/* ── Section B: Preferred Rooms for Subjects ── */}
      <div className="bg-[#F5F6F0] p-4 sm:p-5 rounded-2xl border border-[#DCE2D6]">
        <h4 className="font-bold text-sm text-[#0F3D3E] flex items-center gap-2 mb-3">
          <DoorOpen size={16} />
          ربط المواد بالقاعات والمخابر المفضلة (Subject Preferred Rooms)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {model.subjects?.map((s, idx) => {
            const sName = typeof s === "string" ? s : s.name;
            const currentRoom = model.constraints?.subjectPreferredRooms?.[sName] || "";

            const handleRoomChange = (roomName) => {
              updateModel((prev) => {
                const nextRooms = { ...(prev.constraints?.subjectPreferredRooms || {}) };
                if (roomName) nextRooms[sName] = roomName;
                else delete nextRooms[sName];

                return {
                  ...prev,
                  constraints: {
                    ...prev.constraints,
                    subjectPreferredRooms: nextRooms
                  }
                };
              });
            };

            return (
              <div key={idx} className="bg-white p-3 rounded-xl border border-[#DCE2D6] flex flex-col gap-1.5">
                <span className="font-bold text-xs text-[#0F3D3E] truncate">{sName}</span>
                <select
                  value={currentRoom}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE2D6] bg-white font-medium text-[#8A9188] focus:text-[#0F3D3E] focus:outline-none"
                >
                  <option value="">أي قاعة عادية (تلقائي)</option>
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
