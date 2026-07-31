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

// Severities use semantic tokens (success/warning/danger/orange) so the
// External ASM dark+lime palette repaints them automatically — no
// hardcoded Tailwind colors here.
export function riskColor(risk: string): string {
  switch (risk) {
    case "critical":
      return "text-danger bg-danger-dim border-danger-border";
    case "high":
      return "text-orange bg-orange/10 border-orange/30";
    case "medium":
      return "text-warning bg-warning-dim border-warning-border";
    case "low":
      return "text-success bg-success-dim border-success-border";
    default:
      return "text-muted bg-card border-border";
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "implemented":
      return "text-success bg-success-dim border-success-border";
    case "in_progress":
      return "text-info bg-info-dim border-info-border";
    case "needs_review":
      return "text-warning bg-warning-dim border-warning-border";
    case "not_implemented":
      return "text-danger bg-danger-dim border-danger-border";
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
