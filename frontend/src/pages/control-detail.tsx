import { useEffect, useMemo, useState } from "react";
import { useParams } from "../App";
import { useControl, useEvidence, useComments } from "../hooks/use-api";
import { Layout } from "../components/layout";
import { ControlDetailPanel } from "../components/control-detail-panel";
import { EvidenceUploader } from "../components/evidence-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { api } from "../lib/api";
import { formatDate, isSafeExternalUrl } from "../lib/utils";
import { FileText, ExternalLink, Trash2, MessageSquare, Send, Pencil, Check, X, Sparkles, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { Spinner } from "../components/ui/spinner";
import { useTranslation } from "../hooks/use-translation";
import { localizeControl } from "../lib/cis-catalog-i18n";

export default function ControlDetailPage() {
  const { t, lang } = useTranslation();
  const { id } = useParams();
  const controlId = Number(id);
  const { data: rawControl, loading: controlLoading, refresh: refreshControl, setData: setControlData } = useControl(controlId);
  const control = useMemo(() => (rawControl ? localizeControl(rawControl, lang) : null), [rawControl, lang]);
  const { data: evidence, loading: evLoading, refresh: refreshEvidence } = useEvidence(controlId);
  const { data: comments, loading: comLoading, refresh: refreshComments } = useComments(controlId);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    status: "",
    risk_level: "",
    due_date: "",
    review_date: "",
  });
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [verdicts, setVerdicts] = useState<Record<number, {
    verdict: "sufficient" | "partial" | "insufficient";
    reasoning: string;
    gaps: string[];
    recommendations: string[];
    error?: string;
  }>>({});

  const handleAnalyzeEvidence = async (evId: number) => {
    setAnalyzingId(evId);
    setVerdicts((prev) => {
      const next = { ...prev };
      delete next[evId];
      return next;
    });
    try {
      const res = await api.evaluateEvidence(evId);
      setVerdicts((prev) => ({ ...prev, [evId]: res }));
    } catch (e: any) {
      setVerdicts((prev) => ({
        ...prev,
        [evId]: { verdict: "insufficient", reasoning: "", gaps: [], recommendations: [], error: e.message || "Analysis failed" },
      }));
    } finally {
      setAnalyzingId(null);
    }
  };

  // Keep editForm in sync with the control while the user is NOT editing.
  // Otherwise an in-flight safeguard change (which auto-recomputes control.status)
  // would leave the visible status stale until the user reopens edit mode.
  useEffect(() => {
    if (!control || editing) return;
    setEditForm({
      status: control.status,
      risk_level: control.risk_level,
      due_date: control.due_date || "",
      review_date: control.review_date || "",
    });
  }, [control, editing]);

  const startEdit = () => {
    if (!control) return;
    setEditForm({
      status: control.status,
      risk_level: control.risk_level,
      due_date: control.due_date || "",
      review_date: control.review_date || "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!control) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (editForm.status) payload.status = editForm.status;
      if (editForm.risk_level) payload.risk_level = editForm.risk_level;
      if (editForm.due_date) payload.due_date = editForm.due_date;
      if (editForm.review_date) payload.review_date = editForm.review_date;
      await api.updateControl(control.id, payload);
      refreshControl();
      setEditing(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      await api.createComment(controlId, newComment);
      setNewComment("");
      refreshComments();
    } catch (e: any) {
      alert(e.message || "Failed to post comment");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteEvidence = async (evId: number) => {
    if (!confirm(t("control_detail.delete_confirm"))) return;
    try {
      await api.deleteEvidence(evId);
      refreshEvidence();
    } catch (e: any) {
      alert(e.message || "Failed to delete evidence");
    }
  };

  if (!control && controlLoading) {
    return (
      <Layout title={t("nav.controls")}>
        <p className="text-center text-muted py-8">{t("common.loading")}</p>
      </Layout>
    );
  }

  if (!control) {
    return (
      <Layout title={t("nav.controls")}>
        <p className="text-center text-muted py-8">{t("control_detail.not_found")}</p>
      </Layout>
    );
  }

  return (
    <Layout title={`CIS ${control.cis_id}`} subtitle={control.name}>
      {controlLoading && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted animate-pulse">
          <div className="h-1.5 w-1.5 rounded-full bg-accent" />
          {t("control_detail.refreshing")}
        </div>
      )}
      <div className="space-y-6">
        {/* Edit panel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Pencil className="h-4 w-4 text-muted" />
              {t("control_detail.settings_card")}
            </CardTitle>
            {!editing ? (
              <Button size="sm" variant="outline" onClick={startEdit}>
                {t("common.edit")}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4 mr-1" /> {t("common.cancel")}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Check className="h-4 w-4 mr-1" /> {saving ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted">{t("control_detail.status")}</span>
                    <div className="font-semibold capitalize">{t(`status.${control.status}.long`)}</div>
                  </div>
                  <div>
                    <span className="text-muted">{t("control_detail.risk_level")}</span>
                    <div className="font-semibold capitalize">{t(`risk.${control.risk_level}`)}</div>
                  </div>
                  <div>
                    <span className="text-muted">{t("control_detail.due_date")}</span>
                    <div className="font-semibold">{control.due_date || "—"}</div>
                  </div>
                  <div>
                    <span className="text-muted">{t("control_detail.review_date")}</span>
                    <div className="font-semibold">{control.review_date || "—"}</div>
                  </div>
                </div>
                {(control.started_at || control.implemented_at) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-3 border-t border-border">
                    {control.started_at && (
                      <div>
                        <span className="text-muted">{t("control_detail.started")}</span>
                        <div className="font-semibold">{formatDate(control.started_at)}</div>
                      </div>
                    )}
                    {control.implemented_at && (
                      <div>
                        <span className="text-muted">{t("control_detail.implemented_at")}</span>
                        <div className="font-semibold text-success">{formatDate(control.implemented_at)}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("control_detail.status")}</label>
                  <Select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="not_implemented">{t("status.not_implemented.long")}</option>
                    <option value="in_progress">{t("status.in_progress.long")}</option>
                    <option value="implemented">{t("status.implemented.long")}</option>
                    <option value="needs_review">{t("status.needs_review.long")}</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("control_detail.risk_level")}</label>
                  <Select
                    value={editForm.risk_level}
                    onChange={(e) => setEditForm({ ...editForm, risk_level: e.target.value })}
                  >
                    <option value="critical">{t("risk.critical")}</option>
                    <option value="high">{t("risk.high")}</option>
                    <option value="medium">{t("risk.medium")}</option>
                    <option value="low">{t("risk.low")}</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("control_detail.due_date")}</label>
                  <Input
                    type="date"
                    value={editForm.due_date}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("control_detail.review_date")}</label>
                  <Input
                    type="date"
                    value={editForm.review_date}
                    onChange={(e) => setEditForm({ ...editForm, review_date: e.target.value })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <ControlDetailPanel
          control={control}
          onUpdate={refreshControl}
          onControlChanged={(next) => setControlData(next)}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted" />
              {t("control_detail.evidence")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EvidenceUploader controlId={controlId} onUploaded={refreshEvidence} />
            <div className="space-y-2">
              {evLoading && <p className="text-sm text-muted">{t("control_detail.evidence_loading")}</p>}
              {evidence?.map((ev) => {
                const v = verdicts[ev.id];
                const verdictTone = v && !v.error
                  ? v.verdict === "sufficient" ? "border-success bg-success-dim text-success"
                    : v.verdict === "partial" ? "border-warning bg-warning-dim text-warning"
                    : "border-danger bg-danger-dim text-danger"
                  : "";
                const VerdictIcon = v && !v.error
                  ? v.verdict === "sufficient" ? CheckCircle2
                    : v.verdict === "partial" ? AlertTriangle
                    : AlertCircle
                  : AlertCircle;
                return (
                  <div key={ev.id} className="rounded-lg border border-border">
                    <div className="flex items-center justify-between p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-accent" />
                          <span className="text-sm font-medium">{ev.file_name || "Note"}</span>
                          {ev.external_link && isSafeExternalUrl(ev.external_link) && (
                            <a href={ev.external_link} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                        {ev.note && <p className="text-xs text-muted mt-1">{ev.note}</p>}
                        <div className="text-xs text-muted mt-1">
                          by {ev.uploader_name} • {formatDate(ev.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {ev.file_name && (
                          <button
                            onClick={() => handleAnalyzeEvidence(ev.id)}
                            disabled={analyzingId !== null}
                            title={t("control_detail.analyze_tooltip")}
                            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-accent hover:bg-accent/10 disabled:opacity-50"
                          >
                            {analyzingId === ev.id ? (
                              <Spinner size="sm" className="size-3" />
                            ) : (
                              <Sparkles className="size-3" />
                            )}
                            {analyzingId === ev.id ? t("control_detail.analyzing") : t("control_detail.analyze")}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteEvidence(ev.id)}
                          className="rounded-lg p-2 text-danger hover:bg-danger-dim"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                    {v && (
                      <div className={`border-t border-border p-3 ${v.error ? "" : ""}`}>
                        {v.error ? (
                          <div className="flex items-start gap-2 text-xs text-danger">
                            <AlertCircle className="size-4 shrink-0 mt-0.5" />
                            <span>{v.error}</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${verdictTone}`}>
                              <VerdictIcon className="size-3" />
                              {v.verdict.toUpperCase()}
                            </div>
                            {v.reasoning && <p className="text-xs leading-relaxed">{v.reasoning}</p>}
                            {v.gaps.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t("control_detail.gaps")}</p>
                                <ul className="mt-1 list-disc pl-4 text-xs space-y-0.5">
                                  {v.gaps.map((g, i) => <li key={i}>{g}</li>)}
                                </ul>
                              </div>
                            )}
                            {v.recommendations.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t("control_detail.recommendations")}</p>
                                <ul className="mt-1 list-disc pl-4 text-xs space-y-0.5">
                                  {v.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {!evLoading && evidence?.length === 0 && (
                <p className="text-sm text-muted">{t("control_detail.no_evidence")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted" />
              {t("control_detail.comments")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={t("control_detail.comment_placeholder")}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
              />
              <Button onClick={handleComment} disabled={sending || !newComment.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {comLoading && <p className="text-sm text-muted">{t("control_detail.comments_loading")}</p>}
              {comments?.map((c) => (
                <div key={c.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{c.user_name || "User"}</span>
                    <span className="text-xs text-muted">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-sm mt-1">{c.content}</p>
                </div>
              ))}
              {!comLoading && comments?.length === 0 && (
                <p className="text-sm text-muted">{t("control_detail.no_comments")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
