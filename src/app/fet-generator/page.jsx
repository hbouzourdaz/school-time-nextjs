"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Upload, FileCode, Play, RefreshCw, Download, Trash2, CheckCircle, AlertTriangle,
  Timer, XCircle, X, Check, Save, Sparkles, CheckCircle2, Clock, History, FileText
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

  const institution = getText(doc, "Institution_Name") || "المؤسسة التعليمية";

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

  // Students
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
      active: getText(a, "Active") !== "false"
    };
  }).filter(a => a.active);

  return { institution, days, hours, teachers, subjects, sections, activities };
}

// Helper to escape XML safely
function escapeXml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe).replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

// Generate teachers XML if not returned by server
function generateTeachersXml(timetable, model) {
  const days = model?.days?.length > 0 ? model.days : ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const hours = model?.hours?.length > 0 ? model.hours : ["08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00"];
  const teachers = (model?.teachers || []).map(t => typeof t === "string" ? t : t.name);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Timetable>\n  <Teachers_Timetable>\n`;
  teachers.forEach(t => {
    xml += `    <Teacher>\n      <Name>${escapeXml(t)}</Name>\n`;
    days.forEach(d => {
      xml += `      <Day>\n        <Name>${escapeXml(d)}</Name>\n`;
      hours.forEach(h => {
        const act = (timetable || []).find(a => a.teacher === t && (a.day === d || a.day.includes(d)) && (a.hour === h || a.hour.includes(h)));
        xml += `        <Hour>\n          <Name>${escapeXml(h)}</Name>\n`;
        if (act) {
          xml += `          <Subject>${escapeXml(act.subject)}</Subject>\n`;
          xml += `          <Students>${escapeXml(act.students)}</Students>\n`;
          if (act.room) xml += `          <Room>${escapeXml(act.room)}</Room>\n`;
        }
        xml += `        </Hour>\n`;
      });
      xml += `      </Day>\n`;
    });
    xml += `    </Teacher>\n`;
  });
  xml += `  </Teachers_Timetable>\n</Timetable>`;
  return xml;
}

// Generate subgroups XML if not returned by server
function generateSubgroupsXml(timetable, model) {
  const days = model?.days?.length > 0 ? model.days : ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const hours = model?.hours?.length > 0 ? model.hours : ["08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00"];
  const sections = (model?.sections || []).map(s => typeof s === "string" ? s : s.name);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Timetable>\n  <Subgroups_Timetable>\n`;
  sections.forEach(s => {
    xml += `    <Subgroup>\n      <Name>${escapeXml(s)}</Name>\n`;
    days.forEach(d => {
      xml += `      <Day>\n        <Name>${escapeXml(d)}</Name>\n`;
      hours.forEach(h => {
        const act = (timetable || []).find(a => a.students && a.students.includes(s) && (a.day === d || a.day.includes(d)) && (a.hour === h || a.hour.includes(h)));
        xml += `        <Hour>\n          <Name>${escapeXml(h)}</Name>\n`;
        if (act) {
          xml += `          <Subject>${escapeXml(act.subject)}</Subject>\n`;
          xml += `          <Teacher>${escapeXml(act.teacher)}</Teacher>\n`;
          if (act.room) xml += `          <Room>${escapeXml(act.room)}</Room>\n`;
        }
        xml += `        </Hour>\n`;
      });
      xml += `      </Day>\n`;
    });
    xml += `    </Subgroup>\n`;
  });
  xml += `  </Subgroups_Timetable>\n</Timetable>`;
  return xml;
}

export default function FetGeneratorPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  // Step: "upload" | "generating" | "result"
  const [step, setStep] = useState("upload");

  // File & parsed data
  const [fileName, setFileName] = useState("");
  const [rawXml, setRawXml] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [parseError, setParseError] = useState("");

  // Solver State
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [engineError, setEngineError] = useState("");
  const [solvedTimetable, setSolvedTimetable] = useState(null);
  const [resultFetContent, setResultFetContent] = useState("");
  const [teachersXmlContent, setTeachersXmlContent] = useState("");
  const [subgroupsXmlContent, setSubgroupsXmlContent] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [placedActivities, setPlacedActivities] = useState(0);
  const [runId, setRunId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [savedLocallySuccess, setSavedLocallySuccess] = useState(false);

  // Local storage history
  const [localHistory, setLocalHistory] = useState([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const historyRaw = localStorage.getItem("local_fet_generations");
      if (historyRaw) {
        setLocalHistory(JSON.parse(historyRaw));
      }
    } catch (e) {}
  }, []);

  // Polling solver state
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

            // 1. Completed
            if (data.status === "completed" && data.timetable) {
              setSolvedTimetable(data.timetable);
              setResultFetContent(data.resultFetContent || "");
              setTeachersXmlContent(data.teachersXmlContent || "");
              setSubgroupsXmlContent(data.subgroupsXmlContent || "");
              setIsGenerating(false);
              setStep("result");

              // Save automatically to local history
              saveToLocalHistory(data.timetable, data.resultFetContent, data.teachersXmlContent, data.subgroupsXmlContent);
              return;
            }

            // 2. Failed
            if (data.status === "failed" || data.success === false) {
              setEngineError(data.error || "فشل توليد الجدول بواسطة المحرك.");
              setIsGenerating(false);
              setStep("upload");
              return;
            }

            // 3. Progress
            if (data.placed > 0) {
              setPlacedActivities(data.placed);
            }
          } catch (e) {}
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
  }, [isGenerating, runId, parsedData, rawXml]);

  // Save generation to local storage
  const saveToLocalHistory = (timetable, fetText, teachersXml, subgroupsXml) => {
    try {
      const instClean = (parsedData?.institution || "المؤسسة").replace(/\s+/g, "_");
      const fetName = `${instClean}_data_and_timetable.fet`;
      const teachersName = `${instClean}_teachers.xml`;
      const subgroupsName = `${instClean}_subgroups.xml`;

      const finalFet = fetText || resultFetContent || rawXml;
      const finalTeachers = teachersXml || teachersXmlContent || generateTeachersXml(timetable || solvedTimetable, parsedData);
      const finalSubgroups = subgroupsXml || subgroupsXmlContent || generateSubgroupsXml(timetable || solvedTimetable, parsedData);

      const newRecord = {
        id: Date.now().toString(),
        institution: parsedData?.institution || "المؤسسة التعليمية",
        date: new Date().toISOString(),
        fetFileName: fetName,
        teachersFileName: teachersName,
        subgroupsFileName: subgroupsName,
        fetContent: finalFet,
        teachersContent: finalTeachers,
        subgroupsContent: finalSubgroups,
        teachersCount: parsedData?.teachers?.length || 0,
        sectionsCount: parsedData?.sections?.length || 0
      };

      const existingRaw = localStorage.getItem("local_fet_generations");
      const list = existingRaw ? JSON.parse(existingRaw) : [];
      const updatedList = [newRecord, ...list.filter(item => item.id !== newRecord.id)].slice(0, 10);

      localStorage.setItem("local_fet_generations", JSON.stringify(updatedList));
      setLocalHistory(updatedList);
      setSavedLocallySuccess(true);
      setTimeout(() => setSavedLocallySuccess(false), 4000);
    } catch (e) {
      console.error("Local save error:", e);
    }
  };

  // Remove item from local history
  const handleDeleteHistoryItem = (id, e) => {
    e.stopPropagation();
    try {
      const updatedList = localHistory.filter(item => item.id !== id);
      localStorage.setItem("local_fet_generations", JSON.stringify(updatedList));
      setLocalHistory(updatedList);
    } catch (e) {}
  };

  // File handling
  const processFile = useCallback((file) => {
    if (!file) return;
    setParseError("");
    setEngineError("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlText = e.target.result;
        if (!xmlText.includes("<fet") || !xmlText.includes("</fet>")) {
          throw new Error("الملف المحدد ليس ملف FET XML صالح (يجب أن يحتوي على وسم <fet>).");
        }
        setRawXml(xmlText);
        const data = parseFetXml(xmlText);
        setParsedData(data);
      } catch (err) {
        setParseError(err.message || "فشل قراءة الملف.");
      }
    };
    reader.onerror = () => setParseError("حدث خطأ أثناء قراءة الملف.");
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Start Generation
  const handleStartGeneration = async () => {
    if (!rawXml) {
      setParseError("يرجى اختيار ملف FET أولاً.");
      return;
    }

    const newRunId = Date.now().toString();
    setRunId(newRunId);
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
        body: JSON.stringify({
          xmlContent: rawXml,
          timeLimit: 300,
          runId: newRunId,
          async: true
        })
      });
      const result = await res.json();
      if (!result.success) {
        setEngineError(result.error || "فشل بدء التوليد.");
        setIsGenerating(false);
        setStep("upload");
      }
    } catch (err) {
      setEngineError("فشل الاتصال بالخادم: " + (err.message || ""));
      setIsGenerating(false);
      setStep("upload");
    }
  };

  // Confirm cancel generation
  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    setIsGenerating(false);
    setStep("upload");
  };

  // Download helpers
  const downloadSingleFile = (content, filename, type = "text/xml;charset=utf-8") => {
    if (!content) return;
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Exact names
  const instClean = (parsedData?.institution || "المؤسسة").replace(/\s+/g, "_");
  const fetFileName = `${instClean}_data_and_timetable.fet`;
  const teachersFileName = `${instClean}_teachers.xml`;
  const subgroupsFileName = `${instClean}_subgroups.xml`;

  const finalFet = resultFetContent || rawXml;
  const finalTeachers = teachersXmlContent || generateTeachersXml(solvedTimetable, parsedData);
  const finalSubgroups = subgroupsXmlContent || generateSubgroupsXml(solvedTimetable, parsedData);

  const handleDownloadAllThree = () => {
    downloadSingleFile(finalFet, fetFileName);
    setTimeout(() => downloadSingleFile(finalTeachers, teachersFileName), 200);
    setTimeout(() => downloadSingleFile(finalSubgroups, subgroupsFileName), 400);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "#F5F6F0", direction: "rtl" }}>
      {/* ─── Hero Header ─── */}
      <div
        className="px-4 sm:px-6 pt-8 sm:pt-10 pb-10 sm:pb-12 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0F3D3E 0%, #175253 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-15"
          style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)" }}
        />
        <button
          onClick={() => router.push("/")}
          className="absolute top-4 sm:top-6 right-4 sm:right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:bg-white/10 text-white border border-white/20"
        >
          <ArrowRight size={13} /> الرئيسية
        </button>

        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-3.5 border border-white/20">
          <FileCode size={26} color="#fff" />
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-1.5 text-white">
          منصة إنتاج ملفات FET
        </h1>
        <p className="text-xs sm:text-sm text-white/80 max-w-xl mx-auto leading-relaxed px-2">
          ارفع ملف <span className="font-mono bg-white/15 px-1.5 py-0.5 rounded text-white">.fet</span> لتشغيل محرك FET وإنتاج الملفات الثلاثة (<span className="font-mono">.fet</span> و <span className="font-mono">teachers.xml</span> و <span className="font-mono">subgroups.xml</span>) مع حفظ محلي مجاني في متصفحك.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 mt-6 sm:mt-8 space-y-6">
        {/* ═══════════════ STEP 1 — Upload ═══════════════ */}
        {step === "upload" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Dropzone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center cursor-pointer transition-all border-2 border-dashed ${
                isDragging ? "border-[#3F7859] bg-[#EDF7F2]" : "border-[#DCE2D6] hover:border-[#0F3D3E] shadow-sm hover:shadow-md"
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".fet,.xml" className="hidden" onChange={handleFileInput} />
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl mx-auto mb-3.5 flex items-center justify-center transition-all ${
                  parsedData ? "bg-[#3F7859] text-white" : "bg-[#EDF2EE] text-[#0F3D3E]"
                }`}
              >
                {parsedData ? <Check size={30} /> : <Upload size={28} />}
              </div>
              <h2 className="text-base sm:text-lg font-bold mb-1 text-[#0F3D3E]">
                {parsedData ? "تم اختيار الملف بنجاح" : "اسحب وأفلت ملف FET هنا"}
              </h2>
              <p className="text-xs text-[#8A9188] mb-3">
                {parsedData ? "انقر لتغيير الملف أو اسحب ملفاً آخر" : "أو انقر لاختيار ملف .fet من جهازك"}
              </p>
              <div className="inline-flex items-center gap-1.5 bg-[#EDF2EE] text-[#0F3D3E] px-3.5 py-1.5 rounded-xl text-[11px] font-bold">
                <FileCode size={13} />
                ملفات FET XML (.fet)
              </div>
            </div>

            {/* Error alerts */}
            {parseError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-xs font-semibold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle size={16} className="flex-shrink-0" />
                  <span>{parseError}</span>
                </div>
                <button
                  onClick={() => {
                    setParsedData(null);
                    setRawXml("");
                    setFileName("");
                    setParseError("");
                    setEngineError("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="px-3 py-1 bg-white border border-red-200 text-red-700 hover:bg-red-100 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0"
                >
                  <RefreshCw size={12} />
                  اختيار ملف آخر
                </button>
              </div>
            )}
            {engineError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-xs font-semibold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle size={16} className="flex-shrink-0" />
                  <span>{engineError}</span>
                </div>
                <button
                  onClick={() => {
                    setParsedData(null);
                    setRawXml("");
                    setFileName("");
                    setParseError("");
                    setEngineError("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="px-3 py-1 bg-white border border-red-200 text-red-700 hover:bg-red-100 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0"
                >
                  <RefreshCw size={12} />
                  اختيار ملف آخر
                </button>
              </div>
            )}

            {/* File Info Card */}
            {parsedData && (
              <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#DCE2D6] shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[#EDF2EE] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#0F3D3E] text-white flex items-center justify-center font-mono font-extrabold text-xs shadow-xs flex-shrink-0">
                      FET
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs sm:text-base text-[#0F3D3E] truncate">{fileName}</p>
                      <p className="text-[11px] sm:text-xs text-[#8A9188] mt-0.5 truncate">
                        المؤسسة: <strong className="text-[#0F3D3E]">{parsedData.institution}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setParsedData(null);
                        setRawXml("");
                        setFileName("");
                        setParseError("");
                        setEngineError("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="border border-[#DCE2D6] hover:border-red-300 bg-[#F5F6F0] hover:bg-red-50 text-[#8A9188] hover:text-red-700 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      title="إلغاء واختيار ملف آخر"
                    >
                      <RefreshCw size={13} />
                      ملف جديد
                    </button>

                    <button
                      type="button"
                      onClick={handleStartGeneration}
                      className="bg-[#0F3D3E] hover:bg-[#175253] text-white px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 flex-1 sm:flex-initial"
                    >
                      <Play size={14} className="fill-white" />
                      بدء الإنتاج بمحرك FET
                    </button>
                  </div>
                </div>

                {/* Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-1">
                  <div className="bg-[#F5F6F0] p-3 rounded-xl text-center border border-[#DCE2D6]">
                    <p className="text-[10px] sm:text-[11px] font-bold text-[#8A9188]">الأساتذة</p>
                    <p className="text-base sm:text-lg font-extrabold text-[#0F3D3E] mt-0.5">
                      {parsedData.teachers?.length || 0}
                    </p>
                  </div>
                  <div className="bg-[#F5F6F0] p-3 rounded-xl text-center border border-[#DCE2D6]">
                    <p className="text-[10px] sm:text-[11px] font-bold text-[#8A9188]">الأفواج</p>
                    <p className="text-base sm:text-lg font-extrabold text-[#0F3D3E] mt-0.5">
                      {parsedData.sections?.length || 0}
                    </p>
                  </div>
                  <div className="bg-[#F5F6F0] p-3 rounded-xl text-center border border-[#DCE2D6]">
                    <p className="text-[10px] sm:text-[11px] font-bold text-[#8A9188]">المواد</p>
                    <p className="text-base sm:text-lg font-extrabold text-[#0F3D3E] mt-0.5">
                      {parsedData.subjects?.length || 0}
                    </p>
                  </div>
                  <div className="bg-[#F5F6F0] p-3 rounded-xl text-center border border-[#DCE2D6]">
                    <p className="text-[10px] sm:text-[11px] font-bold text-[#8A9188]">الأنشطة</p>
                    <p className="text-base sm:text-lg font-extrabold text-[#3F7859] mt-0.5">
                      {parsedData.activities?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Local Storage History (التخزين المحلي المتاح للجميع) ─── */}
            {localHistory.length > 0 && (
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#DCE2D6] shadow-sm space-y-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-[#EDF2EE] pb-3">
                  <div className="flex items-center gap-2">
                    <History size={17} className="text-[#3F7859]" />
                    <h3 className="font-extrabold text-xs sm:text-sm text-[#0F3D3E]">
                      السجل المحلي للملفات المولدة على هذا الجهاز ({localHistory.length})
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF7F2] text-[#3F7859]">
                    تخزين محلي مجاني
                  </span>
                </div>

                <div className="space-y-2.5">
                  {localHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-[#DCE2D6] hover:border-[#0F3D3E] bg-[#F5F6F0]/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-xs sm:text-sm text-[#0F3D3E] truncate">
                            {item.institution}
                          </p>
                          <span className="text-[10px] text-[#8A9188] flex items-center gap-1 font-mono">
                            <Clock size={11} /> {new Date(item.date).toLocaleDateString("ar-EG")}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-[#8A9188] mt-0.5">
                          {item.teachersCount} أستاذ · {item.sectionsCount} فوج
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                        <button
                          onClick={() => downloadSingleFile(item.fetContent, item.fetFileName)}
                          className="bg-white hover:bg-[#0F3D3E] text-[#0F3D3E] hover:text-white border border-[#DCE2D6] px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                          title="تحميل .fet"
                        >
                          <Download size={11} /> .fet
                        </button>
                        <button
                          onClick={() => downloadSingleFile(item.teachersContent, item.teachersFileName)}
                          className="bg-white hover:bg-[#3F7859] text-[#3F7859] hover:text-white border border-[#DCE2D6] px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                          title="تحميل XML الأساتذة"
                        >
                          <Download size={11} /> الأساتذة
                        </button>
                        <button
                          onClick={() => downloadSingleFile(item.subgroupsContent, item.subgroupsFileName)}
                          className="bg-white hover:bg-[#C86428] text-[#C86428] hover:text-white border border-[#DCE2D6] px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                          title="تحميل XML الأقسام"
                        >
                          <Download size={11} /> الأقسام
                        </button>
                        <button
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg transition-colors"
                          title="حذف من السجل المحلي"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ STEP 2 — Generating ═══════════════ */}
        {step === "generating" && (
          <div className="max-w-xl mx-auto py-10 sm:py-14 px-4 sm:px-6 bg-white rounded-2xl sm:rounded-3xl border border-[#DCE2D6] shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="relative mb-5">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-[#EDF2EE] flex items-center justify-center bg-white z-10 relative shadow-inner">
                <RefreshCw size={30} className="text-[#3F7859] animate-spin sm:w-8 sm:h-8" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-[#3F7859] animate-ping opacity-25"></div>
            </div>

            <h3 className="text-base sm:text-xl font-extrabold text-[#0F3D3E] mb-1">
              جاري توليد ملفات FET في خلفية السيرفر...
            </h3>
            <p className="text-[#8A9188] text-xs max-w-sm mb-5 leading-relaxed">
              يقوم محرك FET الآن بحساب كافة القيود وتوزيع الأنشطة لإنتاج الملفات الثلاثة.
            </p>

            {/* Progress */}
            <div className="w-full max-w-sm mb-5">
              <div className="flex justify-between text-xs font-bold text-[#3F7859] mb-1.5 px-1">
                <span>الأنشطة المنجزة: {placedActivities} / {parsedData?.activities?.length || 0}</span>
                <span className="font-mono">
                  {parsedData?.activities?.length ? Math.min(100, Math.round((placedActivities / parsedData.activities.length) * 100)) : 0}%
                </span>
              </div>
              <div className="h-3.5 w-full bg-[#EDF2EE] rounded-full overflow-hidden p-0.5 border border-[#DCE2D6]">
                <div
                  className="h-full bg-gradient-to-l from-[#3F7859] to-[#2D5841] rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${parsedData?.activities?.length ? Math.min(100, Math.round((placedActivities / parsedData.activities.length) * 100)) : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Timer */}
            <div className="bg-[#F5F6F0] border border-[#DCE2D6] rounded-xl sm:rounded-2xl px-5 py-2.5 flex items-center gap-3 mb-5">
              <Timer size={18} className="text-[#0F3D3E]" />
              <div className="text-right">
                <p className="text-[10px] font-bold text-[#8A9188]">الوقت المستغرق</p>
                <p className="text-lg font-mono font-extrabold text-[#0F3D3E] tracking-widest">
                  {formatTime(elapsedSeconds)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
            >
              <XCircle size={14} />
              إلغاء التوليد
            </button>
          </div>
        )}

        {/* ═══════════════ STEP 3 — Result (3 Files Only + Local Save) ═══════════════ */}
        {step === "result" && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
            {/* Success Banner */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#3F7859]/30 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#EDF7F2] text-[#3F7859] flex items-center justify-center shadow-xs flex-shrink-0">
                  <CheckCircle2 size={24} className="sm:w-7 sm:h-7" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-lg text-[#0F3D3E]">
                    تم إنتاج الملفات الثلاثة بنجاح! 🚀
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#8A9188] mt-0.5">
                    المؤسسة: <strong className="text-[#0F3D3E]">{parsedData?.institution}</strong> · تم الحفظ تلقائياً في ذاكرة المتصفح.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleDownloadAllThree}
                  className="bg-[#0F3D3E] hover:bg-[#175253] text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Download size={14} />
                  تحميل الـ 3 ملفات معاً
                </button>
                <button
                  onClick={() => setStep("upload")}
                  className="bg-[#F5F6F0] hover:bg-white border border-[#DCE2D6] text-[#0F3D3E] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Upload size={14} />
                  ملف جديد
                </button>
              </div>
            </div>

            {/* The 3 File Cards */}
            <div className="space-y-3">
              {/* 1. File .fet */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#DCE2D6] hover:border-[#0F3D3E] shadow-2xs transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#0F3D3E] text-white flex items-center justify-center font-mono font-black text-xs shadow-xs flex-shrink-0">
                    FET
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-xs sm:text-sm text-[#0F3D3E] font-mono truncate">
                      {fetFileName}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-[#8A9188] mt-0.5">
                      ملف FET الكامل متضمناً كافة البيانات الأساسية مع جدول الحصص الموزع.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => downloadSingleFile(finalFet, fetFileName)}
                  className="bg-[#F5F6F0] hover:bg-[#0F3D3E] text-[#0F3D3E] hover:text-white border border-[#DCE2D6] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs flex-shrink-0"
                >
                  <Download size={13} />
                  تحميل .fet
                </button>
              </div>

              {/* 2. Teachers XML */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#DCE2D6] hover:border-[#3F7859] shadow-2xs transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#3F7859] text-white flex items-center justify-center font-mono font-black text-xs shadow-xs flex-shrink-0">
                    XML
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-xs sm:text-sm text-[#0F3D3E] font-mono truncate">
                      {teachersFileName}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-[#8A9188] mt-0.5">
                      ملف جداول توقيت كافة الأساتذة بصيغة XML المتوافقة مع برامج التصدير.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => downloadSingleFile(finalTeachers, teachersFileName)}
                  className="bg-[#F5F6F0] hover:bg-[#3F7859] text-[#3F7859] hover:text-white border border-[#DCE2D6] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs flex-shrink-0"
                >
                  <Download size={13} />
                  تحميل XML الأساتذة
                </button>
              </div>

              {/* 3. Subgroups XML */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#DCE2D6] hover:border-[#C86428] shadow-2xs transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#C86428] text-white flex items-center justify-center font-mono font-black text-xs shadow-xs flex-shrink-0">
                    XML
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-xs sm:text-sm text-[#0F3D3E] font-mono truncate">
                      {subgroupsFileName}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-[#8A9188] mt-0.5">
                      ملف جداول توقيت كافة الأقسام والأفواج التربوية بصيغة XML.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => downloadSingleFile(finalSubgroups, subgroupsFileName)}
                  className="bg-[#F5F6F0] hover:bg-[#C86428] text-[#C86428] hover:text-white border border-[#DCE2D6] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs flex-shrink-0"
                >
                  <Download size={13} />
                  تحميل XML الأقسام
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Cancel Confirmation Warning Modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-red-100 text-center relative animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-3 text-red-500">
              <AlertTriangle size={26} className="sm:w-7 sm:h-7" />
            </div>
            <h4 className="font-extrabold text-sm sm:text-base text-gray-900 mb-1.5">
              تأكيد إلغاء التوليد
            </h4>
            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              هل أنت متأكد من رغبتك في إيقاف عملية التوليد الحالية والعودة لشاشة رفع الملف؟ ستفقد التقدم المحرز في هذه المحاولة.
            </p>
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={handleConfirmCancel}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                نعم، أوقف التوليد
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#0F3D3E] py-2.5 rounded-xl text-xs font-extrabold transition-all active:scale-95"
              >
                متابعة
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
