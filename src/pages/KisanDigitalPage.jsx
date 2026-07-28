import { ArrowUpRight, CloudSun, Landmark, Newspaper, Sprout, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useSiteContent } from "../contexts/SiteContentContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { sanitizeHtml } from "../utils/sanitizeHtml";

const icons = { weather:CloudSun, mandi:TrendingUp, scheme:Landmark, icar:Sprout, article:Newspaper };
const labels = { weather:"Weather", mandi:"Mandi Prices", scheme:"Government Schemes", icar:"ICAR", article:"Articles" };

export default function KisanDigitalPage() {
  const {byType,loading}=useSiteContent(); const entries=byType("digital_content"); const [filter,setFilter]=useState("all");
  const visible=useMemo(()=>entries.filter((entry)=>filter==="all"||entry.content.contentType===filter),[entries,filter]);
  useDocumentTitle("Kisan Gaurav Digital");
  if(loading)return <div className="commerce-empty">Loading…</div>;
  return <div className="page-shell digital-cms"><section className="page-hero"><p className="eyebrow">Farmer-first knowledge</p><h1>Kisan Gaurav Digital</h1><p>Weather, markets, schemes and trusted agricultural knowledge in one place.</p></section><nav className="digital-cms__filters" aria-label="Digital content filters"><button className={filter==="all"?"is-active":""} onClick={()=>setFilter("all")} type="button">All</button>{Object.entries(labels).map(([id,label])=><button className={filter===id?"is-active":""} onClick={()=>setFilter(id)} type="button" key={id}>{label}</button>)}</nav><section className="digital-cms__grid">{visible.map((entry)=>{const Icon=icons[entry.content.contentType]||Newspaper;return <article key={entry.id}>{entry.content.image?<img src={entry.content.image} alt="" loading="lazy"/>:<Icon/>}<div><span>{labels[entry.content.contentType]||entry.content.contentType}</span><h2>{entry.title}</h2><p>{entry.excerpt}</p>{entry.content.body?<details><summary>Read more</summary><div dangerouslySetInnerHTML={{__html:sanitizeHtml(entry.content.body)}}/></details>:null}{entry.content.sourceUrl?<a href={entry.content.sourceUrl} target="_blank" rel="noreferrer">Official source <ArrowUpRight/></a>:null}</div></article>})}</section>{!visible.length?<div className="commerce-empty"><Sprout/><h2>Content is being prepared</h2></div>:null}</div>;
}
