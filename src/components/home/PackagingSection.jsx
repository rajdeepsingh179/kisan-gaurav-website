import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

import { homeCommerceContent } from "../../data/homeCommerce";
import { typography } from "../../design-system";
import useLanguage from "../../hooks/useLanguage";
import { cn } from "../../utils/cn";
import { Badge, Button, Section } from "../ui";

export default function PackagingSection() {
  const { language } = useLanguage();
  const content = homeCommerceContent[language].packaging;

  return (
    <Section tone="muted">
      <div className="grid min-w-0 items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="min-w-0">
          <Badge>{content.eyebrow}</Badge>
          <h2 className={cn(typography.heading2, "mt-5 text-balance text-foreground")}>
            {content.title}
          </h2>
          <p className={cn(typography.body, "mt-5 text-foreground-muted sm:text-lg")}>
            {content.description}
          </p>
          <ul className="mt-7 space-y-3">
            {content.points.map((point) => (
              <li className="flex items-start gap-3 text-sm font-semibold text-foreground" key={point}>
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-500 text-accent-950">
                  <Check aria-hidden="true" className="size-3.5" />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <Button as={Link} className="mt-8 w-full sm:w-auto" to="/products" variant="accent">
            {content.action}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        </div>

        <div className="min-w-0 overflow-hidden rounded-[2rem] border border-accent-200 bg-surface shadow-lifted">
          <img
            alt={content.imageAlt}
            className="h-full w-full object-cover"
            decoding="async"
            height="933"
            loading="lazy"
            sizes="(min-width: 1024px) 55vw, 100vw"
            src={content.image.small}
            srcSet={`${content.image.small} ${content.image.smallWidth}w, ${content.image.large} ${content.image.largeWidth}w`}
            width="1400"
          />
        </div>
      </div>
    </Section>
  );
}
