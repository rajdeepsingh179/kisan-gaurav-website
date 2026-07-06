import { BRAND } from "../../design-system";
import { cn } from "../../utils/cn";
import BrandMark from "./BrandMark";

export default function BrandLogo({ className, showTagline = false }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark className="size-10 shrink-0" />
      <span className="text-left">
        <span className="block font-semibold tracking-tight text-foreground">
          {BRAND.name}
        </span>
        {showTagline ? (
          <span className="mt-0.5 block text-xs text-foreground-muted">
            {BRAND.tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}
