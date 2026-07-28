import { Navigate, useParams } from "react-router-dom";
import { useSiteContent } from "../contexts/SiteContentContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { sanitizeHtml } from "../utils/sanitizeHtml";

export default function LegalPage() {
  const { slug }=useParams(); const { get,loading }=useSiteContent(); const entry=get("legal",slug);
  useDocumentTitle(entry?.title||"Policy",entry?.excerpt);
  if(loading)return <div className="commerce-empty">Loading…</div>;
  if(!entry)return <Navigate replace to="/" />;
  return <div className="page-shell"><section className="page-hero page-hero--compact"><p className="eyebrow">Legal</p><h1>{entry.title}</h1><p>{entry.excerpt}</p></section><article className="cms-prose" dangerouslySetInnerHTML={{__html:sanitizeHtml(entry.content.body)}}/></div>;
}
