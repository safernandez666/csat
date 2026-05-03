import { useState, useRef, useEffect } from "react";
import { Layout } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { useAppSettings } from "../contexts/app-settings";
import { Bot, User, Send, Sparkles, Trash2 } from "lucide-react";
import { useTranslation } from "../hooks/use-translation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AssistantPage() {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const platformName = settings.platform_name || "CSAT";

  const greeting: Message = {
    role: "assistant",
    content: t("assistant.greeting", { platform: platformName }),
  };

  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getChatHistory()
      .then((rows) => {
        if (cancelled) return;
        if (rows.length > 0) {
          setMessages(rows.map((r) => ({ role: r.role, content: r.content })));
        } else {
          // Refresh the greeting with current language whenever history is empty.
          setMessages([greeting]);
        }
      })
      .catch(() => {
        // ignore; keep the greeting
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformName, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const res = await api.aiChat(userMsg);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `${t("common.error")}: ${e.message || t("assistant.unable")}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (clearing) return;
    if (!confirm(t("assistant.clear_confirm"))) return;
    setClearing(true);
    try {
      await api.clearChatHistory();
      setMessages([greeting]);
    } catch (e: any) {
      alert(e.message || t("assistant.clear_failed"));
    } finally {
      setClearing(false);
    }
  };

  const hasUserMessages = messages.some((m) => m.role === "user");

  return (
    <Layout title={t("assistant.title")} subtitle={t("assistant.subtitle")}>
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="flex flex-col" style={{ height: "calc(100vh - 12rem)" }}>
          <CardHeader className="shrink-0 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              {platformName} {t("assistant.title")}
            </CardTitle>
            {hasUserMessages && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={clearing}
                className="text-muted hover:text-danger"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {clearing ? t("common.deleting") : t("assistant.clear")}
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {historyLoading && (
              <div className="text-xs text-muted text-center py-2">{t("assistant.history_loading")}</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    m.role === "assistant"
                      ? "bg-accent/10 text-accent"
                      : "bg-muted/20 text-muted"
                  }`}
                >
                  {m.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "assistant"
                      ? "bg-card border border-border"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Bot className="h-4 w-4 animate-pulse" />
                </div>
                <div className="rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted">
                  {t("assistant.thinking")}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </CardContent>
          <div className="shrink-0 border-t border-border p-4">
            <div className="flex gap-2">
              <Input
                placeholder={t("assistant.input_placeholder")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={loading}
              />
              <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
