import { Leaf } from "lucide-react";

import { Card } from "../ui";
import { typography } from "../../design-system";
import { cn } from "../../utils/cn";

export default function ProductCard({ product, statusLabel }) {
  return (
    <Card
      as="article"
      className="group flex h-full min-w-0 flex-col overflow-hidden transition duration-300 ease-out hover:-translate-y-1 hover:border-primary-200 hover:shadow-lifted"
      padding="none"
    >
      <div className="aspect-square overflow-hidden bg-primary-50">
        <img
          alt={product.imageAlt}
          className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
          decoding="async"
          height="900"
          loading="lazy"
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
          src={product.image.large}
          srcSet={`${product.image.small} 480w, ${product.image.large} 900w`}
          width="900"
        />
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-primary-50 px-3 text-xs font-bold uppercase tracking-[0.12em] text-primary-700">
            <Leaf aria-hidden="true" className="size-3.5" />
            {product.tag}
          </span>
          <span className="text-xs font-semibold text-foreground-muted">
            {product.weight}
          </span>
        </div>

        <h3 className={cn(typography.heading3, "mt-5 text-foreground")}>
          {product.name}
        </h3>
        <p className={cn(typography.bodySmall, "mt-2.5 flex-1 text-foreground-muted")}>
          {product.description}
        </p>
        <p className="mt-5 border-t border-border pt-4 text-sm font-semibold text-primary-700">
          {statusLabel}
        </p>
      </div>
    </Card>
  );
}
