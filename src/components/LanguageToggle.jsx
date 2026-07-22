import { Languages } from "lucide-react";

import { commonContent } from "../data/commonContent";
import useLanguage from "../hooks/useLanguage";

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  const content = commonContent[language].language;

  return (
    <button
      className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-control border border-border/90 bg-surface/80 px-2.5 text-xs font-semibold text-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 sm:px-3"
      type="button"
      aria-label={content.switchLabel}
      onClick={toggleLanguage}
    >
      <Languages aria-hidden="true" className="size-4 text-primary-700" />
      <span className="sm:hidden">{content.shortLabel}</span>
      <span className="hidden sm:inline">{content.fullLabel}</span>
    </button>
  );
}
