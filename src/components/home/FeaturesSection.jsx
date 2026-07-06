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
  return (
    <Section className="scroll-mt-20" id="features" tone="muted">
      <Reveal>
        <SectionHeading
          eyebrow="Everyday farmer tools"
          title="From the crop to the mandi, useful information stays close"
          description="Kisan Gaurav organises essential farming information around the decisions Indian farmers make through the season."
        />
      </Reveal>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {homePageContent.features.map((feature, index) => {
          const Icon = featureIcons[feature.icon];

          return (
            <Reveal delay={index * motion.stagger} key={feature.title}>
              <Card className="h-full transition duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lifted">
                <span className="grid size-11 place-items-center rounded-control bg-primary-100 text-primary-800">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3
                  className={cn(
                    typography.heading3,
                    "mt-5 text-foreground",
                  )}
                >
                  {feature.title}
                </h3>
                <p className={cn(typography.bodySmall, "mt-2 text-foreground-muted")}>
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
