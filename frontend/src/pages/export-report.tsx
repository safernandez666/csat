import { useState } from "react";
import { Layout } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { Download, FileText, CheckCircle, Sparkles, BarChart3, Shield, AlertTriangle, Sheet } from "lucide-react";
import { Spinner } from "../components/ui/spinner";
import { useTranslation } from "../hooks/use-translation";

export default function ExportReportPage() {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [error, setError] = useState("");

  const reportSections = [
    { icon: Sparkles, label: t("reports.section.exec.label"), desc: t("reports.section.exec.desc") },
    { icon: BarChart3, label: t("reports.section.overview.label"), desc: t("reports.section.overview.desc") },
    { icon: Shield, label: t("reports.section.ig.label"), desc: t("reports.section.ig.desc") },
    { icon: AlertTriangle, label: t("reports.section.qw.label"), desc: t("reports.section.qw.desc") },
    { icon: FileText, label: t("reports.section.controls.label"), desc: t("reports.section.controls.desc") },
  ];

  const handleExportPdf = async () => {
    setExporting("pdf");
    setError("");
    try {
      await api.exportPdf();
    } catch (e: any) {
      setError(e.message || t("reports.failed_pdf"));
    } finally {
      setExporting(null);
    }
  };

  const handleExportXlsx = async () => {
    setExporting("xlsx");
    setError("");
    try {
      await api.exportXlsx();
    } catch (e: any) {
      setError(e.message || t("reports.failed_xlsx"));
    } finally {
      setExporting(null);
    }
  };

  return (
    <Layout title={t("reports.title")} subtitle={t("reports.subtitle")}>
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted" />
              {t("reports.compliance_reports")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted">{t("reports.intro")}</p>

            <div className="grid gap-3">
              {reportSections.map((section, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card/50 p-3"
                >
                  <section.icon className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium">{section.label}</div>
                    <div className="text-xs text-muted">{section.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger-dim px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleExportPdf} disabled={exporting !== null} className="w-full sm:w-auto">
                {exporting === "pdf" ? <Spinner size="sm" className="mr-2 text-accent-foreground" /> : <Download className="h-4 w-4 mr-2" />}
                {exporting === "pdf" ? t("reports.exporting") : t("reports.export_pdf")}
              </Button>
              <Button onClick={handleExportXlsx} disabled={exporting !== null} variant="outline" className="w-full sm:w-auto">
                {exporting === "xlsx" ? <Spinner size="sm" className="mr-2" /> : <Sheet className="h-4 w-4 mr-2" />}
                {exporting === "xlsx" ? t("reports.exporting") : t("reports.export_xlsx")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              {t("reports.tips_title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                {t("reports.tip1")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                {t("reports.tip2")}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                {t("reports.tip3")}
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
