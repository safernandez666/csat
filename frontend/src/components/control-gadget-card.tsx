import { Shield, ShieldCheck, ShieldAlert, ShieldOff, ArrowRight } from "lucide-react";

interface ControlGadgetProps {
  id: number;
  cis_id: string;
  name: string;
  status: string;
  score: number;
  group: string;
}

const statusConfig: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode; label: string }> = {
  implemented: {
    bg: "bg-success/5",
    border: "border-success/30",
    text: "text-success",
    icon: <ShieldCheck className="h-4 w-4" />,
    label: "Implemented",
  },
  in_progress: {
    bg: "bg-info/5",
    border: "border-info/30",
    text: "text-info",
    icon: <Shield className="h-4 w-4" />,
    label: "In Progress",
  },
  needs_review: {
    bg: "bg-warning/5",
    border: "border-warning/30",
    text: "text-warning",
    icon: <ShieldAlert className="h-4 w-4" />,
    label: "Needs Review",
  },
  not_implemented: {
    bg: "bg-danger/5",
    border: "border-danger/30",
    text: "text-danger",
    icon: <ShieldOff className="h-4 w-4" />,
    label: "Not Implemented",
  },
};

const groupConfig: Record<string, string> = {
  Basic: "bg-success/10 text-success border-success/20",
  Foundational: "bg-info/10 text-info border-info/20",
  Organizational: "bg-purple/10 text-purple border-purple/20",
};

export function ControlGadgetCard({ id, cis_id, name, status, score, group }: ControlGadgetProps) {
  const cfg = statusConfig[status] || statusConfig.not_implemented;

  return (
    <a
      href={`/controls/${id}`}
      className={`group relative flex flex-col rounded-xl border ${cfg.border} ${cfg.bg} p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-opacity-60`}
    >
      {/* Top row: CIS number + status icon */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl font-bold tracking-tight text-foreground">{cis_id}</span>
        <span className={`${cfg.text}`}>{cfg.icon}</span>
      </div>

      {/* Control name */}
      <h3 className="text-sm font-semibold leading-snug line-clamp-2 mb-3 text-foreground">
        {name}
      </h3>

      {/* Progress bar */}
      <div className="mt-auto">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
          <span className="text-xs font-bold text-foreground">{score}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-border/50 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              status === "implemented"
                ? "bg-success"
                : status === "in_progress"
                ? "bg-info"
                : status === "needs_review"
                ? "bg-warning"
                : "bg-danger"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Footer badges */}
      <div className="mt-3 flex items-center justify-between">
        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${groupConfig[group] || "bg-muted/10 text-muted border-muted/20"}`}>
          {group}
        </span>
        <ArrowRight className="h-3 w-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
}
