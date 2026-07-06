import { cn } from "../../utils/cn";

export default function BrandMark({ className, decorative = true }) {
  return (
    <img
      className={cn("rounded-[28%] object-cover shadow-soft", className)}
      src="/kisan-gaurav-logo.png"
      alt={decorative ? "" : "Kisan Gaurav"}
      aria-hidden={decorative || undefined}
      width="256"
      height="256"
      decoding="async"
    />
  );
}
