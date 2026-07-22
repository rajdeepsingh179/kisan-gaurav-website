import { ChevronDown } from "lucide-react";

import { homePageContent } from "../../data/homePage";
import { typography } from "../../design-system";
import useLanguage from "../../hooks/useLanguage";
import { cn } from "../../utils/cn";
import { Section, SectionHeading } from "../ui";

export default function FaqSection() {
  const { language } = useLanguage();
  const content = homePageContent[language].faq;

  return (
    <Section>
      <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
        <div>
          <SectionHeading
            eyebrow={content.eyebrow}
            title={content.title}
            description={content.description}
          />
        </div>

        <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface px-5 shadow-card sm:px-7">
          {content.items.map((item) => (
            <div key={item.question}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-semibold tracking-[-0.01em] text-foreground transition-colors marker:content-none hover:text-primary-700">
                  {item.question}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 rounded-full bg-primary-50 p-0.5 text-primary-700 transition-transform duration-200 group-open:rotate-180"
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
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
