import { HeartPulse, Leaf, PackageCheck, ShieldCheck } from "lucide-react";

import { homeCommerceContent } from "../../data/homeCommerce";
import { typography } from "../../design-system";
import useLanguage from "../../hooks/useLanguage";
import { cn } from "../../utils/cn";
import { Card, Section, SectionHeading } from "../ui";

const benefitIcons = {
  heart: HeartPulse,
  leaf: Leaf,
  package: PackageCheck,
  shield: ShieldCheck,
};

export default function FoodBenefitsSection() {
  const { language } = useLanguage();
  const content = homeCommerceContent[language].benefits;

  return (
    <Section>
      <SectionHeading
        align="center"
        description={content.description}
        eyebrow={content.eyebrow}
        title={content.title}
      />

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
        {content.items.map((item) => {
          const Icon = benefitIcons[item.icon];

          return (
            <Card className="h-full border-primary-100 bg-[linear-gradient(145deg,var(--kg-color-surface),var(--kg-primary-50))]" key={item.title}>
              <span className="grid size-12 place-items-center rounded-control bg-primary-700 text-on-primary shadow-soft">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className={cn(typography.heading3, "mt-5 text-foreground")}>{item.title}</h3>
              <p className={cn(typography.bodySmall, "mt-2.5 text-foreground-muted")}>
                {item.description}
              </p>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}
