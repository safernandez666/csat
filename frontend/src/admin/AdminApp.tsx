import { useState, useEffect } from "react";
import { Spinner } from "../components/ui/spinner";
import { Toaster } from "../components/ui/toaster";
import { adminApi, AdminUnauthorizedError } from "../lib/admin-api";
import AdminLoginPage from "./pages/admin-login";
import CompaniesPage from "./pages/companies";
import { AdminSidebar } from "./components/admin-sidebar";

type AuthState = "loading" | "unauthenticated" | "authenticated";

export function AdminApp() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [adminEmail, setAdminEmail] = useState("");
  const [currentPage, setCurrentPage] = useState("companies");

  // Theme init — mirror what App.tsx does so the admin plane uses the same setting
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefersDark;
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const checkAuth = async () => {
    try {
      const me = await adminApi.me();
      setAdminEmail(me.email);
      setAuthState("authenticated");
    } catch (e) {
      if (e instanceof AdminUnauthorizedError) {
        setAuthState("unauthenticated");
      } else {
        // Network or server error — treat as unauthenticated so we show login
        setAuthState("unauthenticated");
      }
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (authState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner className="text-accent" />
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <>
        <AdminLoginPage onLoginSuccess={checkAuth} />
        <Toaster />
      </>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "companies":
        return <CompaniesPage />;
      default:
        return <CompaniesPage />;
    }
  };

  return (
    <>
      <AdminSidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        adminEmail={adminEmail}
      />
      <div className="pl-14 min-h-screen bg-background">
        {renderPage()}
      </div>
      <Toaster />
    </>
  );
}
