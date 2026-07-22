import {
  ArrowRight,
  BookOpenCheck,
  CloudSun,
  Landmark,
  Microscope,
  ScanSearch,
  Smartphone,
  Store,
} from "lucide-react";

import { homeCommerceContent } from "../../data/homeCommerce";
import { typography } from "../../design-system";
import useLanguage from "../../hooks/useLanguage";
import { cn } from "../../utils/cn";
import { Badge, Button, Card, Section, SectionHeading } from "../ui";

const serviceIcons = {
  advisory: BookOpenCheck,
  app: Smartphone,
  doctor: ScanSearch,
  market: Store,
  research: Microscope,
  schemes: Landmark,
  weather: CloudSun,
};

export default function AgriculturePlatformSection() {
  const { language } = useLanguage();
  const content = homeCommerceContent[language].agriculture;

  return (
    <Section
      className="scroll-mt-20 bg-[linear-gradient(145deg,var(--kg-primary-950),var(--kg-primary-800))] text-on-primary"
      id="agriculture"
    >
      <SectionHeading
        className="[&>h2]:text-on-primary [&>p:first-child]:text-accent-300 [&>p:last-child]:text-primary-100"
        description={content.description}
        eyebrow={content.eyebrow}
        title={content.title}
      />

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:mt-14 lg:grid-cols-3 xl:grid-cols-4">
        {content.items.map((service) => {
          const Icon = serviceIcons[service.icon];

          return (
            <Card
              as="article"
              className="scroll-mt-28 border-on-primary/10 bg-on-primary/[0.08] text-on-primary shadow-none backdrop-blur-sm"
              id={service.id}
              key={service.id}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-12 place-items-center rounded-control bg-on-primary/10 text-accent-300 ring-1 ring-on-primary/10">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                {service.comingSoon ? <Badge className="border-accent-400/30 bg-accent-400/10 text-accent-200 shadow-none">{content.comingSoon}</Badge> : null}
              </div>
              <h3 className={cn(typography.heading3, "mt-6 text-on-primary")}>{service.title}</h3>
              <p className={cn(typography.bodySmall, "mt-2.5 min-h-18 text-primary-100")}>
                {service.description}
              </p>
              {service.comingSoon ? (
                <Button className="mt-5 w-full border-on-primary/15 text-primary-300" disabled variant="outline">
                  {service.action}
                </Button>
              ) : (
                <Button as="a" className="mt-5 w-full border-on-primary/25 text-on-primary hover:bg-on-primary/10" href={service.href} variant="outline">
                  {service.action}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </Section>
  );
}
