import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { homeCommerceContent } from "../../data/homeCommerce";
import { productsPageContent } from "../../data/productsPage";
import useLanguage from "../../hooks/useLanguage";
import ProductCard from "../products/ProductCard";
import { Button, Section, SectionHeading } from "../ui";

export default function FeaturedProductsSection() {
  const { language } = useLanguage();
  const content = homeCommerceContent[language].featured;
  const products = productsPageContent[language].products;

  return (
    <Section className="scroll-mt-24" id="featured-products">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          description={content.description}
          eyebrow={content.eyebrow}
          title={content.title}
        />
        <Button as={Link} className="w-full shrink-0 sm:w-auto" to="/products" variant="secondary">
          {content.action}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </div>

      <div className="mt-10 grid min-w-0 grid-cols-1 gap-6 md:mt-14 md:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            actionHref="/products"
            key={product.name}
            product={product}
            statusLabel={content.cardAction}
          />
        ))}
      </div>
    </Section>
  );
}
