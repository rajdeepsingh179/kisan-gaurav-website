import { cn } from "../../utils/cn";

const badgeClasses = {
  "Best Seller": "border-accent-300 bg-accent-100 text-accent-900",
  New: "border-primary-200 bg-primary-50 text-primary-800",
  Premium: "border-earth-200 bg-earth-50 text-earth-800",
  "Out of Stock": "border-neutral-300 bg-neutral-100 text-neutral-700",
};

export default function ProductBadge({ children, className }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em]",
        badgeClasses[children] ?? badgeClasses.Premium,
        className,
      )}
    >
      {children}
    </span>
  );
}
