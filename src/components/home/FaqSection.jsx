import { ChevronDown } from "lucide-react";

import { homePageContent } from "../../data/homePage";
import { motion, typography } from "../../design-system";
import useLanguage from "../../hooks/useLanguage";
import { cn } from "../../utils/cn";
import Reveal from "../motion/Reveal";
import { Section, SectionHeading } from "../ui";

export default function FaqSection() {
  const { language } = useLanguage();
  const content = homePageContent[language].faq;

  return (
    <Section>
      <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
        <Reveal>
          <SectionHeading
            eyebrow={content.eyebrow}
            title={content.title}
            description={content.description}
          />
        </Reveal>

        <div className="divide-y divide-border border-y border-border">
          {content.items.map((item, index) => (
            <Reveal delay={index * motion.stagger} key={item.question}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-semibold text-foreground marker:content-none">
                  {item.question}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 text-primary-700 transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <p
                  className={cn(
                    typography.bodySmall,
                    "max-w-2xl pb-6 pr-10 text-foreground-muted",
                  )}
                >
                  {item.answer}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
