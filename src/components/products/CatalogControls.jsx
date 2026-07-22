import { Search, SlidersHorizontal, X } from "lucide-react";

import { productBadgeNames } from "../../data/commerce";
import useProducts from "../../hooks/useProducts";
import { Button, Card } from "../ui";

const selectClassName =
  "min-h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

export default function CatalogControls() {
  const { categories, filters, resetFilters, setFilter } = useProducts();
  const hasFilters =
    filters.search || filters.categoryId !== "all" || filters.badge !== "all" || filters.stockOnly;

  return (
    <Card className="mt-10 md:mt-12" padding="sm">
      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
        <SlidersHorizontal aria-hidden="true" className="size-4 text-primary-700" />
        Find your product
      </div>
      <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1.4fr)_repeat(3,minmax(10rem,0.8fr))]">
        <label className="relative block min-w-0">
          <span className="sr-only">Search products</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground-muted" />
          <input
            className="min-h-11 w-full rounded-control border border-border bg-surface py-2 pl-10 pr-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            onChange={(event) => setFilter("search", event.target.value)}
            placeholder="Search makhana, almonds, gifts…"
            type="search"
            value={filters.search}
          />
        </label>

        <label>
          <span className="sr-only">Filter by category</span>
          <select className={selectClassName} onChange={(event) => setFilter("categoryId", event.target.value)} value={filters.categoryId}>
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by product badge</span>
          <select className={selectClassName} onChange={(event) => setFilter("badge", event.target.value)} value={filters.badge}>
            <option value="all">All badges</option>
            {productBadgeNames.map((badge) => <option key={badge} value={badge}>{badge}</option>)}
          </select>
        </label>

        <label>
          <span className="sr-only">Sort products</span>
          <select className={selectClassName} onChange={(event) => setFilter("sort", event.target.value)} value={filters.sort}>
            <option value="featured">Featured first</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-foreground-muted">
          <input
            checked={filters.stockOnly}
            className="size-5 accent-primary-700"
            onChange={(event) => setFilter("stockOnly", event.target.checked)}
            type="checkbox"
          />
          Show in-stock products only
        </label>
        {hasFilters ? (
          <Button onClick={resetFilters} size="sm" variant="ghost">
            <X aria-hidden="true" className="size-4" />
            Clear filters
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
