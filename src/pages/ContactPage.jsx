import { Mail, MapPin, Phone } from "lucide-react";
import { useSiteContent } from "../contexts/SiteContentContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function ContactPage() {
  const { get, loading } = useSiteContent();
  const entry = get("page","contact"); const content = entry?.content || {};
  useDocumentTitle(entry?.title || "Contact", entry?.excerpt);
  if (loading) return <div className="commerce-empty">Loading…</div>;
  return <div className="page-shell"><section className="contact-layout"><div><p className="eyebrow">{entry?.excerpt}</p><h1>{entry?.title}</h1><p>{content.introduction}</p></div><div className="contact-panel">
    {content.email ? <a href={`mailto:${content.email}`}><Mail/><span><small>Email</small>{content.email}</span></a> : null}
    {content.phone ? <a href={`tel:${String(content.phone).replace(/\s/g,"")}`}><Phone/><span><small>Call</small>{content.phone}</span></a> : null}
    {content.address ? <div><MapPin/><span><small>Address</small>{content.address}</span></div> : null}
    {(content.businessHours || []).map((item)=><p key={item.days}>{item.days} · {item.hours}</p>)}
    {content.googleMapUrl ? <iframe title="Kisan Gaurav location" src={content.googleMapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/> : null}
    {(content.socialLinks || []).map((item)=><a href={item.url} key={item.label}>{item.label}</a>)}
  </div></section></div>;
}
