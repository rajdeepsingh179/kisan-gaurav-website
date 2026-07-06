import { spacing } from "../../design-system";
import { cn } from "../../utils/cn";

import Container from "./Container";

const toneClasses = {
  default: "bg-canvas",
  muted: "bg-surface-muted",
  primary: "bg-primary-950 text-on-primary",
};

export default function Section({
  as: Component = "section",
  children,
  className,
  containerClassName,
  containerSize = "full",
  tone = "default",
  ...props
}) {
  return (
    <Component
      className={cn(
        spacing.sectionY,
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      <Container className={containerClassName} size={containerSize}>
        {children}
      </Container>
    </Component>
  );
}
