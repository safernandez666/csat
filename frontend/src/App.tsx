import { useState, useEffect } from "react";
import { NavSidebar } from "./components/nav-sidebar";
import { AppSettingsProvider } from "./contexts/app-settings";
import { api } from "./lib/api";
import { getStoredLanguage, setStoredLanguage, type Language } from "./lib/i18n";
import { Spinner } from "./components/ui/spinner";
import { Toaster } from "./components/ui/toaster";
import LoginPage from "./pages/login";
import ChangePasswordPage from "./pages/change-password";
import TenantNotFoundPage from "./pages/tenant-not-found";
import DashboardPage from "./pages/dashboard";
import ControlsPage from "./pages/controls";
import ControlDetailPage from "./pages/control-detail";
import EvidencePage from "./pages/evidence";
import UsersPage from "./pages/users";
import AuditLogsPage from "./pages/audit-logs";
import SettingsPage from "./pages/settings";
import AssistantPage from "./pages/assistant";
import QuickWinsPage from "./pages/quick-wins";
import ImplementationWavesPage from "./pages/implementation-waves";
import ExportReportPage from "./pages/export-report";
import { AdminApp } from "./admin/AdminApp";

export function useParams() {
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);
  return { id: parts[1] || "" };
}

function App() {
  // Admin plane detection — must be the very first check so admin.<domain> never
  // attempts to boot the tenant auth flow.
  if (window.location.hostname.startsWith("admin.")) {
    return <AdminApp />;
  }

  const [path, setPath] = useState(window.location.pathname);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [tenantMissing, setTenantMissing] = useState(false);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    // Theme init
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Language init (applies on login page too, before AppSettingsProvider mounts)
    document.documentElement.lang = getStoredLanguage();

    fetch("/api/auth/me", { credentials: "include" })
      .then(async (r) => {
        // Distinguish "tenant doesn't exist" (middleware rejects all /api/*
        // with 404) from "unauthenticated" (route reachable, 401).
        if (r.status === 404) {
          setTenantMissing(true);
          setAuthenticated(false);
          return;
        }
        setAuthenticated(r.ok);
        if (r.ok) {
          try {
            const me = await r.json();
            setMustChangePassword(Boolean(me?.must_change_password));
          } catch {
            // ignore JSON parse errors — flag stays false
          }
          // Best-effort: sync the stored language from the server on the very first
          // render so deep links like /controls or /waves don't render in the
          // wrong language while AppSettingsProvider is still booting.
          api
            .getPublicSettings()
            .then(() => api.getSettings())
            .then((s) => {
              const v = s.language;
              if (v === "en" || v === "es" || v === "pt") {
                setStoredLanguage(v as Language);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner className="text-accent" />
      </div>
    );
  }

  if (tenantMissing) {
    return <TenantNotFoundPage />;
  }

  if (!authenticated || path === "/login") { // ship-safe-ignore: frontend route check, rate-limit is backend
    return <LoginPage />;
  }

  // Forced password change (Task 14): if the server flagged the user with
  // must_change_password (provisioned tenant admin, or post admin-reset),
  // redirect any navigation to /change-password until they rotate.
  if (mustChangePassword && path !== "/change-password") {
    window.history.replaceState({}, "", "/change-password");
    return <ChangePasswordPage forced />;
  }
  if (path === "/change-password") {
    return <ChangePasswordPage forced={mustChangePassword} />;
  }

  let page;
  if (path === "/" || path === "/dashboard") page = <DashboardPage />;
  else if (path === "/controls") page = <ControlsPage />;
  else if (path.startsWith("/controls/")) page = <ControlDetailPage />;
  else if (path === "/evidence") page = <EvidencePage />;
  else if (path === "/users") page = <UsersPage />;
  else if (path === "/audit-logs") page = <AuditLogsPage />;
  else if (path === "/settings") page = <SettingsPage />;
  else if (path === "/assistant") page = <AssistantPage />;
  else if (path === "/quick-wins") page = <QuickWinsPage />;
  else if (path === "/waves") page = <ImplementationWavesPage />;
  else if (path === "/export-report") page = <ExportReportPage />;
  else page = <DashboardPage />;

  return (
    <AppSettingsProvider>
      <NavSidebar />
      <div className="pl-14">{page}</div>
      <Toaster />
    </AppSettingsProvider>
  );
}

export default App;
