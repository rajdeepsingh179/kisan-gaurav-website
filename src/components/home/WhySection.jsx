import { Check, Quote, ShieldCheck } from "lucide-react";

import { homePageContent } from "../../data/homePage";
import { motion, typography } from "../../design-system";
import { cn } from "../../utils/cn";
import Reveal from "../motion/Reveal";
import { Card, Section, SectionHeading } from "../ui";

export default function WhySection() {
  return (
    <Section className="scroll-mt-20" id="about">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <Reveal>
            <SectionHeading
              eyebrow="Why Kisan Gaurav"
              title="Grounded in the realities of Indian farming"
              description="Kisan Gaurav begins with the crop cycle, local decisions, and the knowledge farmers already carry."
            />
          </Reveal>

          <div className="mt-9 space-y-7">
            {homePageContent.reasons.map((reason, index) => (
              <Reveal delay={index * motion.stagger} key={reason.title}>
                <div className="flex gap-4">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary-100 text-primary-800">
                    <Check aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <h3 className={cn(typography.label, "text-foreground")}>
                      {reason.title}
                    </h3>
                    <p className={cn(typography.bodySmall, "mt-1.5 text-foreground-muted")}>
                      {reason.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal>
          <Card
            className="relative overflow-hidden border-earth-200 bg-earth-50"
            elevated
            padding="lg"
          >
            <div
              className="absolute -right-16 -top-16 size-48 rounded-full bg-secondary-200/60 blur-3xl"
              aria-hidden="true"
            />
            <Quote
              aria-hidden="true"
              className="relative size-9 text-earth-700"
              strokeWidth={1.5}
            />
            <blockquote className="relative mt-8 text-2xl font-semibold leading-9 tracking-tight text-foreground sm:text-3xl sm:leading-10">
              Good farm technology respects a farmer&apos;s experience and makes
              the next decision clearer.
            </blockquote>
            <div className="relative mt-9 flex items-center gap-3 border-t border-earth-200 pt-6">
              <span className="grid size-11 place-items-center rounded-full bg-primary-800 text-on-primary">
                <ShieldCheck aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Farmer-first principle
                </p>
                <p className="text-sm text-foreground-muted">
                  Practical value before technical complexity
                </p>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </Section>
  );
}
