import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { alertTranslations, type AlertLanguage } from "@/lib/communityAlertI18n";

const STORAGE_KEY = "aije-language";
type TranslationKey = keyof typeof alertTranslations.en;
type Translator = ((key:TranslationKey)=>string) & Record<TranslationKey,string>;
type LanguageContextValue = { language:AlertLanguage; setLanguage:(language:AlertLanguage)=>void; t:Translator };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({children}:{children:ReactNode}) {
  const [language,setLanguage]=useState<AlertLanguage>(()=>localStorage.getItem(STORAGE_KEY)==="idoma"?"idoma":"en");
  useEffect(()=>{localStorage.setItem(STORAGE_KEY,language);document.documentElement.lang=language==="idoma"?"idu":"en"},[language]);
  const value=useMemo(()=>({language,setLanguage,t:Object.assign((key:TranslationKey)=>alertTranslations[language][key]??alertTranslations.en[key],alertTranslations[language]) as Translator}),[language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(){const value=useContext(LanguageContext);if(!value)throw new Error("useLanguage must be used inside LanguageProvider");return value}
