import { cn } from "../../utils/cn";

export default function Badge({ className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-primary-200/80 bg-primary-50/90 px-3.5 py-1.5 shadow-soft",
        "text-xs font-semibold uppercase tracking-[0.12em] text-primary-800",
        className,
      )}
      {...props}
    />
  );
}
