import { useState } from "react";
import { useAuditLogs } from "../hooks/use-api";
import { Layout } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select } from "../components/ui/select";
import { AuditLogTimeline } from "../components/audit-log-timeline";

export default function AuditLogsPage() {
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const { data, loading, error } = useAuditLogs({
    ...(action ? { action } : {}),
    ...(resourceType ? { resource_type: resourceType } : {}),
  });

  return (
    <Layout title="Audit Logs" subtitle="Immutable action history">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={action} onChange={(e) => setAction(e.target.value)} className="w-full sm:w-48">
              <option value="">All Actions</option>
              <option value="login_success">Login Success</option>
              <option value="login_failed">Login Failed</option>
              <option value="logout">Logout</option>
              <option value="control_updated">Control Updated</option>
              <option value="evidence_created">Evidence Created</option>
              <option value="evidence_deleted">Evidence Deleted</option>
              <option value="user_created">User Created</option>
              <option value="user_updated">User Updated</option>
            </Select>
            <Select value={resourceType} onChange={(e) => setResourceType(e.target.value)} className="w-full sm:w-48">
              <option value="">All Resources</option>
              <option value="user">User</option>
              <option value="control">Control</option>
              <option value="evidence">Evidence</option>
              <option value="comment">Comment</option>
              <option value="setting">Setting</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted">Loading...</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          {data && <AuditLogTimeline logs={data} />}
          {!loading && data?.length === 0 && (
            <p className="text-sm text-muted">No audit logs found.</p>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
