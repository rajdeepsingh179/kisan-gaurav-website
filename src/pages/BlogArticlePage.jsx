import { ArrowLeft } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useSiteContent } from "../contexts/SiteContentContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { sanitizeHtml } from "../utils/sanitizeHtml";

export default function BlogArticlePage() {
  const {slug}=useParams(); const {get,loading}=useSiteContent(); const article=get("blog",slug);
  useDocumentTitle(article?.seo?.metaTitle||article?.title||"Journal",article?.seo?.metaDescription||article?.excerpt);
  if(loading)return <div className="commerce-empty">Loading…</div>;
  if(!article)return <Navigate replace to="/blog"/>;
  return <div className="page-shell"><article className="cms-article"><Link to="/blog"><ArrowLeft/> Journal</Link><p className="eyebrow">{article.excerpt}</p><h1>{article.title}</h1>{article.content.coverImage?<img src={article.content.coverImage} alt=""/>:null}<div className="cms-prose" dangerouslySetInnerHTML={{__html:sanitizeHtml(article.content.body)}}/></article></div>;
}
