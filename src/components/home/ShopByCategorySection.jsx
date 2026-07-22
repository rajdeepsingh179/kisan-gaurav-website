import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { homeCommerceContent } from "../../data/homeCommerce";
import { typography } from "../../design-system";
import useLanguage from "../../hooks/useLanguage";
import { cn } from "../../utils/cn";
import { Card, Section, SectionHeading } from "../ui";

export default function ShopByCategorySection() {
  const { language } = useLanguage();
  const content = homeCommerceContent[language].categories;

  return (
    <Section className="scroll-mt-24" id="categories" tone="muted">
      <SectionHeading
        align="center"
        description={content.description}
        eyebrow={content.eyebrow}
        title={content.title}
      />

      <div className="mt-10 grid min-w-0 gap-5 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
        {content.items.map((category) => (
          <Card as="article" className="group min-w-0 overflow-hidden" key={category.title} padding="none">
            <Link className="block focus-visible:outline-offset-[-3px]" to="/products">
              <div className="aspect-[4/3] overflow-hidden bg-primary-50">
                <img
                  alt={category.imageAlt}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  decoding="async"
                  height="900"
                  loading="lazy"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  src={category.image.small}
                  srcSet={`${category.image.small} ${category.image.smallWidth}w, ${category.image.large} ${category.image.largeWidth}w`}
                  width="900"
                />
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <h3 className={cn(typography.heading3, "text-foreground")}>{category.title}</h3>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-700 transition group-hover:bg-primary-700 group-hover:text-on-primary">
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                  </span>
                </div>
                <p className={cn(typography.bodySmall, "mt-2.5 text-foreground-muted")}>
                  {category.description}
                </p>
                <span className="mt-4 inline-block text-sm font-semibold text-primary-700">
                  {content.action}
                </span>
              </div>
            </Link>
          </Card>
        ))}
      </div>
    </Section>
  );
}
