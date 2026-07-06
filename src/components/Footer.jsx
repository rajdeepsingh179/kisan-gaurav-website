import { Link } from "react-router-dom";

import { commonContent } from "../data/commonContent";
import { BRAND } from "../design-system";
import useLanguage from "../hooks/useLanguage";
import BrandLogo from "./brand/BrandLogo";
import { Container } from "./ui";

const socialPlaceholders = ["LinkedIn", "Instagram", "Facebook"];

export default function Footer() {
  const { language } = useLanguage();
  const content = commonContent[language].footer;
  const legalLinks = [
    { label: content.privacy, to: "/privacy" },
    { label: content.terms, to: "/terms" },
  ];

  return (
    <footer className="border-t border-border bg-surface-muted">
      <Container>
        <div className="flex flex-col gap-5 border-b border-border py-8 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo showTagline />
          <p className="max-w-md text-sm leading-6 text-foreground-muted sm:text-right">
            {content.description}
          </p>
        </div>
        <div className="flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground-muted">
            © {new Date().getFullYear()} {BRAND.name}. {content.rights}
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <nav
              className="flex items-center gap-4"
              aria-label={content.legalLabel}
            >
              {legalLinks.map((link) => (
                <Link
                  className="text-sm text-foreground-muted transition-colors hover:text-foreground"
                  key={link.to}
                  to={link.to}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />

            <div
              className="flex items-center gap-3"
              aria-label={content.socialLabel}
            >
              {socialPlaceholders.map((social) => (
                <span
                  className="text-sm text-foreground-muted"
                  key={social}
                >
                  {social}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
