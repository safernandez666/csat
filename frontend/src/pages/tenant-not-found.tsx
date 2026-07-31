// Shown when the SPA loads on a subdomain whose tenant either doesn't
// exist or is suspended. Static assets are served by nginx for ANY host,
// so the SPA itself can't be gated at the edge — we detect the 404 from
// /api/auth/me at boot and render this page instead of the login form.
//
// Backend distinguishes both cases via the response body:
//   { "detail": "Not found" } → tenant doesn't exist
//   { "detail": "Suspended" } → exists but status != "active"
import { Building2, PauseCircle } from "lucide-react";
import { ParticlesBackground } from "../components/particles-background";

interface Props {
  mode?: "missing" | "suspended";
}

export default function TenantNotFoundPage({ mode = "missing" }: Props) {
  const slug = window.location.hostname.split(".")[0];
  const isSuspended = mode === "suspended";

  const Icon = isSuspended ? PauseCircle : Building2;
  const title = isSuspended ? "Cliente suspendido" : "Cliente no encontrado";
  const iconWrap = isSuspended
    ? "bg-warning-dim border border-warning/30"
    : "bg-danger-dim border border-danger/30";
  const iconColor = isSuspended ? "text-warning" : "text-danger";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <ParticlesBackground />
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className={`flex size-14 items-center justify-center rounded-xl ${iconWrap}`}>
            <Icon className={`size-7 ${iconColor}`} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted leading-relaxed max-w-sm">
            El subdominio{" "}
            <code className="rounded bg-card border border-border px-1.5 py-0.5 font-mono text-xs text-foreground">
              {slug}
            </code>{" "}
            {isSuspended
              ? "corresponde a una empresa que fue suspendida temporalmente."
              : "no corresponde a ninguna empresa registrada en esta plataforma."}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-5 space-y-2 text-left text-xs text-muted">
          <p className="font-medium text-foreground text-sm">¿Qué hacer?</p>
          <ul className="list-disc list-inside space-y-1">
            {isSuspended ? (
              <>
                <li>Contactá al super-administrador para que reactive tu empresa.</li>
                <li>Mientras esté suspendida, los datos del cliente no son accesibles desde el subdominio.</li>
                <li>La data sigue almacenada y se restaura al instante cuando se reactiva.</li>
              </>
            ) : (
              <>
                <li>Verificá que el subdominio esté escrito correctamente.</li>
                <li>Si sos cliente, pedile al super-administrador que dé de alta tu empresa.</li>
                <li>Si eras cliente y ya no podés entrar, tu empresa puede haber sido eliminada.</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
