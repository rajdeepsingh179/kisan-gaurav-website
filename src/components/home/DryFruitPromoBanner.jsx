import { ArrowRight, Nut, Sparkles } from "lucide-react";
import { m } from "framer-motion";
import { Link } from "react-router-dom";

import { productsPageContent } from "../../data/productsPage";
import { motion } from "../../design-system";
import useLanguage from "../../hooks/useLanguage";
import { Button, Container } from "../ui";

export default function DryFruitPromoBanner({ isAuthenticated = false }) {
  const { language } = useLanguage();
  const content = productsPageContent[language].promotion;

  if (isAuthenticated) return null;

  return (
    <aside className="relative overflow-hidden border-b border-primary-800 bg-primary-950 text-on-primary">
      <div
        className="pointer-events-none absolute -right-16 -top-28 size-72 rounded-full border-[3rem] border-on-primary/5"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-[35%] top-0 h-full w-72 bg-accent-400/10 blur-3xl"
        aria-hidden="true"
      />
      <Container>
        <m.div
          className="relative flex flex-col gap-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motion.revealDuration, ease: motion.easing }}
        >
          <div className="flex items-start gap-4 sm:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-control bg-accent-500 text-accent-950 shadow-card">
              <Nut aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent-300">
                <Sparkles aria-hidden="true" className="size-3.5" />
                {content.eyebrow}
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] sm:text-xl">
                {content.title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-primary-100">
                {content.description}
              </p>
            </div>
          </div>

          <Button as={Link} className="w-full shrink-0 sm:w-auto" to="/products" variant="accent">
            {content.action}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        </m.div>
      </Container>
    </aside>
  );
}
