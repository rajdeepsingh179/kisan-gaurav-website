import { layout, spacing } from "../../design-system";
import { cn } from "../../utils/cn";

const widthClasses = {
  full: layout.content,
  content: "max-w-6xl",
  reading: layout.reading,
};

export default function Container({
  as: Component = "div",
  className,
  size = "full",
  ...props
}) {
  return (
    <Component
      className={cn(
        "mx-auto w-full",
        spacing.containerX,
        widthClasses[size],
        className,
      )}
      {...props}
    />
  );
}
