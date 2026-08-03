import { Home, Languages } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/hooks/useLanguage";
import { alertTranslations, type AlertLanguage } from "@/lib/communityAlertI18n";

export function GlobalControls(){
  const {pathname}=useLocation();
  const {language,setLanguage,t}=useLanguage();
  return <nav aria-label={t("quickNavigation")} className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3 z-[100] flex items-center gap-2 rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur md:bottom-4 md:right-4">
    {pathname!=="/"&&<Button asChild size="sm" variant="outline"><Link to="/"><Home className="mr-2 h-4 w-4"/>{t("home")}</Link></Button>}
    <Select value={language} onValueChange={value=>setLanguage(value as AlertLanguage)}><SelectTrigger className="h-9 w-[132px]" aria-label={t("selectLanguage")}><Languages className="mr-2 h-4 w-4"/><SelectValue/></SelectTrigger><SelectContent>{Object.entries(alertTranslations).map(([key,value])=><SelectItem key={key} value={key}>{value.languageName}</SelectItem>)}</SelectContent></Select>
  </nav>;
}
