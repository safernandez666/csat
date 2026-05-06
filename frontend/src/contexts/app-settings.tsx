import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import {
  getStoredLanguage,
  setStoredLanguage,
  type Language,
} from "../lib/i18n";

interface AppSettings {
  platform_name: string;
  company_logo_url?: string | null;
  theme_default: string;
  review_reminder_days: number;
  mfa_required_for_admin: boolean;
  language: Language;
  industry?: string;
}

interface AppSettingsContextValue {
  settings: AppSettings;
  refreshSettings: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
}

const defaultSettings: AppSettings = {
  platform_name: "CSAT",
  company_logo_url: null,
  theme_default: "dark",
  review_reminder_days: 7,
  mfa_required_for_admin: false,
  language: getStoredLanguage(),
  industry: undefined,
};

const AppSettingsContext = createContext<AppSettingsContextValue>({
  settings: defaultSettings,
  refreshSettings: async () => {},
  setLanguage: async () => {},
});

export function useAppSettings() {
  return useContext(AppSettingsContext);
}

function coerceLanguage(value: unknown): Language {
  return value === "es" || value === "pt" ? value : "en";
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  const refreshSettings = async () => {
    try {
      const s = await api.getSettings();
      const lang = coerceLanguage(s.language);
      setSettings({
        platform_name: s.platform_name || "CSAT",
        company_logo_url: s.company_logo_url || null,
        theme_default: s.theme_default || "dark",
        review_reminder_days: s.review_reminder_days || 7,
        mfa_required_for_admin: !!s.mfa_required_for_admin,
        language: lang,
        industry: s.industry || undefined,
      });
      // Sync remote → local so anonymous routes (login) stay in sync.
      setStoredLanguage(lang);
    } catch {
      // ignore
    }
  };

  const setLanguage = async (lang: Language) => {
    setStoredLanguage(lang);
    setSettings((prev) => ({ ...prev, language: lang }));
    try {
      await api.updateSetting("language", lang);
    } catch {
      // ignore: localStorage already applied; remote will sync on next save
    }
  };

  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <AppSettingsContext.Provider value={{ settings, refreshSettings, setLanguage }}>
      {children}
    </AppSettingsContext.Provider>
  );
}
