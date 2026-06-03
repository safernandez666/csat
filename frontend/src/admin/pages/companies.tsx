import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  X,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  KeyRound,
  HardDriveDownload,
  Trash2,
  Copy,
  Check,
  ClipboardCopy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Spinner } from "../../components/ui/spinner";
import { adminApi, type CompanySummary, type CreateCompanyResult } from "../../lib/admin-api";
import { DeleteCompanyDialog } from "../components/delete-company-dialog";

function getHostnameDomain(): string {
  // Returns everything after the first subdomain label, e.g. "zebrasecurity.io"
  const parts = window.location.hostname.split(".");
  if (parts.length > 2) return parts.slice(1).join(".");
  return window.location.hostname;
}

function buildTenantUrl(slug: string): string {
  const domain = getHostnameDomain();
  const proto = window.location.protocol;
  return `${proto}//${slug}.${domain}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge variant="success">Activo</Badge>;
  if (status === "suspended") return <Badge variant="warning">Suspendido</Badge>;
  return <Badge variant="error">{status}</Badge>;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-card hover:text-foreground transition-colors"
      title={`Copiar ${label || ""}`}
    >
      {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
      {copied ? "Copiado" : (label || "Copiar")}
    </button>
  );
}

interface SuccessCardProps {
  result: CreateCompanyResult;
  onDismiss: () => void;
}

function CreateSuccessCard({ result, onDismiss }: SuccessCardProps) {
  const tenantUrl = buildTenantUrl(result.slug);
  const [allCopied, setAllCopied] = useState(false);

  const copyAll = async () => {
    const text = `URL: ${tenantUrl}\nEmail: ${result.admin_email}\nContraseña temporal: ${result.temp_password}`;
    await navigator.clipboard.writeText(text);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-success/40 bg-success-dim p-5 space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Check className="size-5 text-success" />
          <span className="font-semibold text-success">Cliente creado exitosamente</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="rounded-lg border border-success/20 bg-card/60 divide-y divide-border text-sm">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-muted">URL</span>
          <div className="flex items-center gap-2">
            <a
              href={tenantUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-accent hover:underline"
            >
              {tenantUrl}
            </a>
            <CopyButton text={tenantUrl} label="URL" />
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-muted">Email admin</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">{result.admin_email}</span>
            <CopyButton text={result.admin_email} label="email" />
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-muted">Contraseña temporal</span>
          <div className="flex items-center gap-2">
            <code className="rounded bg-warning-dim border border-warning-border px-2 py-0.5 font-mono text-sm text-warning">
              {result.temp_password}
            </code>
            <CopyButton text={result.temp_password} label="contraseña" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-danger font-medium">
          La contraseña temporal se muestra una sola vez. Guardarla ahora.
        </p>
        <Button size="sm" variant="outline" onClick={copyAll}>
          <ClipboardCopy className="size-3.5 mr-1" />
          {allCopied ? "Copiado todo" : "Copiar todo"}
        </Button>
      </div>
    </div>
  );
}

interface ActionResult {
  type: "reset" | "backup";
  slug: string;
  data: Record<string, string>;
}

function ActionResultCard({ result, onDismiss }: { result: ActionResult; onDismiss: () => void }) {
  if (result.type === "reset") {
    return (
      <div className="rounded-xl border border-warning/40 bg-warning-dim p-4 space-y-2 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-warning text-sm">Contraseña de admin reseteada — {result.slug}</span>
          <button type="button" onClick={onDismiss} className="text-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="rounded border border-warning/20 bg-card/60 divide-y divide-border text-sm">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-muted">Email</span>
            <div className="flex items-center gap-2">
              <span className="font-mono">{result.data.admin_email}</span>
              <CopyButton text={result.data.admin_email} />
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-muted">Nueva contraseña temporal</span>
            <div className="flex items-center gap-2">
              <code className="rounded bg-warning-dim border border-warning-border px-2 py-0.5 font-mono text-xs text-warning">
                {result.data.temp_password}
              </code>
              <CopyButton text={result.data.temp_password} />
            </div>
          </div>
        </div>
        <p className="text-xs text-danger">La contraseña se muestra una sola vez.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-info/40 bg-info-dim p-4 space-y-1 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-info text-sm">Backup creado — {result.slug}</span>
        <button type="button" onClick={onDismiss} className="text-muted hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <p className="text-xs text-muted font-mono break-all">{result.data.archive_path}</p>
    </div>
  );
}

const emptyForm = { slug: "", name: "", admin_email: "", admin_full_name: "" };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createResult, setCreateResult] = useState<CreateCompanyResult | null>(null);

  // Per-row action state
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<CompanySummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.getCompanies();
      setCompanies(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError("");
    try {
      const result = await adminApi.createCompany(form);
      setCreateResult(result);
      setForm(emptyForm);
      setShowCreateForm(false);
      await fetchCompanies();
    } catch (e: any) {
      setCreateError(e.message || "Error al crear cliente");
    } finally {
      setCreating(false);
    }
  };

  const setRowLoading = (slug: string, action: string) =>
    setActionLoading((prev) => ({ ...prev, [slug]: action }));
  const clearRowLoading = (slug: string) =>
    setActionLoading((prev) => { const next = { ...prev }; delete next[slug]; return next; });

  const handleSuspend = async (slug: string) => {
    setRowLoading(slug, "suspend");
    try {
      await adminApi.suspendCompany(slug);
      await fetchCompanies();
    } catch (e: any) {
      alert(e.message);
    } finally {
      clearRowLoading(slug);
    }
  };

  const handleActivate = async (slug: string) => {
    setRowLoading(slug, "activate");
    try {
      await adminApi.activateCompany(slug);
      await fetchCompanies();
    } catch (e: any) {
      alert(e.message);
    } finally {
      clearRowLoading(slug);
    }
  };

  const handleReset = async (slug: string) => {
    setRowLoading(slug, "reset");
    try {
      const data = await adminApi.resetAdminPassword(slug);
      setActionResult({ type: "reset", slug, data: { admin_email: data.admin_email, temp_password: data.temp_password } });
    } catch (e: any) {
      alert(e.message);
    } finally {
      clearRowLoading(slug);
    }
  };

  const handleBackup = async (slug: string) => {
    setRowLoading(slug, "backup");
    try {
      const data = await adminApi.backupCompany(slug);
      setActionResult({ type: "backup", slug, data: { archive_path: data.archive_path } });
    } catch (e: any) {
      alert(e.message);
    } finally {
      clearRowLoading(slug);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteCompany(deleteTarget.slug);
      setDeleteTarget(null);
      await fetchCompanies();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted mt-0.5">Gestión de empresas en el sistema</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCompanies} disabled={loading}>
          <RefreshCw className={`size-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Success card from last create */}
      {createResult && (
        <CreateSuccessCard result={createResult} onDismiss={() => setCreateResult(null)} />
      )}

      {/* Action result card */}
      {actionResult && (
        <ActionResultCard result={actionResult} onDismiss={() => setActionResult(null)} />
      )}

      {/* Create form card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Crear nuevo cliente</CardTitle>
          <Button size="sm" variant="outline" onClick={() => { setShowCreateForm(!showCreateForm); setCreateError(""); }}>
            {showCreateForm ? <X className="size-4 mr-1" /> : <Plus className="size-4 mr-1" />}
            {showCreateForm ? "Cancelar" : "Nuevo cliente"}
          </Button>
        </CardHeader>
        {showCreateForm && (
          <CardContent className="pt-0">
            <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Slug (subdominio)</label>
                  <Input
                    placeholder="acme"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Nombre de la empresa</label>
                  <Input
                    placeholder="Acme Corp"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Email del admin</label>
                  <Input
                    type="email"
                    placeholder="admin@acme.com"
                    value={form.admin_email}
                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Nombre completo del admin</label>
                  <Input
                    placeholder="Juan Pérez"
                    value={form.admin_full_name}
                    onChange={(e) => setForm({ ...form, admin_full_name: e.target.value })}
                  />
                </div>
              </div>
              {createError && <p className="text-xs text-danger">{createError}</p>}
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={creating || !form.slug || !form.name || !form.admin_email || !form.admin_full_name}
              >
                {creating ? <><Spinner size="sm" className="mr-2" />Creando…</> : "Crear cliente"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Companies table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Cargando…" : `${companies.length} cliente${companies.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading && (
            <div className="flex items-center gap-2 py-8 justify-center text-muted">
              <Spinner size="sm" />
              <span className="text-sm">Cargando clientes…</span>
            </div>
          )}
          {error && <p className="text-sm text-danger py-4">{error}</p>}
          {!loading && !error && companies.length === 0 && (
            <p className="text-sm text-muted py-8 text-center">No hay clientes todavía. Creá el primero.</p>
          )}
          {!loading && companies.length > 0 && (
            <div className="space-y-2">
              {companies.map((company) => {
                const rowAction = actionLoading[company.slug];
                const tenantUrl = buildTenantUrl(company.slug);
                return (
                  <div
                    key={company.slug}
                    className="rounded-lg border border-border bg-card/30 p-4 transition-colors hover:bg-card/60"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{company.name}</span>
                          <code className="text-xs text-muted font-mono bg-card/80 border border-border rounded px-1.5 py-0.5">
                            {company.slug}
                          </code>
                          <StatusBadge status={company.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <a
                            href={tenantUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted hover:text-accent flex items-center gap-1 transition-colors"
                          >
                            <ExternalLink className="size-3" />
                            {tenantUrl}
                          </a>
                          <span className="text-xs text-muted">
                            Creado {formatDate(company.created_at)}
                          </span>
                          {company.suspended_at && (
                            <span className="text-xs text-warning">
                              Suspendido {formatDate(company.suspended_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {company.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSuspend(company.slug)}
                            disabled={!!rowAction}
                            title="Suspender"
                          >
                            {rowAction === "suspend" ? (
                              <Spinner size="sm" />
                            ) : (
                              <PauseCircle className="size-3.5 mr-1" />
                            )}
                            Suspender
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleActivate(company.slug)}
                            disabled={!!rowAction}
                            title="Activar"
                          >
                            {rowAction === "activate" ? (
                              <Spinner size="sm" />
                            ) : (
                              <PlayCircle className="size-3.5 mr-1" />
                            )}
                            Activar
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReset(company.slug)}
                          disabled={!!rowAction}
                          title="Resetear contraseña admin"
                        >
                          {rowAction === "reset" ? (
                            <Spinner size="sm" />
                          ) : (
                            <KeyRound className="size-3.5 mr-1" />
                          )}
                          Reset pwd
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBackup(company.slug)}
                          disabled={!!rowAction}
                          title="Crear backup"
                        >
                          {rowAction === "backup" ? (
                            <Spinner size="sm" />
                          ) : (
                            <HardDriveDownload className="size-3.5 mr-1" />
                          )}
                          Backup
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTarget(company)}
                          disabled={!!rowAction}
                          title="Eliminar permanentemente"
                        >
                          <Trash2 className="size-3.5 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteCompanyDialog
          slug={deleteTarget.slug}
          companyName={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !deleting && setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
