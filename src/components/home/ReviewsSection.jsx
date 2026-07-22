import { Quote, Star } from "lucide-react";

import { homeCommerceContent } from "../../data/homeCommerce";
import useLanguage from "../../hooks/useLanguage";
import { Card, Section, SectionHeading } from "../ui";

export default function ReviewsSection() {
  const { language } = useLanguage();
  const content = homeCommerceContent[language].reviews;

  return (
    <Section>
      <SectionHeading
        align="center"
        description={content.description}
        eyebrow={content.eyebrow}
        title={content.title}
      />

      <div className="mt-10 grid gap-5 lg:mt-14 lg:grid-cols-3">
        {content.items.map((review) => (
          <Card as="figure" className="relative h-full border-accent-200/70" key={review.name} padding="lg">
            <Quote aria-hidden="true" className="absolute right-6 top-6 size-8 text-accent-200" />
            <div className="flex gap-1 text-accent-600" aria-label="5 out of 5 stars">
              {Array.from({ length: 5 }, (_, index) => (
                <Star aria-hidden="true" className="size-4 fill-current" key={index} />
              ))}
            </div>
            <blockquote className="mt-6 text-lg font-semibold leading-8 tracking-[-0.015em] text-foreground">
              “{review.quote}”
            </blockquote>
            <figcaption className="mt-7 border-t border-border pt-5">
              <p className="text-sm font-bold text-foreground">{review.name}</p>
              <p className="mt-1 text-sm text-foreground-muted">{review.context}</p>
            </figcaption>
          </Card>
        ))}
      </div>
    </Section>
  );
}
