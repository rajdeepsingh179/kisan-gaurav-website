import { ShoppingBasket, Tractor } from "lucide-react";

import { homeCommerceContent } from "../../data/homeCommerce";
import { typography } from "../../design-system";
import useLanguage from "../../hooks/useLanguage";
import { cn } from "../../utils/cn";
import { Card, Section, SectionHeading } from "../ui";

export default function AboutBrandSection() {
  const { language } = useLanguage();
  const content = homeCommerceContent[language].about;
  const pillars = [
    { ...content.food, Icon: ShoppingBasket, tone: "border-accent-200 bg-accent-50" },
    { ...content.platform, Icon: Tractor, tone: "border-primary-200 bg-primary-50" },
  ];

  return (
    <Section className="scroll-mt-24" id="about" tone="muted">
      <SectionHeading
        align="center"
        description={content.description}
        eyebrow={content.eyebrow}
        title={content.title}
      />

      <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:mt-14 lg:grid-cols-2">
        {pillars.map(({ Icon, description, eyebrow, title, tone }) => (
          <Card className={cn("h-full", tone)} key={title} padding="lg">
            <span className="grid size-13 place-items-center rounded-control bg-primary-700 text-on-primary shadow-soft">
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <p className={cn(typography.eyebrow, "mt-7 text-primary-700")}>{eyebrow}</p>
            <h3 className={cn(typography.heading3, "mt-3 text-foreground sm:text-2xl")}>{title}</h3>
            <p className={cn(typography.body, "mt-4 text-foreground-muted")}>{description}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
