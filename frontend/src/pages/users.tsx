import { useState } from "react";
import { useUsers } from "../hooks/use-api";
import { Layout } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { UserRoleBadge } from "../components/user-role-badge";
import { api } from "../lib/api";
import { Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "../hooks/use-translation";

export default function UsersPage() {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useUsers();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role_names: ["Viewer"] });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.createUser(form);
      setShowForm(false);
      setForm({ email: "", password: "", full_name: "", role_names: ["Viewer"] });
      refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("users.delete_confirm"))) return;
    await api.deleteUser(id);
    refresh();
  };

  return (
    <Layout title={t("users.title")} subtitle={t("users.subtitle")}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("users.title")}</CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {showForm ? t("common.cancel") : t("users.add_user")}
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-6 rounded-lg border border-border bg-card/50 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input placeholder={t("common.email")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input placeholder={t("common.name")} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                <Input placeholder={t("common.password")} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <Select
                  value={form.role_names[0]}
                  onChange={(e) => setForm({ ...form, role_names: [e.target.value] })}
                >
                  <option value="Viewer">{t("users.role.viewer")}</option>
                  <option value="Auditor">{t("users.role.auditor")}</option>
                  <option value="Security Analyst">{t("users.role.security_analyst")}</option>
                  <option value="Admin">{t("users.role.admin")}</option>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={saving} size="sm">
                {saving ? t("common.saving") : t("common.create")}
              </Button>
            </div>
          )}

          {loading && <p className="text-sm text-muted">{t("common.loading")}</p>}
          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="space-y-2">
            {data?.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium">{user.full_name}</div>
                  <div className="text-xs text-muted">{user.email}</div>
                  <div className="mt-1 flex gap-1">
                    {user.roles.map((r) => (
                      <UserRoleBadge key={r.id} role={r.name} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!user.is_active && <span className="text-xs text-danger">{t("common.failed")}</span>}
                  <button onClick={() => handleDelete(user.id)} className="rounded-lg p-2 hover:bg-danger-dim text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {!loading && data?.length === 0 && (
              <p className="text-sm text-muted">{t("users.no_users")}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}
