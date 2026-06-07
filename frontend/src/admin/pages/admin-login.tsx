import { useState } from "react";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { adminApi, AdminUnauthorizedError } from "../../lib/admin-api";

const PAGE_BG = {
  background: [
    "radial-gradient(circle at 18% 12%, rgba(182,255,59,0.13), transparent 26%)",
    "linear-gradient(135deg, #050505 0%, #0a0a0a 50%, #11120f 100%)",
  ].join(", "),
} as const;

const LEFT_BG = {
  background: [
    "radial-gradient(circle at 100% 100%, rgba(182,255,59,0.18), transparent 68%)",
    "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.01))",
    "repeating-linear-gradient(0deg, rgba(182,255,59,0.035) 0 1px, transparent 1px 34px)",
    "repeating-linear-gradient(90deg, rgba(182,255,59,0.025) 0 1px, transparent 1px 34px)",
  ].join(", "),
} as const;

const RIGHT_BG = {
  background: "linear-gradient(180deg, #111, #080808)",
} as const;

const BULLET_DOT: React.CSSProperties = {
  background: "#B6FF3B",
  boxShadow: "0 0 18px rgba(182,255,59,0.55)",
};

// Admin SPA is operator-facing and not localized — copy stays inline
// in English to match the rest of the platform's login experience.
const VALUE_BULLETS = [
  "Onboard and offboard companies with dedicated subdomains",
  "Suspend and reactivate tenants",
  "On-demand backups with direct download",
  "Per-tenant branding and configuration",
  "Isolated operations across per-tenant databases",
];

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
}

export default function AdminLoginPage({ onLoginSuccess }: AdminLoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminApi.login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      if (err instanceof AdminUnauthorizedError) {
        setError("Invalid credentials");
      } else {
        setError(err.message || "Sign-in error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    // Force dark scope on the login regardless of the user's theme toggle —
    // the inline gradient backgrounds are hardcoded dark, so semantic text
    // tokens (text-foreground etc) must resolve to the dark palette here.
    <div
      className="dark text-foreground relative flex min-h-screen items-center justify-center px-4 py-10"
      style={PAGE_BG}
    >
      <div
        className="relative grid w-full max-w-[980px] grid-cols-1 overflow-hidden md:grid-cols-[1.05fr_1fr] animate-fade-in-up"
        style={{
          background: "rgba(10,10,10,0.92)",
          border: "1px solid #3a3a3a",
          borderRadius: "18px",
          boxShadow: "0 28px 90px rgba(0,0,0,0.46)",
        }}
      >
        {/* Left column: operator storytelling */}
        <aside
          className="relative hidden flex-col justify-between gap-10 p-10 md:flex"
          style={LEFT_BG}
        >
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-2 shadow-md">
                <ShieldCheck className="size-5 text-primary-foreground" />
              </div>
              <span className="font-extrabold tracking-tight">CSAT Super-Admin</span>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Administration Plane
              </p>
              <h2 className="text-[38px] font-extrabold leading-[1.05] tracking-[-0.04em] text-foreground md:text-[42px]">
                Central client management for ZebraSecurity.
              </h2>
              <p className="text-base font-semibold text-primary">
                Onboarding, suspension and backups of tenants in one place.
              </p>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Operator console. Every company gets its own subdomain and
                isolated database — this view controls the full lifecycle:
                provisioning, suspension, backups and branding.
              </p>
            </div>

            <ul className="space-y-3 pt-2">
              {VALUE_BULLETS.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-muted">
                  <span
                    className="mt-[7px] inline-block size-2 shrink-0 rounded-full"
                    style={BULLET_DOT}
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Operator access only
          </p>
        </aside>

        {/* Right column: form */}
        <section className="flex flex-col justify-center p-8 md:p-[42px]" style={RIGHT_BG}>
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-2 shadow-md">
              <ShieldCheck className="size-5 text-primary-foreground" />
            </div>
            <span className="font-extrabold tracking-tight">CSAT Super-Admin</span>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Secure access
            </p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Client management panel
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@example.com"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
