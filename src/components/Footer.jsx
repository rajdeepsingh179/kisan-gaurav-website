import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import BrandLogo from "./brand/BrandLogo";
import { useSiteContent } from "../contexts/SiteContentContext";

export default function Footer() {
  const { get, menu } = useSiteContent();
  const footer = get("footer", "main")?.content || {};
  const quick = menu("footer_quick");
  const support = menu("footer_support");
  const policies = menu("footer_policies");
  return (
    <footer className="store-footer">
      <div className="store-footer__top">
        <div><BrandLogo showTagline /><p>{footer.description}</p></div>
        <div><h3>{footer.quickLinksTitle}</h3>{quick.map((item)=><Link key={item.id} to={item.url}>{item.label}</Link>)}</div>
        <div><h3>{footer.supportLinksTitle}</h3>{support.map((item)=><Link key={item.id} to={item.url}>{item.label}</Link>)}</div>
        <div><h3>{footer.newsletterTitle}</h3><p>{footer.newsletterText}</p>{(footer.socialLinks || []).map((item)=><a href={item.url} key={item.label}>{item.label} <ArrowUpRight size={14}/></a>)}</div>
      </div>
      <div className="store-footer__bottom"><span>{String(footer.copyright || "").replace("{year}", new Date().getFullYear())}</span><span>{policies.map((item)=><Link to={item.url} key={item.id}>{item.label}</Link>)}</span><span>{footer.bottomNote}</span></div>
    </footer>
  );
}
