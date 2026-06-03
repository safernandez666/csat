// Shown when the SPA loads on a subdomain that doesn't match any active
// tenant. Static assets are served by nginx for ANY host, so the SPA
// itself can't be gated at the edge — we detect the 404 from
// /api/auth/me at boot and render this page instead of the login form.
import { Building2 } from "lucide-react";
import { ParticlesBackground } from "../components/particles-background";

export default function TenantNotFoundPage() {
  const slug = window.location.hostname.split(".")[0];
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <ParticlesBackground />
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-xl bg-danger-dim border border-danger/30">
            <Building2 className="size-7 text-danger" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Cliente no encontrado</h1>
          <p className="text-sm text-muted leading-relaxed max-w-sm">
            El subdominio{" "}
            <code className="rounded bg-card border border-border px-1.5 py-0.5 font-mono text-xs text-foreground">
              {slug}
            </code>{" "}
            no corresponde a ninguna empresa registrada en esta plataforma.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-5 space-y-2 text-left text-xs text-muted">
          <p className="font-medium text-foreground text-sm">¿Qué hacer?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Verificá que el subdominio esté escrito correctamente.</li>
            <li>Si sos cliente, pedile al super-administrador que dé de alta tu empresa.</li>
            <li>Si eras cliente y ya no podés entrar, tu empresa puede estar suspendida o eliminada.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
