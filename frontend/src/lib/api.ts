import type { Control, Evidence, CommentItem, AuditLogItem, DashboardSummary, TrendData, User } from "../types";

const API_BASE = "";

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const doFetch = async (): Promise<Response> =>
    fetch(`${API_BASE}${url}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options?.headers || {}),
        "Content-Type": "application/json",
      },
    });

  let res = await doFetch();

  if (res.status === 401 && url !== "/api/auth/refresh" && url !== "/api/auth/login") {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    } else {
      window.location.replace("/login");
      throw new Error("Unauthorized");
    }
  }

  if (res.status === 401) {
    window.location.replace("/login");
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) => // ship-safe-ignore: JWT auth, no server session to regenerate
    fetchJson<{ access_token: string; refresh_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => fetchJson<{ detail: string }>("/api/auth/logout", { method: "POST" }),

  me: () => fetchJson<User>("/api/auth/me"),

  getControls: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchJson<Control[]>(`/api/controls${qs}`);
  },

  getControl: (id: number) => fetchJson<Control>(`/api/controls/${id}`),

  updateControl: (id: number, data: Partial<Control>) =>
    fetchJson<Control>(`/api/controls/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  updateSafeguard: (controlId: number, safeguardId: number, status: string) =>
    fetchJson<Control>(`/api/controls/${controlId}/safeguards/${safeguardId}`, {
      method: "PUT",
      body: JSON.stringify({ implementation_status: status }),
    }),

  getEvidence: (controlId?: number) => {
    const qs = controlId ? `?control_id=${controlId}` : "";
    return fetchJson<Evidence[]>(`/api/evidence${qs}`);
  },

  uploadEvidence: (formData: FormData) =>
    fetch("/api/evidence", { method: "POST", body: formData, credentials: "include" }).then(async (res) => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    }),

  deleteEvidence: (id: number) => fetchJson(`/api/evidence/${id}`, { method: "DELETE" }),

  getComments: (controlId?: number) => {
    const qs = controlId ? `?control_id=${controlId}` : "";
    return fetchJson<CommentItem[]>(`/api/comments${qs}`);
  },

  createComment: (controlId: number, content: string) =>
    fetchJson<CommentItem>("/api/comments", { method: "POST", body: JSON.stringify({ control_id: controlId, content }) }),

  getAuditLogs: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchJson<AuditLogItem[]>(`/api/audit-logs${qs}`);
  },

  getDashboardSummary: () => fetchJson<DashboardSummary>("/api/dashboard/summary"),

  getDashboardTrends: () => fetchJson<TrendData>("/api/dashboard/trends"),

  getDashboardRadar: () => fetchJson<{ radar: { group: string; score: number; total: number }[] }>("/api/dashboard/radar"),

  getDashboardIgProgress: () => fetchJson<Record<string, { total: number; implemented: number; score: number }>>("/api/dashboard/ig-progress"),

  getDashboardControlScores: () => fetchJson<{ scores: { id: number; cis_id: string; name: string; status: string; group: string; score: number; total: number; implemented: number }[] }>("/api/dashboard/control-scores"),

  exportPdf: () =>
    fetch("/api/reports/pdf", { method: "POST", credentials: "include" }).then(async (res) => {
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "csat-report.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    }),

  exportXlsx: () =>
    fetch("/api/reports/xlsx", { method: "POST", credentials: "include" }).then(async (res) => {
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "csat-report.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    }),

  getUsers: () => fetchJson<User[]>("/api/users"),

  createUser: (data: any) => fetchJson<User>("/api/users", { method: "POST", body: JSON.stringify(data) }),

  updateUser: (id: number, data: any) => fetchJson<User>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteUser: (id: number) => fetchJson(`/api/users/${id}`, { method: "DELETE" }),

  getSettings: () => fetchJson<Record<string, any>>("/api/settings"),

  getPublicSettings: () => fetchJson<Record<string, any>>("/api/settings/public"),

  updateSetting: (key: string, value: any) =>
    fetchJson(`/api/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),

  getAiConfig: () => fetchJson<Record<string, any>>("/api/ai/config"),

  updateAiConfig: (data: Record<string, any>) =>
    fetchJson<Record<string, any>>("/api/ai/config", { method: "PUT", body: JSON.stringify(data) }),

  aiHealth: (overrides?: Record<string, any>) =>
    fetchJson<Record<string, any>>("/api/ai/health", {
      method: "POST",
      body: overrides ? JSON.stringify(overrides) : undefined,
    }),

  aiChat: (message: string) =>
    fetchJson<{ reply: string }>("/api/ai/chat", { method: "POST", body: JSON.stringify({ message }) }),

  getChatHistory: () =>
    fetchJson<{ id: number; role: "user" | "assistant"; content: string; created_at: string }[]>(
      "/api/ai/chat/history"
    ),

  clearChatHistory: () =>
    fetchJson<{ deleted: number }>("/api/ai/chat/history", { method: "DELETE" }),

  aiQuickWins: () => fetchJson<{ candidates: any[]; ai_analysis: any }>("/api/ai/quick-wins"),

  evaluateEvidence: (evidenceId: number) =>
    fetchJson<{
      verdict: "sufficient" | "partial" | "insufficient";
      reasoning: string;
      gaps: string[];
      recommendations: string[];
      extracted_chars: number;
    }>(`/api/ai/evaluate-evidence/${evidenceId}`, { method: "POST" }),

  testOidc: (config: { issuer_url: string; client_id?: string; client_secret?: string }) =>
    fetchJson<{ status: "ok" | "error"; detail: string; issuer?: string; authorization_endpoint?: string; token_endpoint?: string }>(
      "/api/auth/oidc/test",
      { method: "POST", body: JSON.stringify(config) }
    ),

  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch("/api/settings/logo", {
      method: "POST",
      body: formData,
      credentials: "include",
    }).then(async (res) => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json() as Promise<{ logo_url: string }>;
    });
  },
};
