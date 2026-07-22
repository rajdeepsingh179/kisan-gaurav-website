import { BRAND } from "../../design-system";
import { commonContent } from "../../data/commonContent";
import useLanguage from "../../hooks/useLanguage";
import { cn } from "../../utils/cn";
import BrandMark from "./BrandMark";

export default function BrandLogo({ className, showTagline = false }) {
  const { language } = useLanguage();

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark className="size-10 shrink-0" />
      <span className="text-left">
        <span className="block font-bold tracking-[-0.025em] text-foreground">
          {BRAND.name}
        </span>
        {showTagline ? (
          <span className="mt-0.5 block text-xs text-foreground-muted">
            {commonContent[language].brandTagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}
