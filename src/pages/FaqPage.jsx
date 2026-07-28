import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useSiteContent } from "../contexts/SiteContentContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function FaqPage() {
  const { byType, loading } = useSiteContent(); const faqs = byType("faq"); const [open,setOpen]=useState(null);
  useDocumentTitle("Frequently Asked Questions");
  if(loading)return <div className="commerce-empty">Loading…</div>;
  return <div className="page-shell"><section className="page-hero page-hero--compact"><p className="eyebrow">Help centre</p><h1>Frequently Asked Questions</h1></section><section className="cms-faq-list">{faqs.map((entry)=><article key={entry.id}><button type="button" aria-expanded={open===entry.id} onClick={()=>setOpen((current)=>current===entry.id?null:entry.id)}><span>{entry.content.question||entry.title}</span><ChevronDown/></button>{open===entry.id?<p>{entry.content.answer}</p>:null}</article>)}</section></div>;
}
