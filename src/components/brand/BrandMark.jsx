import { cn } from "../../utils/cn";

const logoSources = [
  "/brand/kisan-gaurav-logo-64.webp 64w",
  "/brand/kisan-gaurav-logo-128.webp 128w",
  "/brand/kisan-gaurav-logo-256.webp 256w",
  "/brand/kisan-gaurav-logo-512.webp 512w",
].join(", ");

export default function BrandMark({ className, decorative = true, priority = false, sizes = "48px" }) {
  return (
    <img
      className={cn("brand-mark rounded-[28%] object-cover shadow-soft", className)}
      src="/brand/kisan-gaurav-logo-128.webp"
      srcSet={logoSources}
      sizes={sizes}
      alt={decorative ? "" : "Kisan Gaurav"}
      aria-hidden={decorative || undefined}
      width="256"
      height="256"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
    />
  );
}
