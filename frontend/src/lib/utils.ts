import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleString();
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString();
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function riskColor(risk: string): string {
  switch (risk) {
    case "critical":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    case "high":
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    case "medium":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "low":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    default:
      return "text-muted bg-card border-border";
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "implemented":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "in_progress":
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "needs_review":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "not_implemented":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    default:
      return "text-muted bg-card border-border";
  }
}

/** Return true if the URL uses a safe protocol for user-supplied links. */
export function isSafeExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" || u.protocol === "mailto:";
  } catch {
    return false;
  }
}
