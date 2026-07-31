import { useState, useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "../../components/ui/button";

interface DeleteCompanyDialogProps {
  slug: string;
  companyName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function DeleteCompanyDialog({
  slug,
  companyName,
  onConfirm,
  onCancel,
  loading = false,
}: DeleteCompanyDialogProps) {
  const [typedSlug, setTypedSlug] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const confirmed = typedSlug === slug;

  // Focus the input when modal opens
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loading, onCancel]);

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      {/* Modal card */}
      <div className="w-full max-w-md animate-fade-in-up rounded-xl border border-danger/40 bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-danger-dim">
              <AlertTriangle className="size-5 text-danger" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Eliminar cliente</h2>
              <p className="text-xs text-muted">{companyName}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1.5 text-muted hover:bg-card hover:text-foreground disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-4">
          <div className="rounded-lg border border-danger/30 bg-danger-dim px-4 py-3 text-sm text-danger leading-relaxed">
            <p className="font-semibold mb-1">Esta acción es irreversible.</p>
            <p>
              Se borrará la base de datos, los archivos subidos y la fila de control. El historial de auditoría se preserva pero pierde el vínculo a este cliente.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-2">
              Para confirmar, tipeá el slug exacto:{" "}
              <code className="rounded bg-card/80 border border-border px-1.5 py-0.5 font-mono text-foreground">
                {slug}
              </code>
            </label>
            <input
              ref={inputRef}
              value={typedSlug}
              onChange={(e) => setTypedSlug(e.target.value)}
              placeholder={slug}
              disabled={loading}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter" && confirmed && !loading) onConfirm();
              }}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={onConfirm}
              disabled={!confirmed || loading}
            >
              {loading ? "Eliminando…" : "Eliminar permanentemente"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
