import { useCallback, useEffect, useState } from "react";
import { getTranslation, LANGUAGES, LanguageCode, TranslationKey } from "@/lib/i18n";

const STORAGE_KEY = "aije-language";

export function useLanguage() {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (saved && saved in LANGUAGES) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = useCallback((value: LanguageCode) => {
    setLanguageState(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, value);
    }
  }, []);

  const t = useCallback((key: TranslationKey) => getTranslation(language, key), [language]);

  return { language, setLanguage, t, languages: LANGUAGES };
}
