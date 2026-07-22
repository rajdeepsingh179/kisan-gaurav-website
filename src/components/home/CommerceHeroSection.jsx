import { ArrowRight, CheckCircle2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

import { homeCommerceContent } from "../../data/homeCommerce";
import { productImages } from "../../data/productsPage";
import { typography } from "../../design-system";
import useLanguage from "../../hooks/useLanguage";
import { cn } from "../../utils/cn";
import { Badge, Button, Container } from "../ui";

export default function CommerceHeroSection() {
  const { language } = useLanguage();
  const content = homeCommerceContent[language].hero;

  return (
    <section className="relative isolate overflow-hidden border-b border-primary-100 bg-[linear-gradient(135deg,var(--kg-color-canvas)_0%,var(--kg-primary-50)_58%,var(--kg-accent-50)_125%)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-48 -z-10 size-[34rem] rounded-full border-[5rem] border-primary-100/65"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-8rem] left-[6%] -z-10 size-72 rounded-full bg-accent-100/70 blur-3xl"
      />

      <Container>
        <div className="grid items-center gap-12 py-14 sm:py-18 lg:min-h-[44rem] lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:py-20">
          <div className="min-w-0">
            <Badge>{content.eyebrow}</Badge>
            <h1 className={cn(typography.display, "mt-6 max-w-3xl text-balance text-foreground")}>
              {content.title}
            </h1>
            <p className={cn(typography.bodyLarge, "mt-6 max-w-2xl text-foreground-muted")}>
              {content.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button as={Link} size="lg" to="/products">
                <ShoppingBag aria-hidden="true" className="size-4" />
                {content.primaryAction}
              </Button>
              <Button as="a" href="#agriculture" size="lg" variant="secondary">
                {content.secondaryAction}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 border-t border-primary-900/10 pt-5 text-sm font-semibold text-foreground-muted">
              {content.highlights.map((item) => (
                <span className="inline-flex items-center gap-2" key={item}>
                  <CheckCircle2 aria-hidden="true" className="size-4 text-primary-700" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[40rem]" aria-label="Kisan Gaurav premium food collection">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-primary-100/60 blur-3xl" />
            <div className="grid grid-cols-[1.25fr_0.75fr] gap-3 sm:gap-4">
              <div className="overflow-hidden rounded-[1.75rem] border border-primary-100 bg-surface shadow-lifted">
                <img
                  alt="Premium Kisan Gaurav makhana"
                  className="h-full min-h-80 w-full object-cover sm:min-h-[34rem]"
                  decoding="async"
                  fetchPriority="high"
                  height="900"
                  sizes="(min-width: 1024px) 38vw, 62vw"
                  src={productImages.makhana.large}
                  srcSet={`${productImages.makhana.small} ${productImages.makhana.smallWidth}w, ${productImages.makhana.large} ${productImages.makhana.largeWidth}w`}
                  width="900"
                />
              </div>
              <div className="grid gap-3 sm:gap-4">
                <div className="overflow-hidden rounded-[1.5rem] border border-primary-100 bg-surface shadow-card">
                  <img
                    alt="Premium whole almonds"
                    className="h-full w-full object-cover"
                    decoding="async"
                    height="900"
                    loading="lazy"
                    sizes="(min-width: 1024px) 18vw, 30vw"
                    src={productImages.almonds.small}
                    srcSet={`${productImages.almonds.small} ${productImages.almonds.smallWidth}w, ${productImages.almonds.large} ${productImages.almonds.largeWidth}w`}
                    width="900"
                  />
                </div>
                <div className="overflow-hidden rounded-[1.5rem] border border-primary-100 bg-surface shadow-card">
                  <img
                    alt="Premium mixed dry fruits"
                    className="h-full w-full object-cover"
                    decoding="async"
                    height="900"
                    loading="lazy"
                    sizes="(min-width: 1024px) 18vw, 30vw"
                    src={productImages.premiumMix.small}
                    srcSet={`${productImages.premiumMix.small} ${productImages.premiumMix.smallWidth}w, ${productImages.premiumMix.large} ${productImages.premiumMix.largeWidth}w`}
                    width="900"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
