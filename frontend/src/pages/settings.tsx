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
  {
    name: "Okta OIDC",
    key: "okta_oidc",
    fields: [
      { name: "client_id", label: "Client ID" },
      { name: "client_secret", label: "Client Secret", type: "password" },
      { name: "issuer_url", label: "Issuer URL" },
    ],
  },
  {
    name: "Keycloak OIDC",
    key: "keycloak_oidc",
    fields: [
      { name: "client_id", label: "Client ID" },
      { name: "client_secret", label: "Client Secret", type: "password" },
      { name: "issuer_url", label: "Issuer URL" },
    ],
  },
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
  const { refreshSettings } = useAppSettings();
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

  const [platform, setPlatform] = useState({
    platform_name: "",
    theme_default: "dark",
    review_reminder_days: 7,
    mfa_required_for_admin: false,
    language: "en",
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
      const s = await api.getSettings();
      setSettings(s);
      await refreshSettings();
      toast("Platform settings saved", "success");
    } catch (e: any) {
      toast(e.message || "Failed to save", "error");
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
    if (!confirm("Remove company logo?")) return;
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

  const testAiConnection = async () => {
    setTestingAi(true);
    try {
      const res = await api.aiHealth();
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
    <Layout title="Settings" subtitle="Platform configuration & integrations">
      <div className="space-y-6">
        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4 text-muted" />
              Branding
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted">Loading...</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Company / Platform Name</label>
                    <Input
                      value={platform.platform_name}
                      onChange={(e) => setPlatform({ ...platform, platform_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Logo</label>
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
                        Choose
                      </Button>
                      {logoFile && (
                        <Button size="sm" onClick={handleLogoUpload} disabled={uploadingLogo}>
                          <Save className="h-3 w-3 mr-1" />
                          {uploadingLogo ? "Uploading..." : "Upload"}
                        </Button>
                      )}
                      {settings.company_logo_url && (
                        <Button variant="outline" size="sm" onClick={handleRemoveLogo} className="text-danger hover:bg-danger-dim">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remove
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
                    <label className="block text-xs font-medium text-muted mb-1">Default Theme</label>
                    <Select
                      value={platform.theme_default}
                      onChange={(e) => setPlatform({ ...platform, theme_default: e.target.value })}
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Review Reminder (days)</label>
                    <Input
                      type="number"
                      value={platform.review_reminder_days}
                      onChange={(e) => setPlatform({ ...platform, review_reminder_days: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">MFA Required (Admin)</label>
                    <Select
                      value={platform.mfa_required_for_admin ? "true" : "false"}
                      onChange={(e) => setPlatform({ ...platform, mfa_required_for_admin: e.target.value === "true" })}
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Language</label>
                    <Select
                      value={platform.language}
                      onChange={(e) => setPlatform({ ...platform, language: e.target.value })}
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="pt">Português</option>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button onClick={savePlatform} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted" />
              AI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Provider</label>
                <Select
                  value={aiConfig.provider}
                  onChange={(e) => {
                    const provider = e.target.value;
                    let api_url = aiConfig.api_url;
                    let model = aiConfig.model;
                    if (provider === "openai") {
                      api_url = "https://api.openai.com";
                      model = "gpt-4";
                    } else if (provider === "anthropic") {
                      api_url = "https://api.anthropic.com";
                      model = "claude-3-sonnet-20240229";
                    } else if (provider === "ollama") {
                      api_url = "http://localhost:11434";
                      model = "llama3:latest";
                    }
                    setAiConfig({ ...aiConfig, provider, api_url, model });
                  }}
                >
                  <option value="ollama">Ollama (Local)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </Select>
              </div>
              {aiConfig.provider === "ollama" && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">API URL</label>
                  <Input
                    value={aiConfig.api_url}
                    onChange={(e) => setAiConfig({ ...aiConfig, api_url: e.target.value })}
                    placeholder="http://localhost:11434"
                  />
                </div>
              )}
              {aiConfig.provider !== "ollama" && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">API Key</label>
                  <Input
                    type="password"
                    value={aiConfig.api_key}
                    onChange={(e) => setAiConfig({ ...aiConfig, api_key: e.target.value })}
                    placeholder={aiConfig.provider === "openai" ? "sk-..." : "sk-ant-..."}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Model</label>
                <Input
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                  placeholder={
                    aiConfig.provider === "openai"
                      ? "gpt-4"
                      : aiConfig.provider === "anthropic"
                      ? "claude-3-sonnet"
                      : "llama3:latest"
                  }
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted">
                {aiConfig.provider === "ollama"
                  ? "Set your Ollama URL. From Docker, use http://host.docker.internal:11434 (Ollama running on the host) or http://<lan-ip>:11434."
                  : aiConfig.provider === "openai"
                  ? "Uses https://api.openai.com. Only your API Key is needed."
                  : "Uses https://api.anthropic.com. Only your API Key is needed."}
              </p>
              <div className="flex items-center gap-3">
                {aiHealth && (
                  <span className={`text-xs flex items-center gap-1 ${aiHealth.status === "ok" ? "text-success" : "text-danger"}`}>
                    <Activity className="h-3 w-3" />
                    {aiHealth.status === "ok" ? "Connected" : aiHealth.detail || "Connection failed"}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={testAiConnection} disabled={testingAi}>
                  <Activity className="h-3 w-3 mr-1" />
                  {testingAi ? "Testing..." : "Test Connection"}
                </Button>
                <Button size="sm" onClick={saveAiConfig}>
                  <Save className="h-3 w-3 mr-1" />
                  Save AI Config
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integrations</CardTitle>
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
                          {isConfigured ? "Configured" : "Not configured"}
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
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}
