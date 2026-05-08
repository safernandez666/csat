import { useEvidence } from "../hooks/use-api";
import { Layout } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { formatDate, isSafeExternalUrl } from "../lib/utils";
import { FileText, ExternalLink } from "lucide-react";
import { useTranslation } from "../hooks/use-translation";

export default function EvidencePage() {
  const { t } = useTranslation();
  const { data, loading, error } = useEvidence();

  return (
    <Layout title={t("evidence_page.title")} subtitle={t("evidence_page.subtitle")}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("evidence_page.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted">{t("common.loading")}</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="space-y-2">
            {data?.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">{ev.file_name || t("control_detail.comments")}</span>
                    {ev.external_link && isSafeExternalUrl(ev.external_link) && (
                      <a href={ev.external_link} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {ev.note && <p className="text-xs text-muted mt-1">{ev.note}</p>}
                  <div className="text-xs text-muted mt-1">
                    {t("nav.controls")} #{ev.control_id} • {ev.uploader_name} • {formatDate(ev.created_at)}
                  </div>
                </div>
              </div>
            ))}
            {!loading && data?.length === 0 && (
              <p className="text-sm text-muted">{t("evidence_page.empty")}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}
