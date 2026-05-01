import { useState } from "react";
import { Layout } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { Download, FileText, CheckCircle, Sparkles, BarChart3, Shield, AlertTriangle, Sheet } from "lucide-react";
import { Spinner } from "../components/ui/spinner";

const reportSections = [
  { icon: Sparkles, label: "AI Executive Summary", desc: "Generated analysis of your security posture" },
  { icon: BarChart3, label: "Compliance Overview", desc: "Score, metrics, and risk distribution" },
  { icon: Shield, label: "IG Maturity", desc: "IG1, IG2, IG3 implementation progress" },
  { icon: AlertTriangle, label: "Top Quick Wins", desc: "Prioritized actions with effort & impact" },
  { icon: FileText, label: "Control Details", desc: "Complete inventory with safeguard status" },
];

export default function ExportReportPage() {
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [error, setError] = useState("");

  const handleExportPdf = async () => {
    setExporting("pdf");
    setError("");
    try {
      await api.exportPdf();
    } catch (e: any) {
      setError(e.message || "Failed to generate PDF");
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
      setError(e.message || "Failed to generate Excel");
    } finally {
      setExporting(null);
    }
  };

  return (
    <Layout title="Export Report" subtitle="Generate comprehensive compliance reports">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted" />
              Compliance Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted">
              Generate a comprehensive report covering your entire CIS Controls v8 assessment.
              Choose PDF for a formatted document with AI analysis, or Excel for raw data.
            </p>

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
                {exporting === "pdf" ? "Generating..." : "Download PDF"}
              </Button>
              <Button onClick={handleExportXlsx} disabled={exporting !== null} variant="outline" className="w-full sm:w-auto">
                {exporting === "xlsx" ? <Spinner size="sm" className="mr-2" /> : <Sheet className="h-4 w-4 mr-2" />}
                {exporting === "xlsx" ? "Generating..." : "Download Excel"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Report Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                Update your controls with accurate status and risk levels before generating the report for the most useful analysis.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                The AI executive summary requires an active AI connector (Ollama, OpenAI, or Anthropic) configured in Settings.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                Quick Wins are ranked by IG1 priority first, then by risk level and implementation effort.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
