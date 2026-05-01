import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { useAppSettings } from "../contexts/app-settings";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  const { settings } = useAppSettings();
  const displayTitle = title || settings.platform_name || "CSAT";

  useEffect(() => {
    document.title = title ? `${title} — ${settings.platform_name || "CSAT"}` : `${settings.platform_name || "CSAT"} — CIS Controls Platform`;
  }, [title, settings.platform_name]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased transition-colors">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 overflow-hidden">
              {settings.company_logo_url ? (
                <img
                  src={settings.company_logo_url}
                  alt="Logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ShieldCheck className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{displayTitle}</h1>
              {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
