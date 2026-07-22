import { ArrowDown, Sparkles } from "lucide-react";

import ProductCard from "../components/products/ProductCard";
import { Badge, Button, Container, Section, SectionHeading } from "../components/ui";
import { productsPageContent } from "../data/productsPage";
import { typography } from "../design-system";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useLanguage from "../hooks/useLanguage";
import { cn } from "../utils/cn";

export default function ProductsPage() {
  const { language } = useLanguage();
  const content = productsPageContent[language];
  useDocumentTitle(language === "hi" ? "उत्पाद" : "Products");

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-border bg-[linear-gradient(135deg,var(--kg-color-canvas)_0%,var(--kg-primary-50)_62%,var(--kg-accent-50)_130%)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-40 -z-10 size-[30rem] rounded-full border-[4rem] border-primary-100/70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 left-[8%] -z-10 size-72 rounded-full bg-accent-100/70 blur-3xl"
        />

        <Container>
          <div className="mx-auto max-w-4xl py-16 text-center sm:py-20 lg:py-28">
            <Badge>
              <Sparkles aria-hidden="true" className="mr-1.5 inline size-3.5" />
              {content.eyebrow}
            </Badge>
            <h1 className={cn(typography.heading1, "mt-7 text-balance text-foreground lg:text-6xl")}>
              {content.title}
            </h1>
            <p className={cn(typography.bodyLarge, "mx-auto mt-6 max-w-2xl text-foreground-muted")}>
              {content.description}
            </p>
            <Button
              as="a"
              className="mt-8 min-h-12 px-6"
              href="#products"
              size="lg"
            >
              {content.primaryAction}
              <ArrowDown aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </Container>
      </section>

      <Section id="products">
        <div>
          <SectionHeading
            align="center"
            description={content.collectionDescription}
            eyebrow={content.collectionEyebrow}
            title={content.collectionTitle}
          />
        </div>

        <div className="mt-10 grid min-w-0 grid-cols-1 gap-6 md:mt-14 md:grid-cols-2 lg:grid-cols-4">
          {content.products.map((product) => (
            <div className="h-full min-w-0" key={product.name}>
              <ProductCard product={product} statusLabel={content.statusLabel} />
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
