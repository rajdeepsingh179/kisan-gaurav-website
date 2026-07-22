import { ArrowRight, CheckCircle2, Leaf, Sprout } from "lucide-react";
import { m } from "framer-motion";
import { Link } from "react-router-dom";

import { homePageContent } from "../../data/homePage";
import { motion, typography } from "../../design-system";
import useLanguage from "../../hooks/useLanguage";
import { cn } from "../../utils/cn";
import { Badge, Button, Container } from "../ui";

export default function HeroSection() {
  const { language } = useLanguage();
  const { hero } = homePageContent[language];

  return (
    <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,var(--kg-color-canvas)_0%,var(--kg-primary-100)_58%,var(--kg-accent-100)_125%)]">
      <div
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_12%,var(--kg-secondary-200),transparent_38%),radial-gradient(circle_at_12%_78%,var(--kg-accent-200),transparent_30%)] opacity-75"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.28] [background-image:linear-gradient(var(--kg-primary-100)_1px,transparent_1px),linear-gradient(90deg,var(--kg-primary-100)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-48 bottom-[-18rem] -z-10 h-[34rem] w-[48rem] rotate-[-8deg] rounded-[50%] border-[5rem] border-primary-100/60"
        aria-hidden="true"
      />
      <Container>
        <div className="grid min-h-[calc(100svh-4.5rem)] items-center gap-16 py-18 lg:grid-cols-[1.02fr_0.98fr] lg:gap-20 lg:py-24 xl:gap-24">
          <m.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: motion.heroDuration,
              ease: motion.easing,
            }}
          >
            <Badge className="border-primary-200 bg-surface/75 backdrop-blur-sm">{hero.eyebrow}</Badge>
            <h1
              className={cn(
                typography.display,
                "mt-7 max-w-3xl text-foreground text-balance",
              )}
            >
              {hero.title}
            </h1>
            <p
              className={cn(
                typography.bodyLarge,
                "mt-7 max-w-2xl text-foreground-muted",
              )}
            >
              {hero.description}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button as="a" href="#features" size="lg">
                {hero.primaryAction}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
              <Button as={Link} size="lg" to="/#about" variant="secondary">
                {hero.secondaryAction}
              </Button>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-primary-900/10 pt-6 text-sm font-medium text-foreground-muted">
              {hero.highlights.map((item) => (
                <span className="inline-flex items-center gap-2" key={item}>
                  <CheckCircle2
                    aria-hidden="true"
                    className="size-4 text-primary-700"
                  />
                  {item}
                </span>
              ))}
            </div>
          </m.div>

          <m.div
            className="relative mx-auto w-full max-w-[36rem]"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.75,
              delay: 0.12,
              ease: motion.easing,
            }}
            aria-hidden="true"
          >
            <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-[linear-gradient(135deg,var(--kg-primary-100),var(--kg-accent-100))] opacity-80 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-primary-800/70 bg-[linear-gradient(145deg,var(--kg-primary-950),var(--kg-primary-800))] p-5 shadow-lifted sm:p-7">
              <div className="absolute -right-20 -top-24 size-64 rounded-full border-[2.5rem] border-on-primary/5" />
              <div className="flex items-center justify-between text-on-primary">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <Sprout className="size-5 text-primary-300" />
                  {hero.visual.overview}
                </span>
                <span className="rounded-full bg-on-primary/10 px-3 py-1 text-xs text-primary-100">
                  {hero.visual.today}
                </span>
              </div>

              <div className="relative mt-7 rounded-card border border-on-primary/20 bg-surface p-5 shadow-lifted sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-700">
                      {hero.visual.cropHealth}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {hero.visual.healthStatus}
                    </p>
                  </div>
                  <span className="grid size-11 place-items-center rounded-full bg-accent-100 text-accent-700">
                    <Leaf className="size-5" />
                  </span>
                </div>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-primary-100">
                  <div className="h-full w-[82%] rounded-full bg-[linear-gradient(90deg,var(--kg-primary-700),var(--kg-secondary-400))]" />
                </div>
                <div className="mt-3 flex justify-between text-xs text-foreground-muted">
                  <span>{hero.visual.readiness}</span>
                  <span>82%</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-card border border-on-primary/10 bg-on-primary/[0.08] p-4 text-on-primary backdrop-blur-sm">
                  <p className="text-xs text-primary-200">
                    {hero.visual.nextAction}
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {hero.visual.irrigation}
                  </p>
                </div>
                <div className="rounded-card border border-on-primary/10 bg-on-primary/[0.08] p-4 text-on-primary backdrop-blur-sm">
                  <p className="text-xs text-primary-200">
                    {hero.visual.mandiWatch}
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {hero.visual.mandiAction}
                  </p>
                </div>
              </div>
            </div>
          </m.div>
        </div>
      </Container>
    </section>
  );
}
