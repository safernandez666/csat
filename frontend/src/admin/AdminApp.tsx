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

  // Dark-only (External ASM palette). Same forcing as tenant App.tsx —
  // any leftover "theme: light" from older sessions is ignored.
  useEffect(() => {
    document.documentElement.classList.add("dark");
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

  // When ANY admin API call returns 401 (most commonly: access token
  // expired — the 15-min cookie has no refresh flow for super-admin),
  // reset to the login screen automatically. Without this the user
  // sees a generic "Unauthorized" alert on each subsequent action.
  useEffect(() => {
    const onUnauth = () => {
      setAuthState("unauthenticated");
      setAdminEmail("");
    };
    window.addEventListener("admin-unauthorized", onUnauth);
    return () => window.removeEventListener("admin-unauthorized", onUnauth);
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
