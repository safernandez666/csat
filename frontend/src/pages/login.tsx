import { useState, useEffect } from "react";
import { ShieldCheck, Eye, EyeOff, Building2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import { useTranslation } from "../hooks/use-translation";

// Page-wide background: radial lime glow top-left + diagonal black ramp
const PAGE_BG = {
  background: [
    "radial-gradient(circle at 18% 12%, rgba(182,255,59,0.13), transparent 26%)",
    "linear-gradient(135deg, #050505 0%, #0a0a0a 50%, #11120f 100%)",
  ].join(", "),
} as const;

// Left column: subtle technical grid + bottom-right lime glow
const LEFT_BG = {
  background: [
    "radial-gradient(circle at 100% 100%, rgba(182,255,59,0.18), transparent 68%)",
    "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.01))",
    "repeating-linear-gradient(0deg, rgba(182,255,59,0.035) 0 1px, transparent 1px 34px)",
    "repeating-linear-gradient(90deg, rgba(182,255,59,0.025) 0 1px, transparent 1px 34px)",
  ].join(", "),
} as const;

// Right column: vertical near-black ramp behind the form
const RIGHT_BG = {
  background: "linear-gradient(180deg, #111, #080808)",
} as const;

// Bullet glow used in the value-prop list on the left column
const BULLET_DOT: React.CSSProperties = {
  background: "#B6FF3B",
  boxShadow: "0 0 18px rgba(182,255,59,0.55)",
};

// Brand pillars for the storytelling column live in i18n under
// login.brand.bullet_{1..5}. The five-key shape is intentional —
// translators can rewrite each line without parsing arrays.
const BULLET_KEYS = [
  "login.brand.bullet_1",
  "login.brand.bullet_2",
  "login.brand.bullet_3",
  "login.brand.bullet_4",
  "login.brand.bullet_5",
] as const;

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [publicSettings, setPublicSettings] = useState<{
    platform_name?: string;
    company_logo_url?: string | null;
    is_dev?: boolean;
    oidc_enabled?: boolean;
  }>({});

  useEffect(() => {
    api.getPublicSettings().then(setPublicSettings).catch(() => {});
  }, []);

  const platformName = publicSettings.platform_name || "CSAT";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.login(email, password);
      window.location.href = "/";
    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-10"
      style={PAGE_BG}
    >
      <div
        className="relative grid w-full max-w-[980px] grid-cols-1 overflow-hidden md:grid-cols-[1.05fr_1fr]"
        style={{
          background: "rgba(10,10,10,0.92)",
          border: "1px solid #3a3a3a",
          borderRadius: "18px",
          boxShadow: "0 28px 90px rgba(0,0,0,0.46)",
        }}
      >
        {/* Left column: storytelling on technical grid */}
        <aside
          className="relative hidden flex-col justify-between gap-10 p-10 md:flex"
          style={LEFT_BG}
        >
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-2 shadow-md">
                {publicSettings.company_logo_url ? (
                  <img
                    src={publicSettings.company_logo_url}
                    alt="Logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ShieldCheck className="size-5 text-primary-foreground" />
                )}
              </div>
              <span className="font-extrabold tracking-tight">{platformName}</span>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                {t("login.brand.kicker")}
              </p>
              <h2 className="text-[38px] font-extrabold leading-[1.05] tracking-[-0.04em] text-foreground md:text-[42px]">
                {t("login.brand.headline")}
              </h2>
              <p className="text-base font-semibold text-primary">
                {t("login.brand.subhead")}
              </p>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                {t("login.brand.copy")}
              </p>
            </div>

            <ul className="space-y-3 pt-2">
              {BULLET_KEYS.map((k) => (
                <li key={k} className="flex items-start gap-3 text-sm text-muted">
                  <span
                    className="mt-[7px] inline-block size-2 shrink-0 rounded-full"
                    style={BULLET_DOT}
                  />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("login.brand.footer")}
          </p>
        </aside>

        {/* Right column: the form */}
        <section className="flex flex-col justify-center p-8 md:p-[42px]" style={RIGHT_BG}>
          {/* Mobile-only header (left column is hidden) */}
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-2 shadow-md">
              {publicSettings.company_logo_url ? (
                <img
                  src={publicSettings.company_logo_url}
                  alt="Logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ShieldCheck className="size-5 text-primary-foreground" />
              )}
            </div>
            <span className="font-extrabold tracking-tight">{platformName}</span>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("login.secure_access")}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {t("login.subtitle")}
            </h1>
          </div>

          {publicSettings.oidc_enabled && (
            <>
              <Button
                type="button"
                variant="outline"
                className="mt-6 w-full"
                onClick={() => {
                  window.location.href = "/api/auth/oidc/login";
                }}
              >
                <Building2 className="mr-2 h-4 w-4" />
                {t("login.sso")}
              </Button>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#0c0c0c] px-2 text-muted-foreground">
                    {t("login.or")}
                  </span>
                </div>
              </div>
            </>
          )}

          <form
            onSubmit={handleSubmit}
            className={publicSettings.oidc_enabled ? "space-y-4" : "mt-6 space-y-4"}
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("login.email")}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@csat.local" // ship-safe-ignore: demo placeholder
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("login.password")}
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
              {loading ? t("login.submitting") : t("login.submit")}
            </Button>
          </form>

          {publicSettings.is_dev && (
            <div className="mt-6 rounded-lg border border-border bg-card/50 p-3 text-xs text-muted space-y-1">
              <p className="font-semibold text-foreground">{t("login.demo_credentials")}</p>
              <p>admin@csat.local / Admin123!</p>
              <p>analyst@csat.local / Analyst123!</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
