import { useCallback, useSyncExternalStore } from "react";
import {
  LANGUAGE_CHANGE_EVENT,
  LANGUAGE_STORAGE_KEY,
  getStoredLanguage,
  translate,
  type Language,
} from "../lib/i18n";

function subscribe(callback: () => void): () => void {
  const onCustom = () => callback();
  const onStorage = (event: StorageEvent) => {
    if (event.key === LANGUAGE_STORAGE_KEY) callback();
  };
  window.addEventListener(LANGUAGE_CHANGE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Language {
  return getStoredLanguage();
}

function getServerSnapshot(): Language {
  return "en";
}

export function useTranslation(forceLang?: Language) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // forceLang lets a single page pin a language (e.g. the login forces 'en'
  // regardless of stored preference) without mutating the user's choice.
  const lang = forceLang ?? stored;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
    [lang]
  );

  return { t, lang };
}
