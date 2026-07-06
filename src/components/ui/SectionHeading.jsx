import { layout, typography } from "../../design-system";
import { cn } from "../../utils/cn";

export default function SectionHeading({
  align = "left",
  className,
  description,
  eyebrow,
  title,
}) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        layout.reading,
        centered && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className={cn(typography.eyebrow, "text-primary-700")}>
          {eyebrow}
        </p>
      ) : null}
      <h2 className={cn(typography.heading2, "mt-3 text-foreground")}>
        {title}
      </h2>
      {description ? (
        <p className={cn(typography.body, "mt-4 text-foreground-muted sm:text-lg")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
