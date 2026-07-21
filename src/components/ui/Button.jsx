import { cn } from "../../utils/cn";

const variantClasses = {
  primary:
    "bg-primary-700 text-on-primary shadow-soft hover:bg-primary-800 active:bg-primary-900",
  outline:
    "border border-primary-600 bg-transparent text-primary-800 hover:bg-primary-50 active:bg-primary-100",
  secondary:
    "border border-border bg-surface text-foreground shadow-soft hover:border-primary-200 hover:bg-primary-50",
  ghost: "text-foreground hover:bg-surface-muted",
};

const sizeClasses = {
  sm: "min-h-9 px-3.5 text-sm",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-base",
};

export default function Button({
  as: Component = "button",
  className,
  type = "button",
  variant = "primary",
  size = "md",
  ...props
}) {
  const buttonProps = Component === "button" ? { type } : {};

  return (
    <Component
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition duration-200 ease-out",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...buttonProps}
      {...props}
    />
  );
}
