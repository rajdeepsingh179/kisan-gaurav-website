import { commonContent } from "../data/commonContent";
import useLanguage from "../hooks/useLanguage";

export default function RouteFallback() {
  const { language } = useLanguage();

  return (
    <div
      className="grid min-h-screen place-items-center px-4 text-sm text-foreground-muted"
      role="status"
      aria-live="polite"
    >
      {commonContent[language].loading}
    </div>
  );
}
