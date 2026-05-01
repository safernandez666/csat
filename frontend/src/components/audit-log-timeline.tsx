import { Clock, User, Shield, FileText, Settings } from "lucide-react";
import type { AuditLogItem } from "../types";
import { formatDate } from "../lib/utils";

const actionIcons: Record<string, React.ReactNode> = {
  login_success: <Shield className="h-4 w-4 text-success" />,
  login_failed: <Shield className="h-4 w-4 text-danger" />,
  logout: <User className="h-4 w-4 text-muted" />,
  control_updated: <FileText className="h-4 w-4 text-accent" />,
  evidence_created: <FileText className="h-4 w-4 text-info" />,
  evidence_deleted: <FileText className="h-4 w-4 text-danger" />,
  user_created: <User className="h-4 w-4 text-success" />,
  user_updated: <User className="h-4 w-4 text-warning" />,
  user_deactivated: <User className="h-4 w-4 text-danger" />,
  setting_updated: <Settings className="h-4 w-4 text-muted" />,
};

interface AuditLogTimelineProps {
  logs: AuditLogItem[];
}

export function AuditLogTimeline({ logs }: AuditLogTimelineProps) {
  return (
    <div className="relative space-y-4 pl-6">
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
      {logs.map((log) => (
        <div key={log.id} className="relative flex items-start gap-3">
          <div className="absolute -left-[17px] mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border">
            {actionIcons[log.action] || <Clock className="h-3 w-3 text-muted" />}
          </div>
          <div className="flex-1 rounded-lg border border-border bg-card/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{log.action.replace(/_/g, " ")}</span>
              <span className="text-xs text-muted">{formatDate(log.created_at)}</span>
            </div>
            <div className="mt-1 text-xs text-muted">
              {log.user_name || "System"} • {log.resource_type}
              {log.resource_id ? ` #${log.resource_id}` : ""}
              {log.ip_address ? ` • ${log.ip_address}` : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
