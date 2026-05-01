import { useEffect, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useToastEvent, type Toast } from "../../hooks/use-toast";

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: "border-success/30 bg-success-dim text-success",
  error: "border-danger/30 bg-danger-dim text-danger",
  info: "border-info/30 bg-info-dim text-info",
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return useToastEvent(({ message, type }) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-fade-in-up ${styles[t.type]}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 shrink-0 opacity-70 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
