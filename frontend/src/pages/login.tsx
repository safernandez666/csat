import { useState, useEffect } from "react";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ParticlesBackground } from "../components/particles-background";
import { api } from "../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [publicSettings, setPublicSettings] = useState<{ platform_name?: string; company_logo_url?: string | null }>({});

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
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <ParticlesBackground />
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-primary shadow-md">
            {publicSettings.company_logo_url ? (
              <img src={publicSettings.company_logo_url} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <ShieldCheck className="size-6 text-primary-foreground" />
            )}
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">{platformName}</h1>
            <p className="text-sm text-muted">CIS Controls Assessment & Tracking</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Email</label>
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
            <label className="block text-xs font-medium text-muted mb-1">Password</label>
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="rounded-lg border border-border bg-card/50 p-3 text-xs text-muted space-y-1">
          <p className="font-semibold text-foreground">Demo credentials</p>
          <p>admin@csat.local / Admin123!</p>
          <p>analyst@csat.local / Analyst123!</p>
        </div>
      </div>
    </div>
  );
}
