import { Mail, MapPin, Phone } from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function ContactPage() {
  useDocumentTitle("Contact");
  return (
    <div className="page-shell">
      <section className="contact-layout">
        <div>
          <p className="eyebrow">We’d love to hear from you</p>
          <h1>Let’s begin a<br /><em>good conversation.</em></h1>
          <p>For retail enquiries, gifting conversations, partnerships or help with the range, reach out to the Kisan Gaurav team.</p>
        </div>
        <div className="contact-panel">
          <a href="mailto:hello@kisangauraav.com"><Mail /> <span><small>Email</small>hello@kisangauraav.com</span></a>
          <a href="tel:+919876543210"><Phone /> <span><small>Call</small>+91 98765 43210</span></a>
          <div><MapPin /> <span><small>Based in</small>India</span></div>
          <p>Business hours · Monday to Saturday · 10:00–18:00 IST</p>
        </div>
      </section>
    </div>
  );
}
