import { useEffect, useState, useRef } from "react";
import { Layout } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { useAppSettings } from "../contexts/app-settings";
import { CheckCircle2, XCircle, Save, ChevronDown, ChevronUp, Shield, Upload, Trash2, Image, Bot, Activity } from "lucide-react";
import { toast } from "../hooks/use-toast";
import { useTranslation } from "../hooks/use-translation";
import { type Language } from "../lib/i18n";
import { INDUSTRIES } from "../lib/industry-benchmarks";

interface IntegrationDef {
  name: string;
  key: string;
  icon?: React.ReactNode;
  fields: { name: string; label: string; type?: string }[];
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    name: "Active Directory / LDAP",
    key: "active_directory",
    icon: <Shield className="h-4 w-4" />,
    fields: [
      { name: "server_url", label: "Server URL (ldap:// or ldaps://)" },
      { name: "domain", label: "Domain" },
      { name: "bind_dn", label: "Bind DN / User" },
      { name: "bind_password", label: "Bind Password", type: "password" },
      { name: "base_dn", label: "Base DN" },
      { name: "port", label: "Port", type: "number" },
    ],
  },
  // Note: SSO (OIDC) is configured in its own panel above. Keycloak / Okta /
  // Entra ID all funnel through the same `oidc_config` setting and the
  // /api/auth/oidc/* endpoints.
  {
    name: "Wazuh",
    key: "wazuh",
    fields: [
      { name: "api_url", label: "API URL" },
      { name: "api_key", label: "API Key", type: "password" },
    ],
  },
  {
    name: "OpenVAS / Greenbone",
    key: "openvas",
    fields: [
      { name: "api_url", label: "API URL" },
      { name: "username", label: "Username" },
      { name: "password", label: "Password", type: "password" },
    ],
  },
  {
    name: "FleetDM / osquery",
    key: "fleetdm",
    fields: [
      { name: "api_url", label: "API URL" },
      { name: "api_token", label: "API Token", type: "password" },
    ],
  },
  {
    name: "TheHive",
    key: "thehive",
    fields: [
      { name: "api_url", label: "API URL" },
      { name: "api_key", label: "API Key", type: "password" },
    ],
  },
  {
    name: "AI Analysis",
    key: "ai_analysis",
    fields: [
      { name: "api_url", label: "API URL" },
      { name: "api_key", label: "API Key", type: "password" },
      { name: "model", label: "Model" },
    ],
  },
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const { refreshSettings, setLanguage } = useAppSettings();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aiConfig, setAiConfig] = useState({
    provider: "ollama",
    api_url: "http://localhost:11434",
    api_key: "",
    model: "llama3:latest",
  });
  const [aiHealth, setAiHealth] = useState<Record<string, any> | null>(null);
  const [testingAi, setTestingAi] = useState(false);

  // SSO (OIDC). One row in `settings` keyed `oidc_config`. The login screen
  // shows the SSO button only when this is enabled + complete.
  const DEFAULT_SSO = {
    enabled: false,
    issuer_url: "",
    client_id: "",
    client_secret: "",
    group_admin: "csat-admins",
    group_analyst: "csat-analysts",
    group_auditor: "csat-auditors",
    group_viewer: "csat-viewers",
    default_role: "Viewer" as "" | "Admin" | "Security Analyst" | "Auditor" | "Viewer",
  };
  const [sso, setSso] = useState(DEFAULT_SSO);
  const [savingSso, setSavingSso] = useState(false);
  const [testingSso, setTestingSso] = useState(false);
  const [ssoTestResult, setSsoTestResult] = useState<{ status: "ok" | "error"; detail: string } | null>(null);

  const [platform, setPlatform] = useState({
    platform_name: "",
    theme_default: "dark",
    review_reminder_days: 7,
    mfa_required_for_admin: false,
    language: "en",
    industry: "",
  });

  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s);
      setPlatform({
        platform_name: s.platform_name || "CSAT",
        theme_default: s.theme_default || "dark",
        review_reminder_days: s.review_reminder_days || 7,
        mfa_required_for_admin: !!s.mfa_required_for_admin,
        language: s.language || "en",
        industry: s.industry || "",
      });
      // Hydrate SSO panel from oidc_config
      const oc = s.oidc_config || {};
      const grm = oc.group_role_map || {};
      // Reverse the map: { "csat-admins": "Admin" } → group_admin: "csat-admins"
      const findGroupForRole = (role: string): string =>
        Object.entries(grm).find(([, r]) => r === role)?.[0] || "";
      setSso({
        enabled: !!oc.enabled,
        issuer_url: oc.issuer_url || "",
        client_id: oc.client_id || "",
        client_secret: oc.client_secret || "",
        group_admin: findGroupForRole("Admin") || "csat-admins",
        group_analyst: findGroupForRole("Security Analyst") || "csat-analysts",
        group_auditor: findGroupForRole("Auditor") || "csat-auditors",
        group_viewer: findGroupForRole("Viewer") || "csat-viewers",
        default_role: (oc.default_role as any) || "Viewer",
      });
      setLoading(false);
    }).catch(() => setLoading(false));

    api.getAiConfig().then((cfg) => {
      setAiConfig({
        provider: cfg.provider || "ollama",
        api_url: cfg.api_url || "http://localhost:11434",
        api_key: cfg.api_key || "",
        model: cfg.model || "llama3:latest",
      });
      // Auto-test connection when config loads
      api.aiHealth().then((h) => setAiHealth(h)).catch(() => {});
    }).catch(() => {});
  }, []);

  const savePlatform = async () => {
    setSaving(true);
    try {
      await api.updateSetting("platform_name", platform.platform_name);
      await api.updateSetting("theme_default", platform.theme_default);
      await api.updateSetting("review_reminder_days", Number(platform.review_reminder_days));
      await api.updateSetting("mfa_required_for_admin", !!platform.mfa_required_for_admin);
      await api.updateSetting("language", platform.language);
      await api.updateSetting("industry", platform.industry || null);
      const s = await api.getSettings();
      setSettings(s);
      await refreshSettings();
      toast(t("settings.toast.saved"), "success");
    } catch (e: any) {
      toast(e.message || t("settings.toast.failed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    try {
      await api.uploadLogo(logoFile);
      setLogoFile(null);
      const s = await api.getSettings();
      setSettings(s);
      await refreshSettings();
      toast("Logo uploaded", "success");
    } catch (e: any) {
      toast(e.message || "Failed to upload logo", "error");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm(t("settings.remove_logo_confirm"))) return;
    try {
      await api.updateSetting("company_logo_url", null);
      const s = await api.getSettings();
      setSettings(s);
      await refreshSettings();
    } catch (e: any) {
      toast(e.message || "Failed to remove logo", "error");
    }
  };

  const saveAiConfig = async () => {
    try {
      await api.updateAiConfig(aiConfig);
      toast("AI configuration saved", "success");
    } catch (e: any) {
      toast(e.message || "Failed to save AI config", "error");
    }
  };

  const testSso = async () => {
    setTestingSso(true);
    setSsoTestResult(null);
    try {
      const res = await api.testOidc({
        issuer_url: sso.issuer_url.trim(),
        client_id: sso.client_id.trim() || undefined,
        client_secret: sso.client_secret || undefined,
      });
      setSsoTestResult({ status: res.status, detail: res.detail });
    } catch (e: any) {
      setSsoTestResult({ status: "error", detail: e.message || t("settings.sso.test_failed") });
    } finally {
      setTestingSso(false);
    }
  };

  const saveSso = async () => {
    setSavingSso(true);
    try {
      // Compose group_role_map from the four named inputs, dropping empties
      // so that an unset group doesn't create a "" → Role mapping.
      const map: Record<string, string> = {};
      if (sso.group_admin)   map[sso.group_admin]   = "Admin";
      if (sso.group_analyst) map[sso.group_analyst] = "Security Analyst";
      if (sso.group_auditor) map[sso.group_auditor] = "Auditor";
      if (sso.group_viewer)  map[sso.group_viewer]  = "Viewer";

      await api.updateSetting("oidc_config", {
        enabled: sso.enabled,
        issuer_url: sso.issuer_url.trim(),
        client_id: sso.client_id.trim(),
        client_secret: sso.client_secret,
        group_role_map: map,
        default_role: sso.default_role || null,
      });
      toast(t("settings.sso.saved"), "success");
    } catch (e: any) {
      toast(e.message || t("settings.sso.save_failed"), "error");
    } finally {
      setSavingSso(false);
    }
  };

  const testAiConnection = async () => {
    setTestingAi(true);
    try {
      // Pass the in-flight form values so users can verify before saving.
      const res = await api.aiHealth(aiConfig);
      setAiHealth(res);
    } catch (e: any) {
      setAiHealth({ status: "error", detail: e.message });
    } finally {
      setTestingAi(false);
    }
  };

  const getIntegrationConfig = (key: string) => {
    return settings[`integration.${key}`] || {};
  };

  const saveIntegration = async (key: string, values: Record<string, any>) => {
    setSaving(true);
    try {
      await api.updateSetting(`integration.${key}`, values);
      const s = await api.getSettings();
      setSettings(s);
      toast("Integration configuration saved", "success");
    } catch (e: any) {
      toast(e.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title={t("settings.title")} subtitle={t("settings.subtitle")}>
      <div className="space-y-6">
        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4 text-muted" />
              {t("settings.branding")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted">{t("common.loading")}</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">{t("settings.platform_name")}</label>
                    <Input
                      value={platform.platform_name}
                      onChange={(e) => setPlatform({ ...platform, platform_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">{t("settings.logo")}</label>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card overflow-hidden">
                        {settings.company_logo_url ? (
                          <img src={settings.company_logo_url} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                          <Image className="h-4 w-4 text-muted" />
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        {t("evidence.choose_file")}
                      </Button>
                      {logoFile && (
                        <Button size="sm" onClick={handleLogoUpload} disabled={uploadingLogo}>
                          <Save className="h-3 w-3 mr-1" />
                          {uploadingLogo ? t("evidence.uploading") : t("evidence.upload")}
                        </Button>
                      )}
                      {settings.company_logo_url && (
                        <Button variant="outline" size="sm" onClick={handleRemoveLogo} className="text-danger hover:bg-danger-dim">
                          <Trash2 className="h-3 w-3 mr-1" />
                          {t("common.delete")}
                        </Button>
                      )}
                    </div>
                    {logoFile && (
                      <p className="text-xs text-muted mt-1">Selected: {logoFile.name}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">{t("settings.theme_default")}</label>
                    <Select
                      value={platform.theme_default}
                      onChange={(e) => setPlatform({ ...platform, theme_default: e.target.value })}
                    >
                      <option value="dark">{t("settings.theme.dark")}</option>
                      <option value="light">{t("settings.theme.light")}</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">{t("settings.review_reminder_days")}</label>
                    <Input
                      type="number"
                      value={platform.review_reminder_days}
                      onChange={(e) => setPlatform({ ...platform, review_reminder_days: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">{t("settings.mfa_admin")}</label>
                    <Select
                      value={platform.mfa_required_for_admin ? "true" : "false"}
                      onChange={(e) => setPlatform({ ...platform, mfa_required_for_admin: e.target.value === "true" })}
                    >
                      <option value="false">{t("common.no")}</option>
                      <option value="true">{t("common.yes")}</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">{t("settings.language")}</label>
                    <Select
                      value={platform.language}
                      onChange={(e) => {
                        const next = e.target.value as Language;
                        setPlatform({ ...platform, language: next });
                        // Apply immediately so the UI translates without waiting for Save.
                        setLanguage(next);
                      }}
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="pt">Português</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">{t("settings.industry")}</label>
                    <Select
                      value={platform.industry}
                      onChange={(e) => setPlatform({ ...platform, industry: e.target.value })}
                    >
                      <option value="">{t("settings.industry_none")}</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind.key} value={ind.key}>{ind.name}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button onClick={savePlatform} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-1" />
                {saving ? t("settings.saving") : t("settings.save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted" />
              {t("settings.ai_config")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">{t("settings.ai_provider")}</label>
                <Select
                  value={aiConfig.provider}
                  onChange={(e) => {
                    const provider = e.target.value;
                    let api_url = aiConfig.api_url;
                    let model = aiConfig.model;
                    if (provider === "openai") {
                      api_url = "https://api.openai.com";
                      model = "gpt-4o-mini";
                    } else if (provider === "anthropic") {
                      api_url = "https://api.anthropic.com";
                      model = "claude-haiku-4-5-20251001";
                    } else if (provider === "openrouter") {
                      api_url = "https://openrouter.ai/api";
                      model = "meta-llama/llama-3.3-70b-instruct:free";
                    } else if (provider === "ollama") {
                      api_url = "http://host.docker.internal:11434";
                      model = "llama3:latest";
                    }
                    setAiConfig({ ...aiConfig, provider, api_url, model });
                  }}
                >
                  <option value="openrouter">OpenRouter (multi-model gateway, free tier available)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="ollama">Ollama (external, self-hosted)</option>
                </Select>
              </div>
              {aiConfig.provider === "ollama" && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("settings.ai_api_url")}</label>
                  <Input
                    value={aiConfig.api_url}
                    onChange={(e) => setAiConfig({ ...aiConfig, api_url: e.target.value })}
                    placeholder="http://localhost:11434"
                  />
                </div>
              )}
              {aiConfig.provider !== "ollama" && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("settings.ai_api_key")}</label>
                  <Input
                    type="password"
                    value={aiConfig.api_key}
                    onChange={(e) => setAiConfig({ ...aiConfig, api_key: e.target.value })}
                    placeholder={
                      aiConfig.provider === "openai"
                        ? "sk-..."
                        : aiConfig.provider === "anthropic"
                        ? "sk-ant-..."
                        : aiConfig.provider === "openrouter"
                        ? "sk-or-..."
                        : ""
                    }
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">{t("settings.ai_model")}</label>
                <Input
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                  placeholder={
                    aiConfig.provider === "openai"
                      ? "gpt-4o-mini"
                      : aiConfig.provider === "anthropic"
                      ? "claude-haiku-4-5-20251001"
                      : aiConfig.provider === "openrouter"
                      ? "meta-llama/llama-3.3-70b-instruct:free"
                      : "llama3:latest"
                  }
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted">
                {aiConfig.provider === "ollama"
                  ? t("settings.ai_help.ollama")
                  : aiConfig.provider === "openrouter"
                  ? t("settings.ai_help.openrouter")
                  : aiConfig.provider === "openai"
                  ? t("settings.ai_help.openai")
                  : t("settings.ai_help.anthropic")}
              </p>
              <div className="flex items-center gap-3">
                {aiHealth && (
                  <span className={`text-xs flex items-center gap-1 ${aiHealth.status === "ok" ? "text-success" : "text-danger"}`}>
                    <Activity className="h-3 w-3" />
                    {aiHealth.status === "ok" ? t("settings.ai_connected") : aiHealth.detail || t("settings.ai_failed")}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={testAiConnection} disabled={testingAi}>
                  <Activity className="h-3 w-3 mr-1" />
                  {testingAi ? t("settings.ai_testing") : t("settings.ai_test")}
                </Button>
                <Button size="sm" onClick={saveAiConfig}>
                  <Save className="h-3 w-3 mr-1" />
                  {t("common.save")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Single Sign-On (OIDC) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted" />
              {t("settings.sso.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted">
              {t("settings.sso.help")}
            </p>

            <div className="flex items-center gap-2">
              <input
                id="sso-enabled"
                type="checkbox"
                checked={sso.enabled}
                onChange={(e) => setSso({ ...sso, enabled: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="sso-enabled" className="text-sm cursor-pointer select-none">
                {t("settings.sso.enable")}
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {t("settings.sso.issuer_url")}
                </label>
                <Input
                  value={sso.issuer_url}
                  onChange={(e) => setSso({ ...sso, issuer_url: e.target.value })}
                  placeholder="http://host.docker.internal:8081/realms/csat"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {t("settings.sso.client_id")}
                </label>
                <Input
                  value={sso.client_id}
                  onChange={(e) => setSso({ ...sso, client_id: e.target.value })}
                  placeholder="csat-app"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">
                  {t("settings.sso.client_secret")}
                </label>
                <Input
                  type="password"
                  value={sso.client_secret}
                  onChange={(e) => setSso({ ...sso, client_secret: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
              <div className="text-xs font-semibold text-muted uppercase tracking-wider">
                {t("settings.sso.group_mapping")}
              </div>
              <p className="text-xs text-muted">
                {t("settings.sso.group_mapping_help")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Admin</label>
                  <Input
                    value={sso.group_admin}
                    onChange={(e) => setSso({ ...sso, group_admin: e.target.value })}
                    placeholder="csat-admins"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Security Analyst</label>
                  <Input
                    value={sso.group_analyst}
                    onChange={(e) => setSso({ ...sso, group_analyst: e.target.value })}
                    placeholder="csat-analysts"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Auditor</label>
                  <Input
                    value={sso.group_auditor}
                    onChange={(e) => setSso({ ...sso, group_auditor: e.target.value })}
                    placeholder="csat-auditors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Viewer</label>
                  <Input
                    value={sso.group_viewer}
                    onChange={(e) => setSso({ ...sso, group_viewer: e.target.value })}
                    placeholder="csat-viewers"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {t("settings.sso.default_role")}
                </label>
                <Select
                  value={sso.default_role}
                  onChange={(e) => setSso({ ...sso, default_role: e.target.value as any })}
                >
                  <option value="">— {t("settings.sso.default_none")} —</option>
                  <option value="Admin">Admin</option>
                  <option value="Security Analyst">Security Analyst</option>
                  <option value="Auditor">Auditor</option>
                  <option value="Viewer">Viewer</option>
                </Select>
                <p className="text-xs text-muted mt-1">
                  {t("settings.sso.default_role_help")}
                </p>
              </div>
            </div>

            {ssoTestResult && (
              <div
                className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
                  ssoTestResult.status === "ok"
                    ? "border-success/30 bg-success/5 text-success"
                    : "border-danger/30 bg-danger/5 text-danger"
                }`}
              >
                {ssoTestResult.status === "ok" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>{ssoTestResult.detail}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={testSso}
                disabled={testingSso || !sso.issuer_url.trim()}
              >
                <Activity className="h-3 w-3 mr-1" />
                {testingSso ? t("settings.sso.testing") : t("settings.sso.test")}
              </Button>
              <Button onClick={saveSso} disabled={savingSso}>
                <Save className="h-3 w-3 mr-1" />
                {savingSso ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settings.integrations")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {INTEGRATIONS.map((integration) => {
              const config = getIntegrationConfig(integration.key);
              const isConfigured = !!config.server_url || !!config.api_url || !!config.client_id || !!config.issuer_url;
              const isOpen = expanded === integration.key;

              return (
                <div
                  key={integration.key}
                  className={`rounded-lg border ${isConfigured ? "border-success-border" : "border-border"} overflow-hidden`}
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : integration.key)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-card/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isConfigured ? (
                        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-danger shrink-0" />
                      )}
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-2">
                          {integration.icon}
                          {integration.name}
                        </div>
                        <div className="text-[10px] text-muted">
                          {isConfigured ? t("settings.configured") : t("settings.not_configured")}
                        </div>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                  </button>

                  {isOpen && (
                    <IntegrationForm
                      integration={integration}
                      config={config}
                      onSave={(values) => saveIntegration(integration.key, values)}
                      saving={saving}
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function IntegrationForm({
  integration,
  config,
  onSave,
  saving,
}: {
  integration: IntegrationDef;
  config: Record<string, any>;
  onSave: (values: Record<string, any>) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const save_label = t("settings.save_config");
  const saving_label = t("common.saving");
  const [values, setValues] = useState<Record<string, any>>(() => {
    const v: Record<string, any> = {};
    integration.fields.forEach((f) => {
      v[f.name] = config[f.name] ?? "";
    });
    return v;
  });

  return (
    <div className="border-t border-border p-4 bg-card/30 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {integration.fields.map((field) => (
          <div key={field.name}>
            <label className="block text-xs font-medium text-muted mb-1">{field.label}</label>
            <Input
              type={field.type || "text"}
              value={values[field.name] ?? ""}
              onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => onSave(values)} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? saving_label : save_label}
        </Button>
      </div>
    </div>
  );
}
