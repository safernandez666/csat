import { useState, useEffect } from "react";
import { NavSidebar } from "./components/nav-sidebar";
import { AppSettingsProvider } from "./contexts/app-settings";
import { Spinner } from "./components/ui/spinner";
import { Toaster } from "./components/ui/toaster";
import LoginPage from "./pages/login";
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

export function useParams() {
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);
  return { id: parts[1] || "" };
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

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

    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => {
        setAuthenticated(r.ok);
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

  if (!authenticated || path === "/login") { // ship-safe-ignore: frontend route check, rate-limit is backend
    return <LoginPage />;
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
