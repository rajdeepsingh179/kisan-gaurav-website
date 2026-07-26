import { Gift, Leaf, PackageCheck, Search, ShieldCheck, Sparkles } from "lucide-react";

import useDocumentTitle from "../hooks/useDocumentTitle";

const features = [
  [Leaf, "Thoughtful sourcing", "Ingredients chosen for natural flavour, texture and everyday nourishment."],
  [ShieldCheck, "Quality selection", "Each collection is presented around clean taste and dependable pantry quality."],
  [PackageCheck, "Freshness considered", "Signature resealable packaging helps protect every crisp, delicate texture."],
  [Search, "Easy discovery", "Search by product or ingredient, then refine by category and preferred price."],
  [Gift, "Gifting with meaning", "Flexible gift sizes for celebrations, corporate moments and family occasions."],
  [Sparkles, "Premium presentation", "Quiet green, cream and gold design that feels at home in modern rituals."],
];

export default function FeaturesPage() {
  useDocumentTitle("Features");
  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">The Kisan Gaurav difference</p>
        <h1>A better way to discover<br /><em>everyday goodness.</em></h1>
        <p>Built around thoughtful products, clear information and beautiful, pressure-free browsing.</p>
      </section>
      <section className="features-grid">
        {features.map(([Icon, title, copy], index) => (
          <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><Icon /><h2>{title}</h2><p>{copy}</p></article>
        ))}
      </section>
    </div>
  );
}
