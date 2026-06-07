import { useState } from "react";
import { Building2, LogOut, User, Moon, Sun } from "lucide-react";
import { adminApi } from "../../lib/admin-api";

interface AdminSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  adminEmail: string;
}

export function AdminSidebar({ currentPage, onNavigate, adminEmail }: AdminSidebarProps) {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("theme") !== "light";
  });

  // Dark-only (External ASM palette). Toggle stays in the UI as a
  // placeholder but is a no-op — re-enable by restoring the previous
  // body when a light palette ships.
  const toggleTheme = () => {
    document.documentElement.classList.add("dark");
  };

  const handleLogout = async () => {
    try {
      await adminApi.logout();
    } catch {
      // ignore errors — redirect regardless
    }
    window.location.reload();
  };

  const navItem = (
    page: string,
    icon: React.ReactNode,
    label: string
  ) => {
    const isActive = currentPage === page;
    return (
      <button
        type="button"
        onClick={() => onNavigate(page)}
        className={`group relative flex size-10 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
          isActive
            ? "bg-accent/10 text-accent"
            : "text-muted hover:bg-card hover:text-foreground"
        }`}
        aria-label={label}
      >
        {icon}
        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed left-0 top-0 z-40 flex h-screen w-14 flex-col items-center border-r border-border bg-card/95 pt-20 pb-4 backdrop-blur">
      {/* Brand mark */}
      <div className="absolute top-4 flex size-8 items-center justify-center rounded-lg bg-primary">
        <span className="text-xs font-bold text-primary-foreground">SA</span>
      </div>

      <div className="flex flex-col items-center gap-1 flex-1">
        {navItem("companies", <Building2 className="size-5" />, "Clientes")}
      </div>

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={toggleTheme}
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          aria-label="Cambiar tema"
        >
          {dark ? <Sun className="h-5 w-5 text-warning" /> : <Moon className="h-5 w-5 text-info" />}
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Cambiar tema
          </span>
        </button>

        <div className="my-1 h-px w-6 bg-border" />

        <div className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
          <User className="h-4 w-4 text-accent" />
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {adminEmail}
          </span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-danger-dim focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-4 w-4 text-danger" />
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Cerrar sesión
          </span>
        </button>
      </div>
    </div>
  );
}
