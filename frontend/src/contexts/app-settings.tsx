import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";

interface AppSettings {
  platform_name: string;
  company_logo_url?: string | null;
  theme_default: string;
  review_reminder_days: number;
  mfa_required_for_admin: boolean;
  language: string;
}

interface AppSettingsContextValue {
  settings: AppSettings;
  refreshSettings: () => Promise<void>;
  setLanguage: (lang: string) => Promise<void>;
}

const defaultSettings: AppSettings = {
  platform_name: "CSAT",
  company_logo_url: null,
  theme_default: "dark",
  review_reminder_days: 7,
  mfa_required_for_admin: false,
  language: "en",
};

const AppSettingsContext = createContext<AppSettingsContextValue>({
  settings: defaultSettings,
  refreshSettings: async () => {},
  setLanguage: async () => {},
});

export function useAppSettings() {
  return useContext(AppSettingsContext);
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  const refreshSettings = async () => {
    try {
      const s = await api.getSettings();
      setSettings({
        platform_name: s.platform_name || "CSAT",
        company_logo_url: s.company_logo_url || null,
        theme_default: s.theme_default || "dark",
        review_reminder_days: s.review_reminder_days || 7,
        mfa_required_for_admin: !!s.mfa_required_for_admin,
        language: s.language || "en",
      });
    } catch {
      // ignore
    }
  };

  const setLanguage = async (lang: string) => {
    try {
      await api.updateSetting("language", lang);
      setSettings((prev) => ({ ...prev, language: lang }));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <AppSettingsContext.Provider value={{ settings, refreshSettings, setLanguage }}>
      {children}
    </AppSettingsContext.Provider>
  );
}
