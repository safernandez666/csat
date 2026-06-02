import { useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldAlert } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ParticlesBackground } from "../components/particles-background";
import { api } from "../lib/api";
import { useTranslation } from "../hooks/use-translation";

interface Props {
  forced?: boolean;
}

export default function ChangePasswordPage({ forced = false }: Props) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError(t("change_password.too_short") || "La nueva password debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("change_password.mismatch") || "Las passwords no coinciden.");
      return;
    }
    if (newPassword === currentPassword) {
      setError(t("change_password.same_as_old") || "La nueva password debe ser distinta a la actual.");
      return;
    }
    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess(true);
      // Backend clears auth + refresh cookies on success — re-login required.
      setTimeout(() => {
        window.location.href = "/login";
      }, 1800);
    } catch (e: any) {
      const msg = e?.message || "";
      // Backend returns "Current password incorrect" / "New password too short"
      if (msg.toLowerCase().includes("incorrect")) {
        setError(t("change_password.current_wrong") || "La password actual es incorrecta.");
      } else if (msg.toLowerCase().includes("too short")) {
        setError(t("change_password.too_short") || "La nueva password debe tener al menos 8 caracteres.");
      } else {
        setError(msg || (t("change_password.error") || "No se pudo cambiar la password."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <ParticlesBackground />
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary shadow-md">
            <KeyRound className="size-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">
              {t("change_password.title") || "Cambiar password"}
            </h1>
            <p className="text-sm text-muted">
              {forced
                ? (t("change_password.forced_subtitle") || "Tu password es temporal — definí una nueva para continuar.")
                : (t("change_password.subtitle") || "Definí una nueva password para tu cuenta.")}
            </p>
          </div>
        </div>

        {forced && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              {t("change_password.forced_notice") ||
                "Por seguridad, tenés que cambiar la password de un solo uso antes de seguir."}
            </p>
          </div>
        )}

        {success ? (
          <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success text-center">
            {t("change_password.success") || "Password actualizada. Te redirigimos al login..."}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                {t("change_password.current") || "Password actual"}
              </label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoFocus
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                {t("change_password.new") || "Nueva password"}
              </label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-muted">
                {t("change_password.hint") || "Mínimo 8 caracteres."}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                {t("change_password.confirm") || "Confirmar nueva password"}
              </label>
              <Input
                type={showNew ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? (t("change_password.submitting") || "Cambiando...")
                : (t("change_password.submit") || "Cambiar password")}
            </Button>

            {!forced && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = "/")}
                disabled={loading}
              >
                {t("change_password.cancel") || "Cancelar"}
              </Button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
