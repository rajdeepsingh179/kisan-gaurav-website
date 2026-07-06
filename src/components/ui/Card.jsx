import { cn } from "../../utils/cn";

const paddingClasses = {
  none: "",
  sm: "p-4 sm:p-5",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export default function Card({
  as: Component = "div",
  className,
  padding = "md",
  elevated = false,
  ...props
}) {
  return (
    <Component
      className={cn(
        "rounded-card border border-border bg-surface",
        elevated ? "shadow-lifted" : "shadow-card",
        paddingClasses[padding],
        className,
      )}
      {...props}
    />
  );
}
