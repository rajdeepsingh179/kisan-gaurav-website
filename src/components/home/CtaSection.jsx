import { ArrowRight, Smartphone } from "lucide-react";
import { homePageContent } from "../../data/homePage";
import { typography } from "../../design-system";
import useLanguage from "../../hooks/useLanguage";
import { cn } from "../../utils/cn";
import Reveal from "../motion/Reveal";
import { Button, Section } from "../ui";

export default function CtaSection() {
  const { language } = useLanguage();
  const content = homePageContent[language].cta;

  return (
    <Section className="scroll-mt-20" id="app" tone="muted">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-primary-800 px-6 py-12 text-on-primary shadow-lifted sm:px-10 sm:py-16 lg:px-16">
          <div
            className="absolute -right-20 -top-32 size-80 rounded-full border-[56px] border-on-primary/5"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <span className="grid size-12 place-items-center rounded-control bg-on-primary/10">
              <Smartphone aria-hidden="true" className="size-6" />
            </span>
            <h2 className={cn(typography.heading1, "mt-7")}>
              {content.title}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-primary-100 sm:text-lg">
              {content.description}
            </p>
            <Button
              as="a"
              className="mt-8 bg-surface text-primary-900 hover:bg-primary-50"
              href="#features"
              size="lg"
            >
              {content.action}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
