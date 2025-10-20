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
              "w-full max-w-sm rounded-md border shadow-sm backdrop-blur bg-white/90 dark:bg-neutral-900/90 dark:border-neutral-700 px-4 py-3 pointer-events-auto flex flex-col gap-1",
              t.type === "success" && "border-green-500/60",
              t.type === "error" && "border-red-500/60"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {t.title && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-0.5">
                    {t.title}
                  </p>
                )}
                <p className="text-sm leading-snug text-neutral-800 dark:text-neutral-100 break-words">
                  {t.message}
                </p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 text-xs font-medium"
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
