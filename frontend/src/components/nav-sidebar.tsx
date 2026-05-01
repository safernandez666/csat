import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Shield,
  FileText,
  Users,
  ClipboardList,
  Settings,
  Moon,
  Sun,
  LogOut,
  User,
  Download,
  Bot,
  Zap,
  Layers,
} from "lucide-react";
import { api } from "../lib/api";

export function NavSidebar() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("theme") !== "light";
  });
  const [currentUser, setCurrentUser] = useState("user");
  const path = window.location.pathname;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.full_name || d.email || "user"))
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    const root = document.documentElement;
    if (next) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const navItem = (href: string, icon: React.ReactNode, label: string, color: string) => {
    const isActive = path === href || (href !== "/" && path.startsWith(href));
    return (
      <a
        href={href}
        className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
          isActive ? `${color} bg-card` : `hover:${color}`
        }`}
        aria-label={label}
      >
        {icon}
        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
          {label}
        </span>
      </a>
    );
  };

  return (
    <div className="fixed left-0 top-0 z-40 flex h-screen w-14 flex-col items-center border-r border-border bg-card/95 pt-20 pb-4 backdrop-blur">
      <div className="flex flex-col items-center gap-1 flex-1">
        {navItem("/", <LayoutDashboard className="h-5 w-5 text-info" />, "Dashboard", "bg-info-dim")}
        {navItem("/assistant", <Bot className="h-5 w-5 text-accent" />, "AI Assistant", "bg-accent/10")}
        {navItem("/quick-wins", <Zap className="h-5 w-5 text-warning" />, "Quick Wins", "bg-warning-dim")}
        {navItem("/waves", <Layers className="h-5 w-5 text-purple" />, "Implementation Waves", "bg-purple-dim")}
        {navItem("/controls", <Shield className="h-5 w-5 text-success" />, "CIS Controls", "bg-success-dim")}
        {navItem("/evidence", <FileText className="h-5 w-5 text-warning" />, "Evidence", "bg-warning-dim")}
        {navItem("/users", <Users className="h-5 w-5 text-purple" />, "Users", "bg-purple-dim")}
        {navItem("/audit-logs", <ClipboardList className="h-5 w-5 text-info" />, "Audit Logs", "bg-info-dim")}
        {navItem("/export-report", <Download className="h-5 w-5 text-danger" />, "Export Report", "bg-danger-dim")}
      </div>

      <div className="flex flex-col items-center gap-1">
        {navItem("/settings", <Settings className="h-5 w-5 text-muted" />, "Settings", "bg-card")}

        <button
          type="button"
          onClick={toggleTheme}
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-5 w-5 text-warning" /> : <Moon className="h-5 w-5 text-info" />}
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {dark ? "Light mode" : "Dark mode"}
          </span>
        </button>

        <div className="my-1 h-px w-6 bg-border" />

        <div className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
          <User className="h-4 w-4 text-accent" />
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {currentUser}
          </span>
        </div>

        <button
          type="button"
          onClick={async () => {
            await api.logout();
            window.location.href = "/login"; // ship-safe-ignore: frontend redirect, rate-limit is backend
          }}
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-danger-dim focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4 text-danger" />
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Sign out
          </span>
        </button>
      </div>
    </div>
  );
}
