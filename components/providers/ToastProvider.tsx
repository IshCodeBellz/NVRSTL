"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type?: "success" | "error" | "info";
  timeout?: number; // ms
}

interface ToastContextValue {
  push: (t: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = `t_${Date.now()}_${idRef.current++}`;
    const toast: Toast = { timeout: 3500, type: "info", ...t, id };
    setToasts((prev) => [...prev, toast]);
    if (toast.timeout) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, toast.timeout);
    }
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // Keyboard accessibility: ESC to clear latest
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && toasts.length) {
        setToasts((prev) => prev.slice(0, -1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toasts.length]);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed z-[100] inset-x-0 top-4 flex flex-col items-center gap-2 px-4 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "w-full max-w-xl rounded-md border shadow-lg backdrop-blur px-6 py-5 pointer-events-auto flex flex-col gap-2",
              // Base theme (dark glass)
              "bg-neutral-900/90 border-neutral-700",
              // Accents per type
              t.type === "success" && "border-green-400/50 bg-green-500/10",
              t.type === "error" && "border-red-400/50 bg-red-500/10",
              t.type === "info" && "border-white/20 bg-white/10"
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 inline-flex h-6 w-6 items-center justify-center text-base",
                  t.type === "success" && "text-green-300",
                  t.type === "error" && "text-red-300",
                  t.type === "info" && "text-white/70"
                )}
                aria-hidden
              >
                {t.type === "success" ? "✓" : t.type === "error" ? "!" : "i"}
              </span>
              <div className="flex-1 min-w-0">
                {t.title && (
                  <p className="text-xs font-carbon font-bold uppercase tracking-widest text-white/70 mb-1">
                    {t.title}
                  </p>
                )}
                <p className="text-lg leading-snug text-neutral-100 break-words font-carbon">
                  {t.message}
                </p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-white/80 hover:text-white text-base font-bold"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
