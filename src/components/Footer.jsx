import { ArrowUpRight, Camera, Mail } from "lucide-react";
import { Link } from "react-router-dom";

import BrandLogo from "./brand/BrandLogo";

export default function Footer() {
  return (
    <footer className="store-footer">
      <div className="store-footer__top">
        <div><BrandLogo showTagline /><p>Premium dry fruits, mindful snacking and thoughtful gifts—rooted in the pride of India’s harvests.</p></div>
        <div><h3>Explore</h3><Link to="/shop">Shop all</Link><Link to="/categories">Categories</Link><Link to="/categories#gifts">Gift packs</Link><Link to="/kisan-digital">Kisan Gaurav Digital</Link></div>
        <div><h3>Company</h3><Link to="/about">Our story</Link><Link to="/contact">Contact</Link><Link to="/contact">Retail enquiries</Link><Link to="/contact">Corporate gifting</Link></div>
        <div><h3>Stay close</h3><p>New collections, nourishing ideas and gifting notes.</p><a href="mailto:hello@kisangauraav.com"><Mail size={16} /> hello@kisangauraav.com</a><span><Camera size={16} /> Instagram <ArrowUpRight size={14} /></span></div>
      </div>
      <div className="store-footer__bottom"><span>© {new Date().getFullYear()} Kisan Gaurav. All rights reserved.</span><span>Made with respect for the source.</span></div>
    </footer>
  );
}
