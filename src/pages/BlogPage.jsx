import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteContent } from "../contexts/SiteContentContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function BlogPage() {
  const {byType,loading}=useSiteContent(); const articles=byType("blog");
  useDocumentTitle("Journal");
  if(loading)return <div className="commerce-empty">Loading…</div>;
  return <div className="page-shell"><section className="page-hero page-hero--compact"><p className="eyebrow">Kisan Gaurav Journal</p><h1>Stories from the source.</h1></section><section className="cms-blog-grid">{articles.map((article)=><article key={article.id}>{article.content.coverImage?<img src={article.content.coverImage} alt="" loading="lazy"/>:null}<div><small>{article.publish_at?new Date(article.publish_at).toLocaleDateString("en-IN"):""}</small><h2>{article.title}</h2><p>{article.excerpt}</p><Link to={`/blog/${article.slug}`}>Read article <ArrowRight/></Link></div></article>)}</section></div>;
}
