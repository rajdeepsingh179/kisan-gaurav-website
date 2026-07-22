import { ArrowDown, PackageSearch, Sparkles } from "lucide-react";

import CatalogControls from "../components/products/CatalogControls";
import ProductCard from "../components/products/ProductCard";
import { Badge, Button, Container, Section, SectionHeading } from "../components/ui";
import { productsPageContent } from "../data/productsPage";
import { typography } from "../design-system";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useLanguage from "../hooks/useLanguage";
import useProducts from "../hooks/useProducts";
import { cn } from "../utils/cn";

export default function ProductsPage() {
  const { language } = useLanguage();
  const { filteredProducts, products, resetFilters } = useProducts();
  const content = productsPageContent[language];
  useDocumentTitle(language === "hi" ? "उत्पाद" : "Products");

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-border bg-[linear-gradient(135deg,var(--kg-color-canvas)_0%,var(--kg-primary-50)_62%,var(--kg-accent-50)_130%)]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-40 -z-10 size-[30rem] rounded-full border-[4rem] border-primary-100/70" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 left-[8%] -z-10 size-72 rounded-full bg-accent-100/70 blur-3xl" />
        <Container>
          <div className="mx-auto max-w-4xl py-14 text-center sm:py-20 lg:py-24">
            <Badge><Sparkles aria-hidden="true" className="mr-1.5 inline size-3.5" />{content.eyebrow}</Badge>
            <h1 className={cn(typography.heading1, "mt-6 text-balance text-foreground lg:text-6xl")}>{content.title}</h1>
            <p className={cn(typography.bodyLarge, "mx-auto mt-5 max-w-2xl text-foreground-muted")}>{content.description}</p>
            <Button as="a" className="mt-8 min-h-12 px-6" href="#catalog" size="lg">
              {content.primaryAction}<ArrowDown aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </Container>
      </section>

      <Section className="scroll-mt-24" id="catalog">
        <SectionHeading description={content.collectionDescription} eyebrow={content.collectionEyebrow} title={content.collectionTitle} />
        <CatalogControls />

        <div aria-live="polite" className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-foreground-muted">
            Showing {filteredProducts.length} of {products.length} products
          </p>
        </div>

        {filteredProducts.length ? (
          <div className="mt-6 grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <div className="h-full min-w-0" key={product.id}><ProductCard product={product} /></div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-card border border-dashed border-primary-200 bg-primary-50/60 px-5 py-14 text-center">
            <PackageSearch aria-hidden="true" className="mx-auto size-10 text-primary-600" />
            <h2 className={cn(typography.heading3, "mt-4")}>No products match these filters</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-foreground-muted">Try another search or clear the current filters to see the full collection.</p>
            <Button className="mt-5" onClick={resetFilters} variant="secondary">Clear filters</Button>
          </div>
        )}
      </Section>
    </>
  );
}
