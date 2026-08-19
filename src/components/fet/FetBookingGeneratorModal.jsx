"use client";
import { useState, useRef, useEffect } from "react";
import {
  X, Play, RefreshCw, Layers, CheckCircle, AlertTriangle, ArrowRight,
  Printer, Download, Save, Clock, Timer, XCircle, Upload, FileCode,
  Sparkles, Check, FileText, Server, Info
} from "lucide-react";
import { parseFetXmlToModel } from "@/lib/fetBuilder";
import { updateBookingByCode } from "@/lib/bookings";
import { STATUS_DONE } from "@/lib/utils";
import FetPrintableTimetable from "./FetPrintableTimetable";

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
  const [solverStats, setSolverStats] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [placedActivities, setPlacedActivities] = useState(0);
  const [runId, setRunId] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
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

  // Save generated files into booking
  const handleSaveToBooking = async ({ resultFetContent: fetText, timetable: finalTable }) => {
    const fileName = `${(parsedModel?.institution || booking.institution_name).replace(/\s+/g, "_")}_جدول_الحصص.fet`;
    
    // Create base64 data URL for the .fet file
    const fetBase64 = `data:text/xml;charset=utf-8;base64,${btoa(unescape(encodeURIComponent(fetText || "")))}`;
    
    const newFileObj = {
      name: fileName,
      url: fetBase64,
      uploaded_at: new Date().toISOString(),
      type: "fet_generated"
    };

    const existingFiles = booking.final_files || [];
    const updatedFiles = [
      ...existingFiles.filter((f) => f.name !== fileName),
      newFileObj
    ];

    const updated = await updateBookingByCode(booking.code, {
      final_files: updatedFiles,
      status: STATUS_DONE,
      download_allowed: true,
      updated_at: new Date().toISOString()
    });

    if (onSaved) onSaved(updated);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      style={{ direction: "rtl" }}
    >
      <div
        className="bg-[#F5F6F0] rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#DCE2D6] relative animate-in zoom-in-95 duration-200"
      >
        {/* ── Modal Top Header ── */}
        <div
          className="px-6 py-4 border-b border-[#DCE2D6] bg-white flex items-center justify-between flex-shrink-0"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#EDF2EE]"
            >
              <FileCode size={22} color="#0F3D3E" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#0F3D3E] flex items-center gap-2">
                رفع ملف FET وتوليد الجدول: {booking.institution_name}
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EDF2EE] text-[#0F3D3E]">
                  {booking.code}
                </span>
              </h2>
              <p className="text-xs text-[#8A9188]">
                {booking.level} · {booking.total_sections} أقسام · {booking.wilaya}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step === "result" && (
              <button
                onClick={() => setStep("upload")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#DCE2D6] text-xs font-bold text-[#0F3D3E] hover:bg-slate-50 transition-all"
              >
                <Upload size={14} />
                رفع ملف آخر
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100 text-gray-500"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Modal Body Content ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* STEP 1: Upload FET File */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Dropzone Area */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 ${
                  uploadedFile
                    ? "border-[#3F7859] bg-[#EDF7F2]/60 hover:bg-[#EDF7F2]"
                    : "border-[#DCE2D6] hover:border-[#0F3D3E] bg-white hover:bg-[#F5F6F0]/80 shadow-xs"
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
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xs transition-all ${
                    uploadedFile
                      ? "bg-[#3F7859] text-white"
                      : "bg-[#EDF2EE] text-[#0F3D3E]"
                  }`}
                >
                  {uploadedFile ? <Check size={32} /> : <Upload size={30} />}
                </div>

                <div>
                  <h3 className="font-extrabold text-base text-[#0F3D3E]">
                    {uploadedFile ? "تم اختيار ملف FET بنجاح" : "انقر لاختيار ملف FET (.fet) من جهازك"}
                  </h3>
                  <p className="text-xs text-[#8A9188] mt-1">
                    {uploadedFile ? "يمكنك النقر مجدداً لتغيير الملف أو سحب ملف آخر" : "أو قم بسحب وإفلات ملف .fet هنا مباشرة"}
                  </p>
                </div>
              </div>

              {/* Upload Error Alert */}
              {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Engine Error Alert */}
              {engineError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{engineError}</span>
                </div>
              )}

              {/* File Info Card & Instant Action */}
              {uploadedFile && parsedModel && (
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#DCE2D6] shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF2EE] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#0F3D3E] text-white flex items-center justify-center font-mono font-extrabold text-xs">
                        FET
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-[#0F3D3E]">{uploadedFile.name}</p>
                        <p className="text-xs text-[#8A9188]">
                          المؤسسة: <strong className="text-[#0F3D3E]">{parsedModel.institution}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleStartGeneration}
                        className="bg-[#0F3D3E] hover:bg-[#175253] text-white px-6 py-3 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                      >
                        <Play size={15} className="fill-white" />
                        بدء التوليد بمحرك FET
                      </button>
                    </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="bg-[#F5F6F0] p-3 rounded-2xl text-center border border-[#DCE2D6]">
                      <p className="text-[11px] font-bold text-[#8A9188]">تعداد الأساتذة</p>
                      <p className="text-base font-extrabold text-[#0F3D3E] mt-0.5">
                        {parsedModel.teachers?.length || 0}
                      </p>
                    </div>
                    <div className="bg-[#F5F6F0] p-3 rounded-2xl text-center border border-[#DCE2D6]">
                      <p className="text-[11px] font-bold text-[#8A9188]">الأفواج والأقسام</p>
                      <p className="text-base font-extrabold text-[#0F3D3E] mt-0.5">
                        {parsedModel.sections?.length || 0}
                      </p>
                    </div>
                    <div className="bg-[#F5F6F0] p-3 rounded-2xl text-center border border-[#DCE2D6]">
                      <p className="text-[11px] font-bold text-[#8A9188]">المواد الدراسية</p>
                      <p className="text-base font-extrabold text-[#0F3D3E] mt-0.5">
                        {parsedModel.subjects?.length || 0}
                      </p>
                    </div>
                    <div className="bg-[#F5F6F0] p-3 rounded-2xl text-center border border-[#DCE2D6]">
                      <p className="text-[11px] font-bold text-[#8A9188]">إجمالي الأنشطة</p>
                      <p className="text-base font-extrabold text-[#3F7859] mt-0.5">
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
            <div className="py-12 px-4 bg-white rounded-3xl border border-[#DCE2D6] shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="relative mb-5">
                <div className="w-24 h-24 rounded-full border-4 border-[#EDF2EE] flex items-center justify-center bg-white z-10 relative shadow-inner">
                  <RefreshCw size={38} className="text-[#3F7859] animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-[#3F7859] animate-ping opacity-25"></div>
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-[#0F3D3E] mb-1.5">
                جاري توليد جدول الحجز في خلفية السيرفر...
              </h3>
              <p className="text-[#8A9188] text-xs max-w-md mb-5 leading-relaxed">
                يقوم محرك FET الآن بتوزيع الأنشطة وحساب كافة القيود المحددة.
              </p>

              {/* Server Background Safe Notice */}
              <div className="bg-[#EDF7F2] border border-[#3F7859]/30 text-[#0F3D3E] rounded-2xl p-3.5 max-w-lg mb-6 flex items-start gap-2.5 text-right">
                <Server size={18} className="text-[#3F7859] flex-shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed font-medium">
                  <strong>توليد خلفي آمن:</strong> تعمل عملية الإنتاج على السيرفر مباشرة. يمكنك إغلاق هذه النافذة أو مغادرة الموقع بأمان، وعند عودتك ستجد النتيجة جاهزة ومحفوظة.
                </p>
              </div>

              {/* Progress */}
              <div className="w-full max-w-md mb-5">
                <div className="flex justify-between text-xs font-bold text-[#3F7859] mb-2 px-1">
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
              <div className="bg-[#F5F6F0] border border-[#DCE2D6] rounded-2xl px-6 py-3 flex items-center gap-4 mb-6">
                <Timer size={20} className="text-[#0F3D3E]" />
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[#8A9188]">الوقت المستغرق</p>
                  <p className="text-xl font-mono font-extrabold text-[#0F3D3E] tracking-widest">
                    {formatTime(elapsedSeconds)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#0F3D3E] bg-[#EDF2EE] hover:bg-[#DCE2D6] transition-all"
                >
                  إغلاق النافذة ومتابعة العمل
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all"
                >
                  <XCircle size={15} />
                  إلغاء التوليد
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Results & Print View */}
          {step === "result" && solvedTimetable && parsedModel && (
            <FetPrintableTimetable
              timetable={solvedTimetable}
              model={parsedModel}
              booking={booking}
              resultFetContent={resultFetContent}
              onSaveToBooking={handleSaveToBooking}
              onBack={() => setStep("upload")}
            />
          )}
        </div>

        {/* ── Cancel Confirmation Modal ── */}
        {showCancelModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-red-100 text-center relative animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-3 text-red-500">
                <AlertTriangle size={28} />
              </div>
              <h4 className="font-bold text-base text-gray-900 mb-2">إلغاء التوليد</h4>
              <p className="text-xs text-gray-600 mb-5 leading-relaxed">
                هل أنت متأكد من رغبتك في إيقاف المهمة والعودة لشاشة رفع الملف؟
              </p>
              <div className="flex items-center gap-2 justify-center">
                <button
                  onClick={handleConfirmCancel}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  نعم، أوقف التوليد
                </button>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all"
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
