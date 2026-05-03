import { useEffect, useState } from "react";
import { Layout } from "../components/layout";
import { Card, CardContent } from "../components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";
import { api } from "../lib/api";
import { Zap, ShieldCheck, ArrowRight, AlertTriangle, Sparkles } from "lucide-react";
import { Spinner } from "../components/ui/spinner";
import { useTranslation } from "../hooks/use-translation";
import { localizeControlName } from "../lib/cis-catalog-i18n";

const STORAGE_KEY = "csat_quick_wins_seen";

export default function QuickWinsPage() {
  const { t, lang } = useTranslation();
  const [data, setData] = useState<any[]>([]);
  const [, setAiAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newWins, setNewWins] = useState<string[]>([]);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.aiQuickWins();
      const wins = res.ai_analysis?.quick_wins || res.candidates?.slice(0, 10) || [];
      setData(wins);
      setAiAnalysis(res.ai_analysis);

      // Detect new quick wins compared to previous visit
      const seenIds: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const currentIds = wins.map((w: any) => w.cis_id || w.id).filter(Boolean);
      const newlyDetected = currentIds.filter((id: string) => !seenIds.includes(id));
      if (newlyDetected.length > 0) {
        setNewWins(newlyDetected);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentIds));
    } catch (e: any) {
      setError(e.message || t("qw.failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plural = (n: number) => (n > 1 ? "s" : "");

  return (
    <Layout title={t("qw.title")} subtitle={t("qw.subtitle")}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            <p className="text-sm text-muted">{t("qw.intro")}</p>
          </div>
          <button
            onClick={refresh}
            className="text-xs font-medium text-accent hover:underline"
            disabled={loading}
          >
            {loading ? t("qw.refreshing") : t("qw.refresh")}
          </button>
        </div>

        {loading && (
          <Card>
            <CardContent className="py-8 flex flex-col items-center gap-3 text-sm text-muted">
              <Spinner className="text-accent" />
              {t("qw.loading")}
            </CardContent>
          </Card>
        )}

        {newWins.length > 0 && !loading && (
          <Alert variant="info" className="animate-fade-in-up">
            <Sparkles className="h-4 w-4" />
            <AlertTitle>{t("qw.new_detected", { plural: plural(newWins.length) })}</AlertTitle>
            <AlertDescription>
              {t("qw.new_desc", { count: newWins.length, plural: plural(newWins.length), plural2: plural(newWins.length) })}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-danger">
              <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
              {error}
            </CardContent>
          </Card>
        )}

        {!loading && !error && data.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted">
              {t("qw.empty")}
            </CardContent>
          </Card>
        )}

        {!loading &&
          !error &&
          data.map((win: any, i: number) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-start gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-dim text-success">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted">
                        {win.cis_id ? `CIS ${win.cis_id}` : `#${i + 1}`}
                      </span>
                      {win.effort && (
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            win.effort === "low"
                              ? "bg-success-dim text-success"
                              : win.effort === "medium"
                              ? "bg-warning-dim text-warning"
                              : "bg-danger-dim text-danger"
                          }`}
                        >
                          {t(`qw.effort.${win.effort}`)}
                        </span>
                      )}
                      {win.impact && (
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            win.impact === "high"
                              ? "bg-success-dim text-success"
                              : win.impact === "medium"
                              ? "bg-warning-dim text-warning"
                              : "bg-danger-dim text-danger"
                          }`}
                        >
                          {t(`qw.impact.${win.impact}`)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold">{win.cis_id ? localizeControlName(win.cis_id, win.name, lang) : win.name}</h3>
                    {win.why && <p className="text-sm text-muted mt-1">{win.why}</p>}
                    {win.next_action && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent/5 border border-accent/10 p-3">
                        <ArrowRight className="h-4 w-4 text-accent shrink-0" />
                        <p className="text-sm font-medium text-accent">{win.next_action}</p>
                      </div>
                    )}
                    {!win.next_action && win.objective && (
                      <p className="text-sm text-muted mt-2 line-clamp-2">{win.objective}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </Layout>
  );
}
