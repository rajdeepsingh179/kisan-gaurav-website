import { homePageContent } from "../../data/homePage";
import { motion, typography } from "../../design-system";
import useLanguage from "../../hooks/useLanguage";
import { cn } from "../../utils/cn";
import Reveal from "../motion/Reveal";
import { Section } from "../ui";

export default function StatisticsSection() {
  const { language } = useLanguage();
  const content = homePageContent[language].statistics;

  return (
    <Section tone="primary">
      <Reveal>
        <div className="max-w-2xl">
          <p className={cn(typography.eyebrow, "text-primary-300")}>
            {content.eyebrow}
          </p>
          <h2 className={cn(typography.heading2, "mt-3")}>
            {content.title}
          </h2>
        </div>
      </Reveal>

      <dl className="mt-12 grid gap-px overflow-hidden rounded-card border border-on-primary/10 bg-on-primary/10 sm:grid-cols-2 lg:grid-cols-4">
        {content.items.map((stat, index) => (
          <Reveal
            className="h-full bg-primary-950 p-6 sm:p-8"
            delay={index * motion.stagger}
            key={stat.label}
          >
            <dt className="text-sm leading-6 text-primary-200">{stat.label}</dt>
            <dd className="order-first mb-3 text-4xl font-semibold tracking-tight text-on-primary">
              {stat.value}
            </dd>
          </Reveal>
        ))}
      </dl>
    </Section>
  );
}
