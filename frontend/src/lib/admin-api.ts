// Admin API client — separate from api.ts so 401 errors set "show login" state
// instead of hard-redirecting to /login (which would loop on the admin plane).

export interface CompanySummary {
  id: number;
  slug: string;
  name: string;
  status: string;
  created_at: string;
  suspended_at: string | null;
}

export interface CreateCompanyResult {
  slug: string;
  admin_email: string;
  temp_password: string;
}

export interface AdminUser {
  id: number;
  email: string;
}

export class AdminUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AdminUnauthorizedError";
  }
}

async function adminFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (res.status === 401) {
    // Notify the SPA root so it can reset to the login screen instead of
    // surfacing a generic "Unauthorized" alert from each call site.
    window.dispatchEvent(new Event("admin-unauthorized"));
    throw new AdminUnauthorizedError();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

export const adminApi = {
  login: (email: string, password: string) =>
    adminFetch<{ access_token: string; token_type: string }>("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    adminFetch<{ detail: string }>("/api/admin/auth/logout", { method: "POST" }),

  me: () => adminFetch<AdminUser>("/api/admin/auth/me"),

  getCompanies: () => adminFetch<CompanySummary[]>("/api/admin/companies"),

  getCompany: (slug: string) => adminFetch<CompanySummary>(`/api/admin/companies/${slug}`),

  createCompany: (data: {
    slug: string;
    name: string;
    admin_email: string;
    admin_full_name: string;
  }) =>
    adminFetch<CreateCompanyResult>("/api/admin/companies", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  suspendCompany: (slug: string) =>
    adminFetch<CompanySummary>(`/api/admin/companies/${slug}/suspend`, { method: "POST" }),

  activateCompany: (slug: string) =>
    adminFetch<CompanySummary>(`/api/admin/companies/${slug}/activate`, { method: "POST" }),

  resetAdminPassword: (slug: string) =>
    adminFetch<{ admin_email: string; temp_password: string }>(
      `/api/admin/companies/${slug}/admin-reset`,
      { method: "POST" }
    ),

  backupCompany: (slug: string) =>
    adminFetch<{ archive_path: string; filename: string }>(
      `/api/admin/companies/${slug}/backup`,
      { method: "POST" }
    ),

  // Returns a same-origin URL the browser can navigate to. Cookies (and
  // therefore auth) are sent automatically. Use with an anchor[download]
  // click to trigger a save dialog.
  backupDownloadUrl: (filename: string) => `/api/admin/backups/${encodeURIComponent(filename)}`,

  deleteCompany: (slug: string) =>
    adminFetch<{ slug: string; ok: boolean }>(`/api/admin/companies/${slug}`, { method: "DELETE" }),
};
