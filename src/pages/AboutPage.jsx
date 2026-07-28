import { Sprout, Sun, Wheat } from "lucide-react";
import { useSiteContent } from "../contexts/SiteContentContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function AboutPage() {
  const { get, loading } = useSiteContent();
  const entry = get("page", "about"); const content = entry?.content || {};
  useDocumentTitle(entry?.title || "About", entry?.excerpt);
  if (loading) return <div className="commerce-empty">Loading…</div>;
  return <div className="page-shell">
    <section className="page-hero"><p className="eyebrow">{entry?.excerpt}</p><h1>{entry?.title}</h1><p>{content.story}</p></section>
    <section className="story-grid">
      {[["Mission",content.mission,Sprout],["Vision",content.vision,Sun],["Our Story",content.story,Wheat]].map(([title,copy,Icon],index)=><div className={`story-card${index===0?" story-card--dark":""}`} key={title}><Icon/><span>{String(index+1).padStart(2,"0")}</span><h2>{title}</h2><p>{copy}</p></div>)}
    </section>
    {content.founderMessage ? <section className="cms-prose"><h2>Founder&apos;s Message</h2><p>{content.founderMessage}</p></section> : null}
    {(content.timeline || []).length ? <section className="cms-timeline">{content.timeline.map((item)=><article key={`${item.year}-${item.title}`}><strong>{item.year}</strong><div><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</section> : null}
    {(content.images || []).length ? <section className="cms-gallery">{content.images.map((image)=><img src={image.url || image} alt={image.alt || ""} key={image.url || image}/>)}</section> : null}
  </div>;
}
