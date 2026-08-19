"use client";
import { useState, useRef, useEffect } from "react";
import {
  X, Play, RefreshCw, CheckCircle, AlertTriangle,
  Download, Save, Timer, XCircle, Upload, FileCode,
  Check, FileText, Server, Sparkles, CheckCircle2, ArrowRight
} from "lucide-react";
import { parseFetXmlToModel } from "@/lib/fetBuilder";
import { updateBookingByCode } from "@/lib/bookings";
import { STATUS_DONE } from "@/lib/utils";

// Helpers to build teachers.xml and subgroups.xml if missing from raw output
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

function generateTeachersXml(timetable, model) {
  const days = model?.days || ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const hours = model?.hours || ["08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00"];
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

function generateSubgroupsXml(timetable, model) {
  const days = model?.days || ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const hours = model?.hours || ["08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00"];
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

export default function FetBookingGeneratorModal({ booking, onClose, onSaved }) {
  // Step: "upload" | "generating" | "result"
  const [step, setStep] = useState("upload");

  // Uploaded FET file state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [rawUploadedXml, setRawUploadedXml] = useState("");
  const [parsedModel, setParsedModel] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  // Solver state
  const [isGenerating, setIsGenerating] = useState(false);
  const [engineError, setEngineError] = useState("");
  const [solvedTimetable, setSolvedTimetable] = useState(null);
  const [resultFetContent, setResultFetContent] = useState("");
  const [teachersXmlContent, setTeachersXmlContent] = useState("");
  const [subgroupsXmlContent, setSubgroupsXmlContent] = useState("");
  const [solverStats, setSolverStats] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [placedActivities, setPlacedActivities] = useState(0);
  const [runId, setRunId] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [savingToBooking, setSavingToBooking] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const abortControllerRef = useRef(null);

  // Resume active job if exists
  useEffect(() => {
    try {
      const savedJobRaw = localStorage.getItem("active_fet_job_" + booking.code);
      if (savedJobRaw) {
        const savedJob = JSON.parse(savedJobRaw);
        if (savedJob.runId) {
          setRunId(savedJob.runId);
          setIsGenerating(true);
          setStep("generating");
          const elapsed = Math.floor((Date.now() - (savedJob.startedAt || Date.now())) / 1000);
          setElapsedSeconds(elapsed > 0 ? elapsed : 0);
          if (savedJob.parsedModel) setParsedModel(savedJob.parsedModel);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [booking.code]);

  // Time & Background Job Polling hooks
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

            // 1. Job completed successfully
            if (data.status === "completed" && data.timetable) {
              setSolvedTimetable(data.timetable);
              setResultFetContent(data.resultFetContent || "");
              setTeachersXmlContent(data.teachersXmlContent || "");
              setSubgroupsXmlContent(data.subgroupsXmlContent || "");
              setSolverStats(data.stats);
              setIsGenerating(false);
              setStep("result");
              try { localStorage.removeItem("active_fet_job_" + booking.code); } catch {}
              return;
            }

            // 2. Job failed
            if (data.status === "failed" || data.success === false) {
              setEngineError(data.error || "فشل توليد الجدول بواسطة المحرك.");
              setIsGenerating(false);
              setStep("upload");
              try { localStorage.removeItem("active_fet_job_" + booking.code); } catch {}
              return;
            }

            // 3. Still running: update real-time placed count
            if (data.placed > 0) {
              setPlacedActivities(data.placed);
            }
          } catch (e) {
            // ignore network glitch, keep polling
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
  }, [isGenerating, runId, booking.code]);

  // Handle FET File Selection
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFetFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFetFile(file);
  };

  const processFetFile = (file) => {
    setUploadError("");
    setEngineError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        if (!text.includes("<fet") || !text.includes("</fet>")) {
          throw new Error("الملف المحدد ليس ملف FET XML صالح (يجب أن يحتوي على وسم <fet>).");
        }
        const model = parseFetXmlToModel(text);
        setUploadedFile({
          name: file.name,
          size: file.size,
          lastModified: file.lastModified
        });
        setRawUploadedXml(text);
        setParsedModel(model);
      } catch (err) {
        console.error("FET Parse error:", err);
        setUploadError(err.message || "فشل قراءة ملف FET. تأكد من صحة الملف.");
      }
    };
    reader.onerror = () => {
      setUploadError("حدث خطأ أثناء قراءة الملف من جهازك.");
    };
    reader.readAsText(file, "UTF-8");
  };

  // Run Solver in Background
  const handleStartGeneration = async () => {
    if (!rawUploadedXml) {
      setUploadError("يرجى اختيار ملف FET أولاً قبل بدء التوليد.");
      return;
    }

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

    // Save job into localStorage to persist across navigation or tab closing
    try {
      localStorage.setItem("active_fet_job_" + booking.code, JSON.stringify({
        runId: newRunId,
        bookingCode: booking.code,
        startedAt: Date.now(),
        parsedModel
      }));
    } catch {}

    try {
      const res = await fetch("/api/fet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          xmlContent: rawUploadedXml,
          timeLimit: 300,
          runId: newRunId,
          async: true // Tell server to run in background
        })
      });
      const result = await res.json();

      if (!result.success) {
        setEngineError(result.error || "فشل بدء مهمة التوليد.");
        setIsGenerating(false);
        setStep("upload");
        try { localStorage.removeItem("active_fet_job_" + booking.code); } catch {}
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setEngineError("فشل الاتصال بالخادم: " + (err.message || ""));
        setIsGenerating(false);
        setStep("upload");
        try { localStorage.removeItem("active_fet_job_" + booking.code); } catch {}
      }
    }
  };

  // Confirm cancel generation
  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    try { localStorage.removeItem("active_fet_job_" + booking.code); } catch {}
    setIsGenerating(false);
    setStep("upload");
  };

  // Clean Institution Name for strict filenames
  const rawInst = parsedModel?.institution || booking.institution_name || "المؤسسة";
  const instClean = rawInst.replace(/\s+/g, "_");

  // The 3 exact file contents
  const finalFet = resultFetContent || rawUploadedXml;
  const finalTeachers = teachersXmlContent || generateTeachersXml(solvedTimetable, parsedModel);
  const finalSubgroups = subgroupsXmlContent || generateSubgroupsXml(solvedTimetable, parsedModel);

  // Exact file names requested by user
  const fetFileName = `${instClean}_data_and_timetable.fet`;
  const teachersFileName = `${instClean}_teachers.xml`;
  const subgroupsFileName = `${instClean}_subgroups.xml`;

  // Download a single file
  const downloadSingleFile = (content, fileName, mimeType = "text/xml;charset=utf-8") => {
    if (!content) return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download all 3 files sequentially
  const handleDownloadAllThree = () => {
    downloadSingleFile(finalFet, fetFileName);
    setTimeout(() => {
      downloadSingleFile(finalTeachers, teachersFileName);
    }, 200);
    setTimeout(() => {
      downloadSingleFile(finalSubgroups, subgroupsFileName);
    }, 400);
  };

  // Save the 3 generated files strictly into booking
  const handleSaveToBooking = async () => {
    setSavingToBooking(true);
    try {
      const encodeBase64 = (str) => `data:text/xml;charset=utf-8;base64,${btoa(unescape(encodeURIComponent(str || "")))}`;

      const filesToSave = [
        {
          name: fetFileName,
          url: encodeBase64(finalFet),
          uploaded_at: new Date().toISOString(),
          type: "fet_data_and_timetable"
        },
        {
          name: teachersFileName,
          url: encodeBase64(finalTeachers),
          uploaded_at: new Date().toISOString(),
          type: "fet_teachers_xml"
        },
        {
          name: subgroupsFileName,
          url: encodeBase64(finalSubgroups),
          uploaded_at: new Date().toISOString(),
          type: "fet_subgroups_xml"
        }
      ];

      const updated = await updateBookingByCode(booking.code, {
        final_files: filesToSave,
        status: STATUS_DONE,
        download_allowed: true,
        updated_at: new Date().toISOString()
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      if (onSaved) onSaved(updated);
    } catch (e) {
      console.error("Save to booking error:", e);
    } finally {
      setSavingToBooking(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200"
      style={{ direction: "rtl" }}
    >
      <div
        className="bg-[#F5F6F0] rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[96vh] md:max-h-[92vh] flex flex-col overflow-hidden border border-[#DCE2D6] relative animate-in zoom-in-95 duration-200"
      >
        {/* ── Modal Top Header ── */}
        <div
          className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#DCE2D6] bg-white flex flex-wrap items-center justify-between gap-3 flex-shrink-0 shadow-xs"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center bg-[#0F3D3E] text-white shadow-xs flex-shrink-0"
            >
              <FileCode size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="font-extrabold text-sm sm:text-base text-[#0F3D3E] truncate">
                  منصة إنتاج ملفات FET
                </h2>
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-[#EDF7F2] text-[#3F7859] border border-[#3F7859]/20 truncate max-w-[150px] sm:max-w-none">
                  {booking.institution_name}
                </span>
                <span className="font-mono text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full bg-[#F5F6F0] text-[#0F3D3E] border border-[#DCE2D6]">
                  {booking.code}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#8A9188] mt-0.5">
                {booking.level} · {booking.total_sections} أقسام · {booking.wilaya}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-center">
            {step === "result" && (
              <button
                onClick={() => setStep("upload")}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-[#DCE2D6] bg-[#F5F6F0] hover:bg-white text-[11px] sm:text-xs font-extrabold text-[#0F3D3E] transition-all shadow-xs"
              >
                <Upload size={13} />
                رفع ملف آخر
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100 text-gray-500 hover:text-gray-800"
              title="إغلاق النافذة"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Modal Body Content ── */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-7 space-y-4 sm:space-y-6">
          {/* STEP 1: Upload FET File */}
          {step === "upload" && (
            <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 pt-1">
              {/* Dropzone Area */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 sm:gap-4 ${
                  uploadedFile
                    ? "border-[#3F7859] bg-[#EDF7F2]/60 hover:bg-[#EDF7F2]"
                    : "border-[#DCE2D6] hover:border-[#0F3D3E] bg-white hover:bg-[#F5F6F0]/80 shadow-sm hover:shadow-md"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".fet,.xml"
                  className="hidden"
                />

                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-sm transition-all ${
                    uploadedFile
                      ? "bg-[#3F7859] text-white"
                      : "bg-[#EDF2EE] text-[#0F3D3E]"
                  }`}
                >
                  {uploadedFile ? <Check size={28} className="sm:w-8 sm:h-8" /> : <Upload size={26} className="sm:w-8 sm:h-8" />}
                </div>

                <div>
                  <h3 className="font-extrabold text-sm sm:text-lg text-[#0F3D3E]">
                    {uploadedFile ? "تم اختيار ملف FET بنجاح" : "انقر لاختيار ملف FET (.fet) من جهازك"}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#8A9188] mt-1">
                    {uploadedFile ? "يمكنك النقر مجدداً لتغيير الملف أو سحب ملف آخر" : "أو قم بسحب وإفلات ملف .fet هنا مباشرة للبدء"}
                  </p>
                </div>
              </div>

              {/* Upload Error Alert */}
              {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Engine Error Alert */}
              {engineError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0" />
                  <span>{engineError}</span>
                </div>
              )}

              {/* File Info Card & Instant Action */}
              {uploadedFile && parsedModel && (
                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#DCE2D6] shadow-sm space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border-b border-[#EDF2EE] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#0F3D3E] text-white flex items-center justify-center font-mono font-extrabold text-xs shadow-xs flex-shrink-0">
                        FET
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-xs sm:text-base text-[#0F3D3E] truncate">{uploadedFile.name}</p>
                        <p className="text-[11px] sm:text-xs text-[#8A9188] mt-0.5 truncate">
                          المؤسسة: <strong className="text-[#0F3D3E]">{parsedModel.institution}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartGeneration}
                      className="bg-[#0F3D3E] hover:bg-[#175253] text-white px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                    >
                      <Play size={14} className="fill-white" />
                      بدء الإنتاج بمحرك FET
                    </button>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-1">
                    <div className="bg-[#F5F6F0] p-3 rounded-xl sm:rounded-2xl text-center border border-[#DCE2D6]">
                      <p className="text-[10px] sm:text-[11px] font-bold text-[#8A9188]">الأساتذة</p>
                      <p className="text-base sm:text-lg font-extrabold text-[#0F3D3E] mt-0.5">
                        {parsedModel.teachers?.length || 0}
                      </p>
                    </div>
                    <div className="bg-[#F5F6F0] p-3 rounded-xl sm:rounded-2xl text-center border border-[#DCE2D6]">
                      <p className="text-[10px] sm:text-[11px] font-bold text-[#8A9188]">الأفواج</p>
                      <p className="text-base sm:text-lg font-extrabold text-[#0F3D3E] mt-0.5">
                        {parsedModel.sections?.length || 0}
                      </p>
                    </div>
                    <div className="bg-[#F5F6F0] p-3 rounded-xl sm:rounded-2xl text-center border border-[#DCE2D6]">
                      <p className="text-[10px] sm:text-[11px] font-bold text-[#8A9188]">المواد</p>
                      <p className="text-base sm:text-lg font-extrabold text-[#0F3D3E] mt-0.5">
                        {parsedModel.subjects?.length || 0}
                      </p>
                    </div>
                    <div className="bg-[#F5F6F0] p-3 rounded-xl sm:rounded-2xl text-center border border-[#DCE2D6]">
                      <p className="text-[10px] sm:text-[11px] font-bold text-[#8A9188]">الأنشطة</p>
                      <p className="text-base sm:text-lg font-extrabold text-[#3F7859] mt-0.5">
                        {parsedModel.activities?.length || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Generating State */}
          {step === "generating" && (
            <div className="max-w-xl mx-auto my-auto py-8 sm:py-12 px-4 sm:px-6 bg-white rounded-2xl sm:rounded-3xl border border-[#DCE2D6] shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="relative mb-4 sm:mb-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-[#EDF2EE] flex items-center justify-center bg-white z-10 relative shadow-inner">
                  <RefreshCw size={28} className="text-[#3F7859] animate-spin sm:w-8 sm:h-8" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-[#3F7859] animate-ping opacity-25"></div>
              </div>

              <h3 className="text-base sm:text-xl font-extrabold text-[#0F3D3E] mb-1">
                جاري توليد ملفات الحجز في خلفية السيرفر...
              </h3>
              <p className="text-[#8A9188] text-[11px] sm:text-xs max-w-sm mb-4 sm:mb-5 leading-relaxed">
                يقوم محرك FET الآن بحساب القيود وإنتاج الملفات الثلاثة النهائية.
              </p>

              {/* Progress */}
              <div className="w-full max-w-sm mb-4 sm:mb-5">
                <div className="flex justify-between text-[11px] sm:text-xs font-bold text-[#3F7859] mb-1.5 px-1">
                  <span>الأنشطة المنجزة: {placedActivities} / {parsedModel?.activities?.length || 0}</span>
                  <span className="font-mono">
                    {parsedModel?.activities?.length ? Math.min(100, Math.round((placedActivities / parsedModel.activities.length) * 100)) : 0}%
                  </span>
                </div>
                <div className="h-3.5 w-full bg-[#EDF2EE] rounded-full overflow-hidden p-0.5 border border-[#DCE2D6]">
                  <div
                    className="h-full bg-gradient-to-l from-[#3F7859] to-[#2D5841] rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${parsedModel?.activities?.length ? Math.min(100, Math.round((placedActivities / parsedModel.activities.length) * 100)) : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* Timer */}
              <div className="bg-[#F5F6F0] border border-[#DCE2D6] rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2 sm:py-2.5 flex items-center gap-3 mb-4 sm:mb-5">
                <Timer size={16} className="text-[#0F3D3E] sm:w-[18px] sm:h-[18px]" />
                <div className="text-right">
                  <p className="text-[9px] sm:text-[10px] font-bold text-[#8A9188]">الوقت المستغرق</p>
                  <p className="text-base sm:text-lg font-mono font-extrabold text-[#0F3D3E] tracking-widest">
                    {formatTime(elapsedSeconds)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-[#0F3D3E] bg-[#EDF2EE] hover:bg-[#DCE2D6] transition-all"
                >
                  إغلاق ومتابعة العمل بالخلفية
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all"
                >
                  <XCircle size={14} />
                  إلغاء التوليد
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Pure 3 Files Output Screen (Responsive Layout) */}
          {step === "result" && (
            <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 pt-1 animate-in fade-in duration-300">
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
                      المؤسسة: <strong className="text-[#0F3D3E]">{rawInst}</strong> · التوقيت جاهز للاستخدام.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleDownloadAllThree}
                    className="bg-[#0F3D3E] hover:bg-[#175253] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Download size={14} />
                    تحميل الـ 3 ملفات معاً
                  </button>
                  <button
                    onClick={handleSaveToBooking}
                    disabled={savingToBooking}
                    className="bg-[#3F7859] hover:bg-[#2D5841] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm active:scale-95"
                  >
                    {saveSuccess ? <Check size={14} /> : <Save size={14} />}
                    {saveSuccess ? "تم الحفظ في الحجز ✓" : savingToBooking ? "جارٍ الحفظ..." : "حفظ في ملفات الحجز"}
                  </button>
                </div>
              </div>

              {/* The 3 Exact File Cards */}
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

              {/* Bottom Quick Action */}
              <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] sm:text-xs text-gray-500 text-center sm:text-right">
                <span>يمكنك استخدام ملفات XML مباشرة في البرامج المساعدة أو استيراد ملف FET الأصلي.</span>
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-[#DCE2D6] hover:bg-gray-50 text-[#0F3D3E] font-bold transition-all"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Cancel Confirmation Modal ── */}
        {showCancelModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-red-100 text-center relative animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-3 text-red-500">
                <AlertTriangle size={24} className="sm:w-7 sm:h-7" />
              </div>
              <h4 className="font-bold text-sm sm:text-base text-gray-900 mb-1.5">إلغاء التوليد</h4>
              <p className="text-xs text-gray-600 mb-4 sm:mb-5 leading-relaxed">
                هل أنت متأكد من رغبتك في إيقاف المهمة والعودة لشاشة رفع الملف؟
              </p>
              <div className="flex items-center gap-2 justify-center">
                <button
                  onClick={handleConfirmCancel}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  نعم، أوقف التوليد
                </button>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                  متابعة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
