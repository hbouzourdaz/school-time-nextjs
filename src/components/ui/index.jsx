"use client";
// =====================================================
// UI Components — نظام تصميم جديد
// =====================================================
import { useState, useCallback, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home, ClipboardList, Search, User, Settings, LogOut, Menu, X,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { C_INK, C_INK_TEAL, C_PAPER, C_SAGE_LINE, C_OCHRE, C_CLAY, C_SUCCESS, hexToRgba,
         STATUS_PENDING, STATUS_IN_PROGRESS, STATUS_DONE, STATUS_CANCELLED, STATUS_REJECTED } from "@/lib/utils";
import { CheckCircle, AlertCircle } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);
  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  return (
    <ToastContext.Provider value={{ add, remove }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id}
               className="pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold animate-fadeIn"
               style={{
                 backgroundColor: t.type === "success" ? "#3F7859"
                   : t.type === "error" ? "#B5533C"
                   : "#0F3D3E",
                 color: "#fff",
               }}>
            {t.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="flex-shrink-0 opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function TextInput({ className = "", style = {}, ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-offset-1 transition-all placeholder:text-gray-400 ${className}`}
      style={{ borderColor: "#DCE2D6", color: "#0F3D3E", "--tw-ring-color": "rgba(15,61,62,0.3)", backgroundColor: "#fff", ...style }}
    />
  );
}

export function TextArea({ className = "", style = {}, ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-offset-1 transition-all resize-none placeholder:text-gray-400 ${className}`}
      style={{ borderColor: "#DCE2D6", color: "#0F3D3E", "--tw-ring-color": "rgba(15,61,62,0.3)", backgroundColor: "#fff", ...style }}
    />
  );
}

export function Select({ className = "", style = {}, children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-offset-1 transition-all bg-white ${className}`}
      style={{ borderColor: "#DCE2D6", color: "#0F3D3E", "--tw-ring-color": "rgba(15,61,62,0.3)", ...style }}
    >
      {children}
    </select>
  );
}

export function PrimaryButton({ children, className = "", style = {}, disabled, loading, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`font-bold rounded-xl transition-all active:scale-[0.97] disabled:opacity-40 btn-interactive flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-base ${className}`}
      style={{ backgroundColor: "#0F3D3E", color: "#fff", ...style }}
    >
      {loading && <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div className="mb-5">
      <label className="block text-base font-bold mb-2" style={{ color: "#0F3D3E" }}>{label}</label>
      {hint && <p className="text-sm mb-2" style={{ color: "#8A9188" }}>{hint}</p>}
      {children}
    </div>
  );
}

export function StatusBadge({ status }) {
  const styles = {
    [STATUS_PENDING]:     { backgroundColor: "#FAF0DB", color: "#96691F" },
    [STATUS_IN_PROGRESS]: { backgroundColor: "#EDF2EE", color: "#0F3D3E" },
    [STATUS_DONE]:        { backgroundColor: "#E4F0E8", color: "#3F7859" },
    [STATUS_CANCELLED]:   { backgroundColor: "#F2DEDE", color: "#B5533C" },
    [STATUS_REJECTED]:    { backgroundColor: "#F2DEDE", color: "#B5533C" },
  };
  return (
    <span
      className="text-sm font-bold px-3.5 py-1.5 rounded-full flex-shrink-0"
      style={styles[status] || { backgroundColor: "#EDEFE9", color: "#8A9188" }}
    >
      {status}
    </span>
  );
}

export function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b py-2.5 gap-3" style={{ borderColor: "#EDEFE9" }}>
      <span className="text-base flex-shrink-0" style={{ color: "#8A9188" }}>{label}</span>
      <span className="font-semibold text-base text-left" style={{ color: "#0F3D3E" }}>{value || "—"}</span>
    </div>
  );
}

export function Card({ icon: Icon, title, subtitle, children, number }) {
  return (
    <div className="bg-white rounded-2xl p-6 mb-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: `1px solid #DCE2D6` }}>
      <div className="flex items-center gap-3 mb-5">
        {number && (
          <div className="w-9 h-9 rounded-xl text-white flex items-center justify-center text-sm font-bold flex-shrink-0"
               style={{ backgroundColor: "#0F3D3E" }}>
            {number}
          </div>
        )}
        {Icon && <Icon color="#0F3D3E" size={24} className="flex-shrink-0" />}
        <div className="min-w-0">
          <h2 className="font-bold text-lg" style={{ color: "#0F3D3E" }}>{title}</h2>
          {subtitle && <p className="text-sm truncate" style={{ color: "#8A9188" }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
         style={{ backgroundColor: "rgba(10,44,45,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "#EDEFE9" }}>
          <h3 className="font-bold text-xl" style={{ color: "#0F3D3E" }}>{title}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
                  style={{ color: "#8A9188" }}><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function SupabaseBanner() {
  const { isSupabaseConfigured } = require("@/lib/supabase");
  if (isSupabaseConfigured()) return null;
  return (
    <div className="text-sm px-4 py-2.5 flex items-center gap-2 justify-center text-center"
         style={{ backgroundColor: "#FAF0DB", color: "#96691F" }}>
      <span>⚠️</span>
      <span>البيانات محفوظة في المتصفح فقط — من لوحة الأدمن ← الإعدادات يمكنك ربط Supabase.</span>
    </div>
  );
}

// ===== Navbar =====
const NAV_ITEMS = [
  { href: "/",              label: "الرئيسية", icon: Home },
  { href: "/booking",       label: "حجز جديد", icon: ClipboardList },
  { href: "/track",         label: "تتبع",    icon: Search },
  { href: "/expert/login",  label: "الخبراء",  icon: User },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t"
         style={{ backgroundColor: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", borderColor: "#DCE2D6", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
      <div className="max-w-md mx-auto flex items-center justify-around py-2.5 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <button key={href} onClick={() => router.push(href)}
                    className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl transition-all btn-interactive"
                    style={{ color: active ? "#0F3D3E" : "#8A9188" }}>
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                {active && <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                                 style={{ backgroundColor: "#0F3D3E" }} />}
              </div>
              <span className="text-xs font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ===== Stepper =====
export function Stepper({ steps, current }) {
  return (
    <div className="flex items-center gap-1 mb-6 px-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                 style={{
                   backgroundColor: i < current ? "#3F7859" : i === current ? "#0F3D3E" : "#DCE2D6",
                   color: i <= current ? "#fff" : "#8A9188",
                 }}>
              {i < current ? <CheckCircle size={18} /> : i + 1}
            </div>
            <span className="text-xs mt-1.5 text-center font-semibold"
                  style={{ color: i === current ? "#0F3D3E" : "#8A9188" }}>
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="h-0.5 flex-1 mx-1 rounded-full mt-[-14px]"
                 style={{ backgroundColor: i < current ? "#3F7859" : "#DCE2D6" }} />
          )}
        </div>
      ))}
    </div>
  );
}
