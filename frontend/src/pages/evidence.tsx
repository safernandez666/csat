import { useEvidence } from "../hooks/use-api";
import { Layout } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { formatDate } from "../lib/utils";
import { FileText, ExternalLink } from "lucide-react";

export default function EvidencePage() {
  const { data, loading, error } = useEvidence();

  return (
    <Layout title="Evidence" subtitle="All uploaded evidence across controls">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evidence Library</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted">Loading...</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="space-y-2">
            {data?.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">{ev.file_name || "Note"}</span>
                    {ev.external_link && (
                      <a href={ev.external_link} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {ev.note && <p className="text-xs text-muted mt-1">{ev.note}</p>}
                  <div className="text-xs text-muted mt-1">
                    Control #{ev.control_id} • by {ev.uploader_name} • {formatDate(ev.created_at)}
                  </div>
                </div>
              </div>
            ))}
            {!loading && data?.length === 0 && (
              <p className="text-sm text-muted">No evidence uploaded yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}
