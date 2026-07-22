import {
  ArrowUpRight,
  Bot,
  BookOpenCheck,
  CheckCircle2,
  CloudSun,
  Download,
  FileCheck2,
  Landmark,
  ScanSearch,
  Smartphone,
  Sparkles,
  UsersRound,
} from "lucide-react";

import Reveal from "../components/motion/Reveal";
import { Badge, Button, Card, Container, Section, SectionHeading } from "../components/ui";
import { kisanDigitalContent, kisanDigitalLinks } from "../data/kisanDigital";
import { typography } from "../design-system";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useLanguage from "../hooks/useLanguage";
import { cn } from "../utils/cn";

const featureIcons = {
  weather: CloudSun,
  mandi: Landmark,
  schemes: FileCheck2,
  icar: BookOpenCheck,
  doctor: ScanSearch,
  community: UsersRound,
};

function PlatformActions({ content, compact = false }) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", compact ? "justify-center" : "justify-start")}>
      <Button
        as="a"
        className="w-full sm:w-auto"
        href={kisanDigitalLinks.webApp}
        rel="noreferrer"
        size="lg"
        target="_blank"
      >
        {content.primaryAction}
        <ArrowUpRight aria-hidden="true" className="size-5" />
      </Button>
      <Button as="a" className="w-full sm:w-auto" href={kisanDigitalLinks.androidApp} size="lg" variant={compact ? "outline" : "secondary"}>
        <Download aria-hidden="true" className="size-5" />
        {content.secondaryAction}
      </Button>
    </div>
  );
}

export default function KisanDigitalPage() {
  const { language } = useLanguage();
  const content = kisanDigitalContent[language];
  useDocumentTitle(language === "hi" ? "किसान डिजिटल" : "Kisan Digital");

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-primary-900/10 bg-[radial-gradient(circle_at_85%_20%,var(--kg-accent-100),transparent_28%),linear-gradient(135deg,var(--kg-color-canvas),var(--kg-primary-50))]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-16 -z-10 size-80 rounded-full border-[3rem] border-primary-100/60" />
        <Container>
          <div className="grid min-h-[34rem] items-center gap-10 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
            <Reveal>
              <Badge><Sparkles aria-hidden="true" className="mr-1.5 size-3.5" />{content.hero.eyebrow}</Badge>
              <h1 className={cn(typography.display, "mt-6 max-w-4xl text-balance text-foreground")}>{content.hero.title}</h1>
              <p className={cn(typography.bodyLarge, "mt-6 max-w-2xl text-foreground-muted")}>{content.hero.description}</p>
              <div className="mt-8"><PlatformActions content={content.hero} /></div>
              <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-accent-800">
                <Smartphone aria-hidden="true" className="size-4" />{content.hero.comingSoon}
              </p>
            </Reveal>

            <Reveal className="hidden lg:block" delay={0.12}>
              <Card className="relative mx-auto max-w-md overflow-hidden border-primary-200 bg-primary-950 text-on-primary" elevated padding="lg">
                <div aria-hidden="true" className="absolute -right-16 -top-16 size-48 rounded-full bg-accent-500/20 blur-2xl" />
                <div className="relative grid gap-4 sm:grid-cols-2">
                  {content.features.items.slice(0, 4).map((feature) => {
                    const Icon = featureIcons[feature.icon];
                    return (
                      <div className="rounded-card border border-white/10 bg-white/5 p-4" key={feature.id}>
                        <Icon aria-hidden="true" className="size-6 text-accent-300" />
                        <p className="mt-4 text-sm font-bold">{feature.name}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="relative mt-4 flex items-center gap-3 rounded-card bg-accent-500 p-4 text-accent-950">
                  <Bot aria-hidden="true" className="size-6" />
                  <span className="text-sm font-bold">Mobile-first • PWA-ready • Farmer-focused</span>
                </div>
              </Card>
            </Reveal>
          </div>
        </Container>
      </section>

      <Section>
        <SectionHeading align="center" description={content.features.description} eyebrow={content.features.eyebrow} title={content.features.title} />
        <div className="mt-10 grid min-w-0 gap-5 md:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {content.features.items.map((feature, index) => {
            const Icon = featureIcons[feature.icon];
            return (
              <Reveal className="h-full" delay={Math.min(index * 0.04, 0.16)} key={feature.id}>
                <Card className="h-full border-primary-100 transition duration-300 hover:-translate-y-1 hover:border-primary-300 hover:shadow-lifted" padding="lg">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-control bg-primary-700 text-on-primary shadow-soft"><Icon aria-hidden="true" className="size-6" /></span>
                    {feature.status ? <Badge className="px-2.5 py-1 text-[0.65rem]">{feature.status}</Badge> : null}
                  </div>
                  <h2 className={cn(typography.heading3, "mt-6 text-foreground")}>{feature.name}</h2>
                  <p className={cn(typography.bodySmall, "mt-3 text-foreground-muted")}>{feature.description}</p>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <Section tone="primary">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <Reveal>
            <p className={cn(typography.eyebrow, "text-accent-300")}>{content.benefits.eyebrow}</p>
            <h2 className={cn(typography.heading2, "mt-4 max-w-xl text-on-primary")}>{content.benefits.title}</h2>
            <p className={cn(typography.body, "mt-5 max-w-xl text-primary-100")}>{content.benefits.description}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid gap-3 sm:grid-cols-2">
              {content.benefits.items.map((benefit) => (
                <div className="flex min-h-16 items-center gap-3 rounded-card border border-white/10 bg-white/5 px-4 py-3" key={benefit}>
                  <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-accent-300" />
                  <span className="text-sm font-semibold text-on-primary">{benefit}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </Section>

      <Section className="scroll-mt-24" id="android-app">
        <Reveal>
          <Card className="overflow-hidden border-accent-200 bg-[linear-gradient(135deg,var(--kg-accent-50),var(--kg-primary-50))] text-center" elevated padding="lg">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-700 text-on-primary shadow-card"><Smartphone aria-hidden="true" className="size-7" /></span>
            <h2 className={cn(typography.heading2, "mx-auto mt-6 max-w-3xl text-balance text-foreground")}>{content.cta.title}</h2>
            <p className={cn(typography.body, "mx-auto mt-4 max-w-2xl text-foreground-muted")}>{content.cta.description}</p>
            <div className="mt-8"><PlatformActions compact content={content.cta} /></div>
          </Card>
        </Reveal>
      </Section>
    </>
  );
}
