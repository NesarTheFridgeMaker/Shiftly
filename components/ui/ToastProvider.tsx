"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useState,
} from "react";

type ToastType = "success" | "error" | "warning" | "info";

type Toast = {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
};

type ToastContextValue = {
  showToast: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function removeToast(id: number) {
    setToasts((current) => current.filter((item) => item.id !== id));
  }

  function showToast(toast: Omit<Toast, "id">) {
    const id = Date.now();

    setToasts((current) => [...current, { ...toast, id }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }

  const styles = {
    success: {
      icon: "✓",
      bg: "bg-[#DCFCE7]",
      text: "text-[#15803D]",
      accent: "bg-[#22C55E]",
    },
    error: {
      icon: "!",
      bg: "bg-[#FEE2E2]",
      text: "text-[#DC2626]",
      accent: "bg-[#EF4444]",
    },
    warning: {
      icon: "!",
      bg: "bg-[#FEF3C7]",
      text: "text-[#B45309]",
      accent: "bg-[#F59E0B]",
    },
    info: {
      icon: "i",
      bg: "bg-[#EFF6FF]",
      text: "text-[#2563EB]",
      accent: "bg-[#2563EB]",
    },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div className="fixed right-7 top-7 z-[100] flex w-[calc(100%-3.5rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const style = styles[toast.type];

          return (
            <button
              key={toast.id}
              type="button"
              onClick={() => removeToast(toast.id)}
              className="group relative overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white p-4 text-left shadow-[0_18px_50px_rgba(15,23,42,0.16)] transition-all duration-200 ease-out animate-[fadeIn_.18s_ease-out] hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(15,23,42,0.20)]"
            >
              <div className={`absolute left-0 top-0 h-full w-1 ${style.accent}`} />

              <div className="flex gap-3 pl-2">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${style.bg} ${style.text}`}
                >
                  {style.icon}
                </div>

                <div className="min-w-0 pr-4">
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {toast.title}
                  </p>

                  {toast.description && (
                    <p className="mt-1 text-sm leading-5 text-[#64748B]">
                      {toast.description}
                    </p>
                  )}
                </div>

                <span className="ml-auto text-sm text-[#94A3B8] opacity-0 transition group-hover:opacity-100">
                  ×
                </span>
              </div>

              <div className="absolute bottom-0 left-0 h-1 w-full bg-[#F1F5F9]">
                <div
                  className={`h-full ${style.accent} animate-[toastProgress_4s_linear_forwards]`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}