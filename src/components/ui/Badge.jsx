import { cn } from "../../utils/cn";

export default function Badge({ className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-3 py-1",
        "text-xs font-semibold uppercase tracking-[0.12em] text-primary-800",
        className,
      )}
      {...props}
    />
  );
}
