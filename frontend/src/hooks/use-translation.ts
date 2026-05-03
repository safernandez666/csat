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

export function useTranslation() {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
    [lang]
  );

  return { t, lang };
}
