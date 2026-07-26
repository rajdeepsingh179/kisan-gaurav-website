import { Sprout, Sun, Wheat } from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function AboutPage() {
  useDocumentTitle("About");
  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Rooted in the land</p>
        <h1>Food with provenance.<br /><em>Goodness with purpose.</em></h1>
        <p>Kisan Gaurav celebrates the care behind India’s harvests by bringing thoughtfully selected pantry essentials to modern homes.</p>
      </section>
      <section className="story-grid">
        <div className="story-card story-card--dark"><Sprout /><span>01</span><h2>From source</h2><p>We value ingredients for what they are: honest, nourishing and shaped by the people and places that grow them.</p></div>
        <div className="story-card"><Sun /><span>02</span><h2>Handled with care</h2><p>Our range is selected to honour natural flavour, texture and the everyday rituals in which good food belongs.</p></div>
        <div className="story-card"><Wheat /><span>03</span><h2>Shared with pride</h2><p>Our signature tractor is a quiet salute to the farmers at the beginning of every food story.</p></div>
      </section>
    </div>
  );
}
