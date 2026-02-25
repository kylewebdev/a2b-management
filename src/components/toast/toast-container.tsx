"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useToast, type Toast } from "./toast-context";

const typeStyles: Record<Toast["type"], string> = {
  success: "border-accent bg-accent/10 text-accent",
  error: "border-red-400 bg-red-400/10 text-red-400",
  info: "border-border bg-surface text-text-primary",
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in on next frame
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      role="status"
      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg transition-all duration-200 ${
        typeStyles[toast.type]
      } ${visible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"}`}
    >
      <span className="flex-1">{toast.message}</span>
      {toast.action && (
        <button
          onClick={toast.action.onClick}
          className="shrink-0 text-xs font-semibold underline"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={onClose}
        className="shrink-0 opacity-60 hover:opacity-100"
        aria-label="Close"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 right-4 z-50 flex w-80 flex-col gap-2 md:bottom-4"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
