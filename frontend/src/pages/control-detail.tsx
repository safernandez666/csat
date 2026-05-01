import { useEffect, useState } from "react";
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
import { formatDate } from "../lib/utils";
import { FileText, ExternalLink, Trash2, MessageSquare, Send, Pencil, Check, X } from "lucide-react";

export default function ControlDetailPage() {
  const { id } = useParams();
  const controlId = Number(id);
  const { data: control, loading: controlLoading, refresh: refreshControl, setData: setControlData } = useControl(controlId);
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
    await api.createComment(controlId, newComment);
    setNewComment("");
    refreshComments();
    setSending(false);
  };

  const handleDeleteEvidence = async (evId: number) => {
    if (!confirm("Delete this evidence?")) return;
    await api.deleteEvidence(evId);
    refreshEvidence();
  };

  if (!control && controlLoading) {
    return (
      <Layout title="Control Detail">
        <p className="text-center text-muted py-8">Loading...</p>
      </Layout>
    );
  }

  if (!control) {
    return (
      <Layout title="Control Detail">
        <p className="text-center text-muted py-8">Control not found.</p>
      </Layout>
    );
  }

  return (
    <Layout title={`CIS ${control.cis_id}`} subtitle={control.name}>
      {controlLoading && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted animate-pulse">
          <div className="h-1.5 w-1.5 rounded-full bg-accent" />
          Refreshing data...
        </div>
      )}
      {control.objective && (
        <p className="text-sm text-muted max-w-3xl mb-4">{control.objective}</p>
      )}
      <div className="space-y-6">
        {/* Edit panel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Pencil className="h-4 w-4 text-muted" />
              Control Settings
            </CardTitle>
            {!editing ? (
              <Button size="sm" variant="outline" onClick={startEdit}>
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Check className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted">Status</span>
                    <div className="font-semibold capitalize">{control.status.replace(/_/g, " ")}</div>
                  </div>
                  <div>
                    <span className="text-muted">Risk Level</span>
                    <div className="font-semibold capitalize">{control.risk_level}</div>
                  </div>
                  <div>
                    <span className="text-muted">Due Date</span>
                    <div className="font-semibold">{control.due_date || "—"}</div>
                  </div>
                  <div>
                    <span className="text-muted">Review Date</span>
                    <div className="font-semibold">{control.review_date || "—"}</div>
                  </div>
                </div>
                {(control.started_at || control.implemented_at) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-3 border-t border-border">
                    {control.started_at && (
                      <div>
                        <span className="text-muted">Started</span>
                        <div className="font-semibold">{formatDate(control.started_at)}</div>
                      </div>
                    )}
                    {control.implemented_at && (
                      <div>
                        <span className="text-muted">Implemented</span>
                        <div className="font-semibold text-success">{formatDate(control.implemented_at)}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Status</label>
                  <Select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="not_implemented">Not Implemented</option>
                    <option value="in_progress">In Progress</option>
                    <option value="implemented">Implemented</option>
                    <option value="needs_review">Needs Review</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Risk Level</label>
                  <Select
                    value={editForm.risk_level}
                    onChange={(e) => setEditForm({ ...editForm, risk_level: e.target.value })}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Due Date</label>
                  <Input
                    type="date"
                    value={editForm.due_date}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Review Date</label>
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
              Evidence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EvidenceUploader controlId={controlId} onUploaded={refreshEvidence} />
            <div className="space-y-2">
              {evLoading && <p className="text-sm text-muted">Loading evidence...</p>}
              {evidence?.map((ev) => (
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
                      by {ev.uploader_name} • {formatDate(ev.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEvidence(ev.id)}
                    className="rounded-lg p-2 hover:bg-danger-dim text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {!evLoading && evidence?.length === 0 && (
                <p className="text-sm text-muted">No evidence yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted" />
              Comments & Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
              />
              <Button onClick={handleComment} disabled={sending || !newComment.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {comLoading && <p className="text-sm text-muted">Loading comments...</p>}
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
                <p className="text-sm text-muted">No comments yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
