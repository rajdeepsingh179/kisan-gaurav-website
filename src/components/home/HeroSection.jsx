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
    <section className="relative isolate overflow-hidden bg-canvas">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_75%_15%,var(--kg-secondary-100),transparent_42%)]"
        aria-hidden="true"
      />
      <Container>
        <div className="grid min-h-[calc(100svh-4rem)] items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <m.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: motion.heroDuration,
              ease: motion.easing,
            }}
          >
            <Badge>{hero.eyebrow}</Badge>
            <h1
              className={cn(
                typography.display,
                "mt-6 max-w-3xl text-foreground",
              )}
            >
              {hero.title}
            </h1>
            <p
              className={cn(
                typography.bodyLarge,
                "mt-6 max-w-2xl text-foreground-muted",
              )}
            >
              {hero.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button as="a" href="#features" size="lg">
                {hero.primaryAction}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
              <Button as={Link} size="lg" to="/#about" variant="secondary">
                {hero.secondaryAction}
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-foreground-muted">
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
            className="relative mx-auto w-full max-w-xl"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.75,
              delay: 0.12,
              ease: motion.easing,
            }}
            aria-hidden="true"
          >
            <div className="absolute -inset-5 -z-10 rounded-[2.25rem] bg-primary-100/70 blur-2xl" />
            <div className="overflow-hidden rounded-[2rem] border border-primary-200 bg-primary-950 p-5 shadow-lifted sm:p-7">
              <div className="flex items-center justify-between text-on-primary">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <Sprout className="size-5 text-primary-300" />
                  {hero.visual.overview}
                </span>
                <span className="rounded-full bg-on-primary/10 px-3 py-1 text-xs text-primary-100">
                  {hero.visual.today}
                </span>
              </div>

              <div className="mt-7 rounded-card bg-surface p-5 shadow-card sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-700">
                      {hero.visual.cropHealth}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {hero.visual.healthStatus}
                    </p>
                  </div>
                  <span className="grid size-11 place-items-center rounded-full bg-secondary-100 text-secondary-800">
                    <Leaf className="size-5" />
                  </span>
                </div>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-primary-100">
                  <div className="h-full w-[82%] rounded-full bg-primary-600" />
                </div>
                <div className="mt-3 flex justify-between text-xs text-foreground-muted">
                  <span>{hero.visual.readiness}</span>
                  <span>82%</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-card border border-on-primary/10 bg-on-primary/10 p-4 text-on-primary">
                  <p className="text-xs text-primary-200">
                    {hero.visual.nextAction}
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {hero.visual.irrigation}
                  </p>
                </div>
                <div className="rounded-card border border-on-primary/10 bg-on-primary/10 p-4 text-on-primary">
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
