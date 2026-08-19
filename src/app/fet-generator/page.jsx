"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Upload, FileText, Users, BookOpen, Home as HomeIcon,
  Layers, Play, RefreshCw, Download, Trash2, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, GraduationCap, DoorOpen, Clock, Eye, ExternalLink, Timer,
  XCircle, X
} from "lucide-react";
import { Navbar } from "@/components/ui";

/* ═══════════════════════════════════════════════════
   FET XML Parser – runs entirely in the browser
   ═══════════════════════════════════════════════════ */
function parseFetXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("صيغة الملف غير صالحة: ليس ملف XML سليم.");

  const getText = (parent, tag) => {
    const el = parent?.querySelector(tag);
    return el?.textContent?.trim() || "";
  };

  const institution = getText(doc, "Institution_Name") || "غير محدد";

  // Days
  const dayEls = doc.querySelectorAll("Days_List > Day");
  const days = Array.from(dayEls).map(d => getText(d, "Name")).filter(Boolean);

  // Hours
  const hourEls = doc.querySelectorAll("Hours_List > Hour");
  const hours = Array.from(hourEls).map(h => getText(h, "Name")).filter(Boolean);

  // Teachers
  const teacherEls = doc.querySelectorAll("Teachers_List > Teacher");
  const teachers = Array.from(teacherEls).map(t => getText(t, "Name")).filter(Boolean);

  // Subjects
  const subjectEls = doc.querySelectorAll("Subjects_List > Subject");
  const subjects = Array.from(subjectEls).map(s => getText(s, "Name")).filter(Boolean);

  // Students – collect Year names, Group names, Subgroup names
  const studentNames = new Set();
  doc.querySelectorAll("Students_List > Year").forEach(y => {
    const yearName = getText(y, "Name");
    if (yearName) studentNames.add(yearName);
    y.querySelectorAll("Group").forEach(g => {
      const groupName = getText(g, "Name");
      if (groupName) studentNames.add(groupName);
      g.querySelectorAll("Subgroup").forEach(sg => {
        const subName = getText(sg, "Name");
        if (subName) studentNames.add(subName);
      });
    });
  });
  const sections = Array.from(studentNames);

  // Rooms
  const roomEls = doc.querySelectorAll("Rooms_List > Room");
  const rooms = Array.from(roomEls).map(r => getText(r, "Name")).filter(Boolean);

  // Activities
  const actEls = doc.querySelectorAll("Activities_List > Activity");
  const activities = Array.from(actEls).map(a => {
    const studentsTags = a.querySelectorAll("Students");
    const studentsArr = Array.from(studentsTags).map(s => s.textContent?.trim()).filter(Boolean);

    return {
      id: getText(a, "Id"),
      teacher: getText(a, "Teacher"),
      subject: getText(a, "Subject"),
      students: studentsArr.join(" + "),
      duration: parseInt(getText(a, "Duration")) || 1,
      room: "",
      active: getText(a, "Active") !== "false"
    };
  }).filter(a => a.active);

  return { institution, days, hours, teachers, subjects, sections, rooms, activities };
}

/* ═══════════════════════════════════════════════════
   Colour palette for subject cells
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
  { bg: "#FDE8E8", border: "#C0392B", text: "#6B1515" },
  { bg: "#E6F9F0", border: "#27AE60", text: "#145C32" },
];
function getSubjectColor(subject, allSubjects) {
  const idx = allSubjects.indexOf(subject);
  return CELL_COLORS[idx >= 0 ? idx % CELL_COLORS.length : 0];
}

/* ═══════════════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════════════ */
export default function FetGeneratorPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  // Step: "upload" → "review" → "generating" → "result"
  const [step, setStep] = useState("upload");

  // File & parsed data
  const [fileName, setFileName] = useState("");
  const [rawXml, setRawXml] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [parseError, setParseError] = useState("");

  // Solver
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingDestination, setPendingDestination] = useState(null);
  const [engineError, setEngineError] = useState("");
  const [solvedTimetable, setSolvedTimetable] = useState(null);
  const [solverStats, setSolverStats] = useState(null);
  const [resultFetContent, setResultFetContent] = useState("");
  const [htmlFiles, setHtmlFiles] = useState({});
  const [softConflicts, setSoftConflicts] = useState("");
  const [engineOutput, setEngineOutput] = useState("");
  const [timeLimit, setTimeLimit] = useState(300);
  const abortControllerRef = useRef(null);

  // View
  const [activeFilter, setActiveFilter] = useState("students");
  const [selectedFilterValue, setSelectedFilterValue] = useState("");
  const [activeHtmlTab, setActiveHtmlTab] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [placedActivities, setPlacedActivities] = useState(0);
  const [runId, setRunId] = useState("");

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    teachers: true, subjects: true, sections: true, rooms: true, activities: true
  });
  const toggleSection = (key) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Drag-n-drop
  const [isDragging, setIsDragging] = useState(false);

  // Timer & Warning hooks
  useEffect(() => {
    let interval = null;
    let pollInterval = null;
    
    if (isGenerating) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      if (runId) {
        pollInterval = setInterval(async () => {
          try {
            const res = await fetch(`/api/fet/status?runId=${runId}`);
            const data = await res.json();
            if (data.success && data.placed > 0) {
              setPlacedActivities(data.placed);
            }
          } catch (e) {
            // ignore
          }
        }, 1000);
      }
    } else {
      clearInterval(interval);
      if (pollInterval) clearInterval(pollInterval);
    }
    
    return () => {
      clearInterval(interval);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isGenerating, runId]);

  // Handle Browser Back Button & Unload Trapping
  useEffect(() => {
    if (!isGenerating) return;

    // Push dummy state to capture back button
    window.history.pushState({ inGeneration: true }, "", window.location.href);

    const handlePopState = (e) => {
      // Re-push state so user stays on the page
      window.history.pushState({ inGeneration: true }, "", window.location.href);
      setPendingDestination("back");
      setShowCancelModal(true);
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "جاري توليد الجدول، هل أنت متأكد من رغبتك في المغادرة؟ سيؤدي ذلك إلى إيقاف العملية.";
      return e.returnValue;
    };

    // Global link click interceptor (Navbar, internal links, etc.)
    const handleDocumentClick = (e) => {
      const targetLink = e.target.closest("a, button[data-href]");
      if (targetLink) {
        const href = targetLink.getAttribute("href") || targetLink.getAttribute("data-href");
        if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
          e.preventDefault();
          e.stopPropagation();
          setPendingDestination(href);
          setShowCancelModal(true);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isGenerating]);

  /* ────── File handling ────── */
  const processFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.endsWith(".fet")) {
      setParseError("يُرجى رفع ملف بصيغة .fet فقط.");
      return;
    }
    setParseError("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlText = e.target.result;
        setRawXml(xmlText);
        const data = parseFetXml(xmlText);
        setParsedData(data);
        setStep("review");
      } catch (err) {
        setParseError(err.message || "فشل تحليل الملف.");
      }
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleFileInput = (e) => processFile(e.target.files?.[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  /* ────── Reset ────── */
  const resetAll = () => {
    setStep("upload");
    setFileName("");
    setRawXml("");
    setParsedData(null);
    setParseError("");
    setSolvedTimetable(null);
    setSolverStats(null);
    setResultFetContent("");
    setHtmlFiles({});
    setSoftConflicts("");
    setEngineOutput("");
    setEngineError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ────── Real FET generation ────── */
  const handleGenerate = async () => {
    if (!rawXml) return;
    
    const newRunId = Date.now().toString();
    setRunId(newRunId);
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setEngineError("");
    setSolvedTimetable(null);
    setElapsedSeconds(0);
    setPlacedActivities(0);
    setStep("generating");

    try {
      const res = await fetch("/api/fet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          xmlContent: rawXml,
          timeLimit,
          runId: newRunId
        })
      });
      const result = await res.json();

      if (result.success) {
        setSolvedTimetable(result.timetable);
        setSolverStats(result.stats);
        setResultFetContent(result.resultFetContent || "");
        setHtmlFiles(result.htmlFiles || {});
        setSoftConflicts(result.softConflicts || "");
        setEngineOutput(result.engineOutput || "");
        setStep("result");

        // Set initial filter
        if (parsedData.sections.length > 0) {
          setActiveFilter("students");
          setSelectedFilterValue(parsedData.sections[0]);
        } else if (parsedData.teachers.length > 0) {
          setActiveFilter("teachers");
          setSelectedFilterValue(parsedData.teachers[0]);
        }
      } else {
        setEngineError(result.error || "فشل التوليد.");
        setStep("review");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setEngineError("تم إلغاء عملية التوليد بواسطة المستخدم.");
      } else {
        setEngineError("فشل الاتصال بالخادم: " + (err.message || ""));
      }
      setStep("review");
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  /* ────── Cancel Generation Handler ────── */
  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
    
    if (pendingDestination) {
      if (pendingDestination === "back") {
        router.back();
      } else {
        router.push(pendingDestination);
      }
      setPendingDestination(null);
    } else {
      setStep("review");
    }
  };

  const handleNavigationAttempt = (destinationUrl) => {
    if (isGenerating) {
      setPendingDestination(destinationUrl);
      setShowCancelModal(true);
    } else {
      router.push(destinationUrl);
    }
  };

  /* ────── Downloads ────── */
  const downloadFile = (content, filename, type = "text/xml;charset=utf-8") => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ════════════════════════════════════════
     RENDER
     ════════════════════════════════════════ */
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const currentStepNum = step === "upload" ? 1 : (step === "review" || step === "generating") ? 2 : 3;

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "#F5F6F0", direction: "rtl" }}>

      {/* ─── Header ─── */}
      <div className="px-6 pt-10 pb-12 text-center relative overflow-hidden"
           style={{ background: "linear-gradient(135deg, #0F3D3E 0%, #175253 100%)" }}>
        <div className="absolute inset-0 opacity-15"
             style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)" }} />
        <button onClick={() => handleNavigationAttempt("/")}
                className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:bg-white/10 text-white border border-white/20">
          <ArrowRight size={14} /> العودة للرئيسية
        </button>
        <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-4 border border-white/20">
          <Layers size={32} color="#fff" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2 text-white">التوليد الحقيقي بمحرك FET</h1>
        <p className="text-sm text-white/80 max-w-xl mx-auto">
          ارفع ملف <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">.fet</span> الجاهز → راجع البيانات → ثم يشتغل محرك
          <span className="font-bold text-white"> fet-cl.exe </span>
          الحقيقي لتوليد الجدول بالخوارزمية الإيفولوشينية
        </p>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {[
            { key: "upload", label: "رفع الملف", num: 1 },
            { key: "review", label: "مراجعة البيانات", num: 2 },
            { key: "result", label: "الجدول النهائي", num: 3 }
          ].map((s, i) => {
            const isCurrent = s.num === currentStepNum;
            const isDone = s.num < currentStepNum;
            return (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px" style={{ backgroundColor: isDone || isCurrent ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)" }} />}
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                       style={{
                         backgroundColor: isDone ? "#3F7859" : isCurrent ? "#fff" : "rgba(255,255,255,0.15)",
                         color: isDone ? "#fff" : isCurrent ? "#0F3D3E" : "rgba(255,255,255,0.5)"
                       }}>
                    {isDone ? <CheckCircle size={14} /> : s.num}
                  </div>
                  <span className="text-xs font-semibold hidden sm:inline"
                        style={{ color: isCurrent ? "#fff" : "rgba(255,255,255,0.5)" }}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8">

        {/* ═══════════════ STEP 1 — Upload ═══════════════ */}
        {step === "upload" && (
          <div className="max-w-2xl mx-auto">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className="bg-white rounded-3xl p-10 md:p-16 text-center cursor-pointer transition-all border-2 border-dashed hover:shadow-lg"
              style={{
                borderColor: isDragging ? "#3F7859" : parseError ? "#D63384" : "#DCE2D6",
                backgroundColor: isDragging ? "#EDF7F2" : "#fff",
                boxShadow: isDragging ? "0 0 0 4px rgba(63,120,89,0.15)" : "0 2px 12px rgba(0,0,0,0.04)"
              }}
            >
              <input ref={fileInputRef} type="file" accept=".fet" className="hidden" onChange={handleFileInput} />
              <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center"
                   style={{ backgroundColor: "#EDF2EE" }}>
                <Upload size={36} color="#0F3D3E" />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: "#0F3D3E" }}>
                اسحب وأفلت ملف FET هنا
              </h2>
              <p className="text-sm mb-4" style={{ color: "#8A9188" }}>
                أو انقر لاختيار الملف من جهازك
              </p>
              <div className="inline-flex items-center gap-2 bg-[#EDF2EE] text-[#0F3D3E] px-4 py-2 rounded-xl text-xs font-bold">
                <FileText size={14} />
                يقبل ملفات بصيغة .fet (FET XML)
              </div>
            </div>

            {parseError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-semibold flex items-center gap-2">
                <AlertTriangle size={16} />
                {parseError}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ STEP 2 — Review ═══════════════ */}
        {step === "review" && parsedData && (
          <div className="space-y-6">

            {/* File info bar */}
            <div className="bg-white rounded-2xl p-4 border border-[#DCE2D6] shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#EDF7F2" }}>
                  <FileText size={20} color="#3F7859" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#0F3D3E]">{fileName}</p>
                  <p className="text-xs text-[#8A9188]">{parsedData.institution}</p>
                </div>
              </div>
              <button onClick={resetAll}
                      className="border border-[#DCE2D6] text-[#8A9188] hover:text-red-600 hover:border-red-300 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
                <Trash2 size={13} />
                رفع ملف آخر
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { label: "الأيام", value: parsedData.days.length, icon: Clock, color: "#0F3D3E" },
                { label: "الحصص", value: parsedData.hours.length, icon: Clock, color: "#4361EE" },
                { label: "الأساتذة", value: parsedData.teachers.length, icon: Users, color: "#C68A2E" },
                { label: "المواد", value: parsedData.subjects.length, icon: BookOpen, color: "#7B1FA2" },
                { label: "الأفواج", value: parsedData.sections.length, icon: GraduationCap, color: "#3F7859" },
                { label: "الأنشطة", value: parsedData.activities.length, icon: Layers, color: "#D63384" },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-xl p-4 text-center border border-[#DCE2D6] shadow-sm">
                  <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                       style={{ backgroundColor: c.color + "12" }}>
                    <c.icon size={18} color={c.color} />
                  </div>
                  <p className="text-2xl font-extrabold" style={{ color: c.color }}>{c.value}</p>
                  <p className="text-[10px] font-semibold text-[#8A9188] mt-0.5">{c.label}</p>
                </div>
              ))}
            </div>

            {/* Detail collapsibles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <CollapsibleCard title="الأساتذة" icon={<Users size={16} />} count={parsedData.teachers.length}
                               expanded={expandedSections.teachers} onToggle={() => toggleSection("teachers")}>
                <TagList items={parsedData.teachers} color="#C68A2E" />
              </CollapsibleCard>
              <CollapsibleCard title="المواد الدراسية" icon={<BookOpen size={16} />} count={parsedData.subjects.length}
                               expanded={expandedSections.subjects} onToggle={() => toggleSection("subjects")}>
                <TagList items={parsedData.subjects} color="#7B1FA2" />
              </CollapsibleCard>
              <CollapsibleCard title="الأفواج / الفصول" icon={<GraduationCap size={16} />} count={parsedData.sections.length}
                               expanded={expandedSections.sections} onToggle={() => toggleSection("sections")}>
                <TagList items={parsedData.sections} color="#3F7859" />
              </CollapsibleCard>
              <CollapsibleCard title="القاعات" icon={<DoorOpen size={16} />} count={parsedData.rooms.length}
                               expanded={expandedSections.rooms} onToggle={() => toggleSection("rooms")}>
                {parsedData.rooms.length > 0 ?
                  <TagList items={parsedData.rooms} color="#0F3D3E" /> :
                  <p className="text-xs text-[#8A9188] italic">لم يتم تحديد قاعات في الملف.</p>
                }
              </CollapsibleCard>
            </div>

            {/* Activities Table */}
            <CollapsibleCard title="قائمة الأنشطة" icon={<Layers size={16} />} count={parsedData.activities.length}
                             expanded={expandedSections.activities} onToggle={() => toggleSection("activities")} fullWidth>
              <div className="overflow-x-auto border border-[#DCE2D6] rounded-xl max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-right min-w-[550px]">
                  <thead className="bg-[#EDF2EE] text-[#0F3D3E] font-bold sticky top-0">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">الأستاذ</th>
                      <th className="p-3">المادة</th>
                      <th className="p-3">الفوج</th>
                      <th className="p-3 text-center">المدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF2EE]">
                    {parsedData.activities.map((act, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-[#8A9188]">{act.id || i + 1}</td>
                        <td className="p-3 font-semibold">{act.teacher || "—"}</td>
                        <td className="p-3">{act.subject}</td>
                        <td className="p-3">{act.students || "—"}</td>
                        <td className="p-3 text-center font-bold">{act.duration}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleCard>

            {/* Time limit config + Engine error */}
            <div className="bg-white rounded-2xl p-5 border border-[#DCE2D6] shadow-sm">
              <h4 className="font-bold text-sm text-[#0F3D3E] mb-3">إعدادات المحرك</h4>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8A9188] mb-1">الحد الأقصى للوقت (ثانية)</label>
                  <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Math.max(10, parseInt(e.target.value) || 300))}
                         className="w-32 px-3 py-2 text-sm rounded-lg border border-[#DCE2D6] focus:outline-none focus:ring-1 focus:ring-[#0F3D3E]" />
                </div>
                <p className="text-xs text-[#8A9188] mt-4">
                  سيتم تشغيل محرك <span className="font-bold text-[#0F3D3E]">fet-cl.exe</span> الحقيقي على الخادم المحلي.
                  الملفات المعقدة قد تحتاج وقتاً أطول.
                </p>
              </div>
            </div>

            {engineError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-semibold">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} />
                  فشل التوليد
                </div>
                <pre className="whitespace-pre-wrap text-xs font-mono bg-red-100 p-3 rounded-lg mt-2">{engineError}</pre>
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-center pt-2 pb-4">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-[#0F3D3E] hover:bg-[#175253] text-white px-8 py-4 rounded-2xl font-bold text-base transition-all flex items-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ?
                  <RefreshCw size={20} className="animate-spin" /> :
                  <Play size={20} />
                }
                {isGenerating ? "جارٍ التوليد بواسطة محرك FET الحقيقي..." : "بدء التوليد بمحرك FET الحقيقي"}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 2.5 — Generating ═══════════════ */}
        {step === "generating" && parsedData && (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-3xl border border-[#DCE2D6] shadow-sm relative overflow-hidden">
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full border-4 border-[#EDF2EE] flex items-center justify-center bg-white z-10 relative shadow-inner">
                <RefreshCw size={38} className="text-[#3F7859] animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-[#3F7859] animate-ping opacity-20"></div>
            </div>
            
            <h2 className="text-2xl font-extrabold text-[#0F3D3E] mb-2 text-center">جاري توليد الجدول الزمني...</h2>
            <p className="text-[#8A9188] mb-6 max-w-md text-center text-sm leading-relaxed">
              يقوم محرك FET الآن بحساب القيود وتوزيع <span className="font-bold text-[#0F3D3E]">{parsedData.activities.length} نشاطاً</span> بأعلى كفاءة.
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-md mb-6">
              <div className="flex justify-between text-xs font-bold text-[#3F7859] mb-2 px-1">
                <span>الأنشطة المنجزة: {placedActivities} / {parsedData.activities.length}</span>
                <span>{Math.min(100, Math.round((placedActivities / (parsedData.activities.length || 1)) * 100))}%</span>
              </div>
              <div className="h-3.5 w-full bg-[#EDF2EE] rounded-full overflow-hidden p-0.5 border border-[#DCE2D6]">
                <div 
                  className="h-full bg-gradient-to-l from-[#3F7859] to-[#2D5841] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.round((placedActivities / (parsedData.activities.length || 1)) * 100))}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-[#EDF7F2] border border-[#3F7859]/20 rounded-2xl px-6 py-3.5 flex items-center gap-4 mb-8">
              <Timer size={22} className="text-[#3F7859]" />
              <div>
                <p className="text-[10px] font-bold text-[#3F7859] mb-0.5">الوقت المستغرق</p>
                <p className="text-2xl font-mono font-extrabold text-[#0F3D3E] tracking-wider">{formatTime(elapsedSeconds)}</p>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 transition-all shadow-sm hover:shadow"
            >
              <XCircle size={16} />
              إلغاء عملية التوليد
            </button>
            
            {timeLimit && (
              <p className="text-[10px] text-[#8A9188] mt-6 font-semibold">
                الحد الأقصى المسموح للوقت: {timeLimit} ثانية
              </p>
            )}
          </div>
        )}

        {/* ═══════════════ Custom Confirmation Modal ═══════════════ */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-red-100 text-center relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowCancelModal(false)}
                className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-all"
              >
                <X size={18} />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4 text-red-500 shadow-sm">
                <AlertTriangle size={32} />
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {pendingDestination ? "تحذير: مغادرة الصفحة وإيقاف الإنتاج" : "تحذير: إيقاف عملية الإنتاج"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-6 leading-relaxed">
                عملية توليد الجدول الزمني قيد التشغيل حالياً ({formatTime(elapsedSeconds)}).
                <br />
                <span className="font-bold text-red-600">
                  {pendingDestination
                    ? "الانتقال لصفحة أخرى سيوقف عمل المحرك فوراً ويلغي كافة النتائج غير المحفوظة."
                    : "إيقاف التوليد الآن سيؤدي إلى إلغاء المعالجة وفقدان التقدم الحالي."}
                </span>
              </p>

              <div className="flex items-center gap-3 justify-center">
                <button
                  onClick={handleConfirmCancel}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg"
                >
                  {pendingDestination ? "نعم، غادر وأوقف التوليد" : "نعم، أوقف التوليد"}
                </button>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setPendingDestination(null);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl text-xs font-bold transition-all"
                >
                  متابعة التوليد
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 3 — Result ═══════════════ */}
        {step === "result" && solvedTimetable && parsedData && (
          <div className="space-y-6">

            {/* Stats bar */}
            <div className="bg-white rounded-2xl p-5 border border-[#DCE2D6] shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg text-[#0F3D3E] flex items-center gap-2">
                    <CheckCircle size={20} color="#3F7859" />
                    تم التوليد بنجاح بواسطة محرك FET الحقيقي!
                  </h3>
                  <p className="text-xs text-[#8A9188] mt-1">
                    {parsedData.institution} — {solverStats?.scheduledSlots || 0} حصة مجدولة من أصل {solverStats?.totalActivities || 0}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {resultFetContent && (
                    <button onClick={() => downloadFile(resultFetContent, fileName.replace(".fet", "_result.fet"))}
                            className="bg-[#3F7859] hover:bg-[#2E5D43] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
                      <Download size={14} />
                      تحميل النتيجة (.fet)
                    </button>
                  )}
                  <button onClick={() => downloadFile(rawXml, fileName)}
                          className="border border-[#0F3D3E] text-[#0F3D3E] hover:bg-[#0F3D3E] hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
                    <Download size={14} />
                    الملف الأصلي
                  </button>
                  <button onClick={() => { setStep("review"); setSolvedTimetable(null); }}
                          className="border border-[#DCE2D6] text-[#8A9188] hover:text-[#0F3D3E] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
                    <Eye size={14} />
                    مراجعة البيانات
                  </button>
                  <button onClick={resetAll}
                          className="border border-[#DCE2D6] text-[#8A9188] hover:text-red-600 hover:border-red-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
                    <Upload size={14} />
                    رفع ملف جديد
                  </button>
                </div>
              </div>

              {/* Engine output */}
              {engineOutput && (
                <div className="mt-4 bg-gray-950 text-green-400 p-3 rounded-xl font-mono text-[11px] max-h-20 overflow-y-auto" style={{ direction: "ltr", textAlign: "left" }}>
                  {engineOutput.split("\n").filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}
                </div>
              )}
            </div>

            {/* View filters */}
            <div className="bg-white rounded-2xl p-4 border border-[#DCE2D6] shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-[#8A9188]">عرض الجدول حسب:</span>
                <div className="flex rounded-lg overflow-hidden border border-[#DCE2D6] bg-[#F5F6F0]">
                  {[
                    { key: "students", label: "الفوج", items: parsedData.sections },
                    { key: "teachers", label: "الأستاذ", items: parsedData.teachers },
                    ...(parsedData.rooms.length > 0 ? [{ key: "rooms", label: "القاعة", items: parsedData.rooms }] : []),
                  ].map(f => (
                    <button key={f.key}
                            onClick={() => { setActiveFilter(f.key); if (f.items.length > 0) setSelectedFilterValue(f.items[0]); }}
                            className={`px-4 py-2 text-xs font-bold transition-colors ${activeFilter === f.key ? "bg-[#0F3D3E] text-white" : "text-[#0F3D3E] hover:bg-white"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <select value={selectedFilterValue} onChange={(e) => setSelectedFilterValue(e.target.value)}
                        className="px-3 py-2 text-xs rounded-lg border border-[#DCE2D6] bg-white font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F3D3E]">
                  {activeFilter === "students" && parsedData.sections.map((s, i) => <option key={i} value={s}>{s}</option>)}
                  {activeFilter === "teachers" && parsedData.teachers.map((t, i) => <option key={i} value={t}>{t}</option>)}
                  {activeFilter === "rooms" && parsedData.rooms.map((r, i) => <option key={i} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* Timetable Grid */}
            <div className="bg-white rounded-2xl p-4 border border-[#DCE2D6] shadow-md overflow-x-auto">
              <table className="w-full border-collapse text-xs text-center min-w-[700px]">
                <thead>
                  <tr className="bg-[#0F3D3E] text-white font-bold">
                    <th className="p-3 rounded-tr-xl border-l border-[#175253] w-28 font-extrabold">اليوم \ الحصة</th>
                    {parsedData.hours.map((h, i) => (
                      <th key={i} className={`p-3 border-l border-[#175253] font-bold ${i === parsedData.hours.length - 1 ? "rounded-tl-xl" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.days.map((day, dIdx) => (
                    <tr key={dIdx} className="border-b border-[#DCE2D6]">
                      <td className="p-3 border-l border-[#DCE2D6] font-extrabold text-[#0F3D3E] bg-[#EDF2EE]/70">{day}</td>
                      {parsedData.hours.map((hour, hIdx) => {
                        const cellAct = solvedTimetable.find(item => {
                          if (item.day !== day || item.hour !== hour) return false;
                          if (activeFilter === "students") {
                            // Match if the students field contains selected value
                            return item.students && item.students.includes(selectedFilterValue);
                          }
                          if (activeFilter === "teachers") return item.teacher === selectedFilterValue;
                          if (activeFilter === "rooms") return item.room === selectedFilterValue;
                          return false;
                        });

                        if (cellAct) {
                          const c = getSubjectColor(cellAct.subject, parsedData.subjects);
                          return (
                            <td key={hIdx} className="p-1.5 border-l border-[#DCE2D6] h-[76px] min-w-[120px]">
                              <div className="h-full p-2 rounded-lg flex flex-col justify-between text-right select-none"
                                   style={{ backgroundColor: c.bg, borderRight: `3px solid ${c.border}` }}>
                                <div className="font-extrabold text-[11px] truncate" style={{ color: c.text }}>
                                  {cellAct.subject}
                                </div>
                                <div className="text-[10px] font-semibold truncate" style={{ color: c.border }}>
                                  {activeFilter === "teachers" ? cellAct.students : cellAct.teacher}
                                </div>
                                {cellAct.room && (
                                  <div className="text-[9px] font-bold truncate" style={{ color: "#8A9188" }}>
                                    {cellAct.room}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={hIdx} className="p-1.5 border-l border-[#DCE2D6] h-[76px]">
                            <div className="h-full rounded-lg bg-[#F5F6F0]/50 flex items-center justify-center">
                              <span className="text-[10px] text-[#C5C9C3] font-medium select-none">—</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FET HTML Outputs */}
            {Object.keys(htmlFiles).length > 0 && (
              <div className="bg-white rounded-2xl border border-[#DCE2D6] shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#EDF2EE]">
                  <h4 className="font-bold text-sm text-[#0F3D3E] flex items-center gap-2">
                    <ExternalLink size={16} />
                    ملفات HTML المولدة من FET (يمكنك تحميلها وطباعتها)
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2 p-4">
                  {Object.keys(htmlFiles).filter(f => f.endsWith(".html") && !f.includes("index")).map(f => {
                    const label = f.replace(/_/g, " ").replace(".html", "").split(" ").slice(-3).join(" ");
                    return (
                      <button key={f}
                              onClick={() => downloadFile(htmlFiles[f], f, "text/html;charset=utf-8")}
                              className="border border-[#DCE2D6] hover:border-[#0F3D3E] text-[#0F3D3E] px-3 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1">
                        <Download size={12} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Soft conflicts */}
            {softConflicts && (
              <CollapsibleCard title="التعارضات المرنة (Soft Conflicts)" icon={<AlertTriangle size={16} />}
                               count="" expanded={false} onToggle={() => {}} fullWidth>
                <pre className="whitespace-pre-wrap text-[11px] font-mono bg-[#F5F6F0] p-3 rounded-lg max-h-48 overflow-y-auto" style={{ direction: "ltr", textAlign: "left" }}>
                  {softConflicts}
                </pre>
              </CollapsibleCard>
            )}
          </div>
        )}

      </div>

      <Navbar />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════ */
function CollapsibleCard({ title, icon, count, expanded, onToggle, fullWidth, children }) {
  const [isOpen, setIsOpen] = useState(expanded);
  const handleToggle = () => { setIsOpen(!isOpen); onToggle?.(); };

  return (
    <div className={`bg-white rounded-2xl border border-[#DCE2D6] shadow-sm overflow-hidden ${fullWidth ? "col-span-full" : ""}`}>
      <button onClick={handleToggle}
              className="w-full flex items-center justify-between p-4 text-right hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2 text-[#0F3D3E] font-bold text-sm">
          {icon}
          {title}
          {count !== "" && <span className="text-[10px] bg-[#EDF2EE] text-[#3F7859] px-2 py-0.5 rounded-full font-extrabold">{count}</span>}
        </div>
        {isOpen ? <ChevronUp size={16} color="#8A9188" /> : <ChevronDown size={16} color="#8A9188" />}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function TagList({ items, color }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, idx) => (
        <span key={idx}
              className="inline-block text-[11px] px-2.5 py-1 rounded-lg font-semibold border"
              style={{ backgroundColor: color + "0A", borderColor: color + "25", color }}>
          {item}
        </span>
      ))}
    </div>
  );
}
