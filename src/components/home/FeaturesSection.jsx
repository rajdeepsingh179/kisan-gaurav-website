import {
  CloudSun,
  Languages,
  Landmark,
  ScanSearch,
  Store,
  Users,
} from "lucide-react";

import { homePageContent } from "../../data/homePage";
import { motion, typography } from "../../design-system";
import useLanguage from "../../hooks/useLanguage";
import { cn } from "../../utils/cn";
import Reveal from "../motion/Reveal";
import { Card, Section, SectionHeading } from "../ui";

const featureIcons = {
  scan: ScanSearch,
  market: Store,
  weather: CloudSun,
  community: Users,
  schemes: Landmark,
  language: Languages,
};

export default function FeaturesSection() {
  const { language } = useLanguage();
  const content = homePageContent[language].features;

  return (
    <Section className="scroll-mt-20" id="features" tone="muted">
      <Reveal>
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
        />
      </Reveal>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {content.items.map((feature, index) => {
          const Icon = featureIcons[feature.icon];

          return (
            <Reveal delay={index * motion.stagger} key={feature.title}>
              <Card className="group h-full overflow-hidden transition duration-300 ease-out hover:-translate-y-1.5 hover:border-primary-200 hover:shadow-lifted">
                <span className="grid size-12 place-items-center rounded-control bg-primary-50 text-primary-700 ring-1 ring-primary-100 transition duration-300 group-hover:scale-105 group-hover:bg-primary-700 group-hover:text-on-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3
                  className={cn(
                    typography.heading3,
                    "mt-6 text-foreground",
                  )}
                >
                  {feature.title}
                </h3>
                <p className={cn(typography.bodySmall, "mt-2.5 text-foreground-muted")}>
                  {feature.description}
                </p>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
