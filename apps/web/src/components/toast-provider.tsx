"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type ToastMessage = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast harus digunakan di dalam ToastProvider.");
  }

  return context;
}

export default function ToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      setToast({
        id: Date.now(),
        message,
        type,
      });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  const closeToast = () => setToast(null);

  const icon =
    toast?.type === "success" ? (
      <CheckCircle2 size={21} />
    ) : toast?.type === "error" ? (
      <AlertCircle size={21} />
    ) : (
      <Info size={21} />
    );

  const colorClass =
    toast?.type === "success"
      ? "border-green-200 text-green-700 dark:border-green-900 dark:text-green-300"
      : toast?.type === "error"
        ? "border-red-200 text-red-700 dark:border-red-900 dark:text-red-300"
        : "border-blue-200 text-blue-700 dark:border-blue-900 dark:text-blue-300";

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {toast && (
        <div
          key={toast.id}
          role="alert"
          className={`fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm items-center gap-3 rounded-xl border bg-white p-4 shadow-xl dark:bg-zinc-900 ${colorClass}`}
        >
          <span className="shrink-0">{icon}</span>

          <p className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {toast.message}
          </p>

          <button
            type="button"
            onClick={closeToast}
            aria-label="Tutup notifikasi"
            className="shrink-0 rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
          >
            <X size={17} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}