"use client";
import { useState, useRef, useEffect } from "react";
import {
  X, Play, RefreshCw, Layers, CheckCircle, AlertTriangle, ArrowRight,
  Sliders, Printer, Download, Save, Undo2, Clock, Timer, XCircle
} from "lucide-react";
import { buildInitialFetModelFromBooking, serializeFetModelToXml } from "@/lib/fetBuilder";
import { updateBookingByCode } from "@/lib/bookings";
import { STATUS_DONE } from "@/lib/utils";
import FetConstraintEditor from "./FetConstraintEditor";
import FetPrintableTimetable from "./FetPrintableTimetable";

export default function FetBookingGeneratorModal({ booking, onClose, onSaved }) {
  // Step: "edit" | "generating" | "result"
  const [step, setStep] = useState("edit");

  // FET Model state
  const [model, setModel] = useState(() => buildInitialFetModelFromBooking(booking));

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

  // Time & Polling hooks
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

  // Reset to booking default
  const handleResetDefault = () => {
    if (confirm("هل أنت متأكد من رغبتك في إعادة تعيين كافة البيانات والقيود إلى القيم الأولية للحجز؟")) {
      setModel(buildInitialFetModelFromBooking(booking));
    }
  };

  // Run Solver
  const handleStartGeneration = async () => {
    const xml = serializeFetModelToXml(model);
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
          xmlContent: xml,
          timeLimit: 300,
          runId: newRunId
        })
      });
      const result = await res.json();

      if (result.success) {
        setSolvedTimetable(result.timetable);
        setResultFetContent(result.resultFetContent || xml);
        setSolverStats(result.stats);
        setStep("result");
      } else {
        setEngineError(result.error || "فشل توليد الجدول بواسطة المحرك.");
        setStep("edit");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setEngineError("تم إلغاء عملية التوليد بواسطة المستخدم.");
      } else {
        setEngineError("فشل الاتصال بمحرك التوليد: " + (err.message || ""));
      }
      setStep("edit");
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Confirm cancel generation
  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
    setStep("edit");
  };

  // Save generated files into booking
  const handleSaveToBooking = async ({ resultFetContent: fetText, timetable: finalTable }) => {
    const fileName = `${booking.institution_name.replace(/\s+/g, "_")}_جدول_الحصص.fet`;
    
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      style={{ direction: "rtl" }}
    >
      <div
        className="bg-[#F5F6F0] rounded-3xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-[#DCE2D6] relative animate-in zoom-in-95 duration-200"
      >
        {/* ── Modal Top Header ── */}
        <div
          className="px-6 py-4 border-b border-[#DCE2D6] bg-white flex items-center justify-between flex-shrink-0"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "#EDF2EE" }}
            >
              <Layers size={22} color="#0F3D3E" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#0F3D3E] flex items-center gap-2">
                توليد وتخصيص جدول الحجز: {booking.institution_name}
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EDF2EE] text-[#0F3D3E]">
                  {booking.code}
                </span>
              </h2>
              <p className="text-xs text-[#8A9188]">
                {booking.level} · {booking.total_sections} أقسام · {model.teachers?.length || 0} أساتذة · {model.activities?.length || 0} حصة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step === "result" && (
              <button
                onClick={() => setStep("edit")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE2D6] text-xs font-bold text-[#0F3D3E] hover:bg-slate-50 transition-all"
              >
                <Sliders size={14} />
                تعديل القيود
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100 text-gray-500 disabled:opacity-30"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Modal Body Content ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* STEP 1: Edit Data & Constraints */}
          {step === "edit" && (
            <div className="space-y-6">
              {/* Top Banner with Actions */}
              <div className="bg-white p-4 rounded-2xl border border-[#DCE2D6] shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-[#0F3D3E]">لوحة تحكم معطيات وقيود الحجز</h3>
                  <p className="text-xs text-[#8A9188]">
                    يمكنك تخصيص الأساتذة، المواد، الأقسام، والقاعات أو إضافة تفريغات وأوقات راحة قبل بدء التوليد.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleResetDefault}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DCE2D6] text-[#8A9188] hover:text-[#0F3D3E] hover:border-[#0F3D3E] text-xs font-bold transition-all"
                  >
                    <Undo2 size={14} />
                    استرجاع بيانات الحجز الأصلية
                  </button>
                  <button
                    onClick={handleStartGeneration}
                    className="bg-[#0F3D3E] hover:bg-[#175253] text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <Play size={15} />
                    بدء التوليد بمحرك FET
                  </button>
                </div>
              </div>

              {engineError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{engineError}</span>
                </div>
              )}

              {/* Constraint Editor */}
              <FetConstraintEditor model={model} onChange={setModel} />
            </div>
          )}

          {/* STEP 2: Generating State */}
          {step === "generating" && (
            <div className="py-16 px-4 bg-white rounded-3xl border border-[#DCE2D6] shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full border-4 border-[#EDF2EE] flex items-center justify-center bg-white z-10 relative shadow-inner">
                  <RefreshCw size={38} className="text-[#3F7859] animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-[#3F7859] animate-ping opacity-25"></div>
              </div>

              <h3 className="text-2xl font-extrabold text-[#0F3D3E] mb-2">جاري توليد جدول الحجز...</h3>
              <p className="text-[#8A9188] text-xs max-w-md mb-6 leading-relaxed">
                يقوم محرك FET الآن بحساب قيود أوقات وتفريغات الأساتذة وتوزيع <strong className="text-[#0F3D3E]">{model.activities?.length} نشاطاً</strong>.
              </p>

              {/* Progress */}
              <div className="w-full max-w-md mb-6">
                <div className="flex justify-between text-xs font-bold text-[#3F7859] mb-2 px-1">
                  <span>الأنشطة المنجزة: {placedActivities} / {model.activities?.length}</span>
                  <span className="font-mono">
                    {Math.min(100, Math.round((placedActivities / (model.activities?.length || 1)) * 100))}%
                  </span>
                </div>
                <div className="h-3.5 w-full bg-[#EDF2EE] rounded-full overflow-hidden p-0.5 border border-[#DCE2D6]">
                  <div
                    className="h-full bg-gradient-to-l from-[#3F7859] to-[#2D5841] rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, Math.round((placedActivities / (model.activities?.length || 1)) * 100))}%`
                    }}
                  />
                </div>
              </div>

              {/* Timer */}
              <div className="bg-[#EDF7F2] border border-[#3F7859]/20 rounded-2xl px-6 py-3.5 flex items-center gap-4 mb-6">
                <Timer size={22} className="text-[#3F7859]" />
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[#3F7859]">الوقت المستغرق</p>
                  <p className="text-2xl font-mono font-extrabold text-[#0F3D3E] tracking-widest">
                    {formatTime(elapsedSeconds)}
                  </p>
                </div>
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 transition-all shadow-xs"
              >
                <XCircle size={16} />
                إلغاء عملية التوليد
              </button>
            </div>
          )}

          {/* STEP 3: Results & Print View */}
          {step === "result" && solvedTimetable && (
            <FetPrintableTimetable
              timetable={solvedTimetable}
              model={model}
              booking={booking}
              resultFetContent={resultFetContent}
              onSaveToBooking={handleSaveToBooking}
              onBack={() => setStep("edit")}
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
                هل أنت متأكد من رغبتك في إيقاف المحرك والعودة لمحرر القيود؟
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
