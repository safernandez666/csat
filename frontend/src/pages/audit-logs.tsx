import { useState } from "react";
import { useAuditLogs } from "../hooks/use-api";
import { Layout } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select } from "../components/ui/select";
import { AuditLogTimeline } from "../components/audit-log-timeline";
import { useTranslation } from "../hooks/use-translation";

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const { data, loading, error } = useAuditLogs({
    ...(action ? { action } : {}),
    ...(resourceType ? { resource_type: resourceType } : {}),
  });

  return (
    <Layout title={t("audit.title")} subtitle={t("audit.subtitle")}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("audit.filters")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={action} onChange={(e) => setAction(e.target.value)} className="w-full sm:w-48">
              <option value="">{t("audit.all_actions")}</option>
              <option value="login_success">login_success</option>
              <option value="login_failed">login_failed</option>
              <option value="logout">logout</option>
              <option value="control_updated">control_updated</option>
              <option value="evidence_created">evidence_created</option>
              <option value="evidence_deleted">evidence_deleted</option>
              <option value="user_created">user_created</option>
              <option value="user_updated">user_updated</option>
            </Select>
            <Select value={resourceType} onChange={(e) => setResourceType(e.target.value)} className="w-full sm:w-48">
              <option value="">{t("audit.all_resources")}</option>
              <option value="user">user</option>
              <option value="control">control</option>
              <option value="evidence">evidence</option>
              <option value="comment">comment</option>
              <option value="setting">setting</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("audit.timeline")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted">{t("common.loading")}</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          {data && <AuditLogTimeline logs={data} />}
          {!loading && data?.length === 0 && (
            <p className="text-sm text-muted">{t("audit.empty")}</p>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
