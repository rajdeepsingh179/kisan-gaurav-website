import { useEffect, useId, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { commonContent } from "../data/commonContent";
import { navigationItems } from "../data/navigation";
import useLanguage from "../hooks/useLanguage";
import { cn } from "../utils/cn";
import BrandLogo from "./brand/BrandLogo";
import LanguageToggle from "./LanguageToggle";
import { SignInModal, SignUpModal } from "./auth";
import { Button, Container } from "./ui";

function navigationLinkClass({ isActive }) {
  return cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary-50 text-primary-800"
      : "text-foreground-muted hover:bg-surface-muted hover:text-foreground",
  );
}

function NavigationItem({ item, label, onClick }) {
  if (item.to.includes("#")) {
    return (
      <Link
        className="rounded-lg px-3 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        onClick={onClick}
        to={item.to}
      >
        {label}
      </Link>
    );
  }

  return (
    <NavLink
      className={navigationLinkClass}
      end={item.to === "/"}
      onClick={onClick}
      to={item.to}
    >
      {label}
    </NavLink>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [authModal, setAuthModal] = useState(null);
  const menuId = useId();
  const menuButtonRef = useRef(null);
  const { language } = useLanguage();
  const content = commonContent[language].navigation;

  const closeMenu = () => setIsOpen(false);
  const openAuthModal = (modal) => {
    closeMenu();
    setAuthModal(modal);
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-xl">
      <Container>
        <nav
          className="flex min-h-16 items-center justify-between gap-4"
          aria-label={content.primaryLabel}
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <Link
              className="inline-flex min-w-0 items-center gap-2.5 font-semibold tracking-tight text-foreground"
              onClick={closeMenu}
              to="/"
            >
              <BrandLogo className="[&>span:last-child]:hidden sm:[&>span:last-child]:block" />
            </Link>
          </div>

          <div className="hidden items-center gap-1 lg:flex">
            {navigationItems.map((item) => (
              <NavigationItem
                item={item}
                key={item.to}
                label={content[item.labelKey]}
              />
            ))}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Button size="sm" variant="outline" onClick={() => openAuthModal("signIn")}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => openAuthModal("signUp")}>
              Sign Up
            </Button>
            <Button as={Link} size="sm" variant="secondary" to="/#app">
              {content.downloadApp}
            </Button>
          </div>

          <button
            ref={menuButtonRef}
            className="grid size-11 place-items-center rounded-control text-foreground transition-colors hover:bg-surface-muted lg:hidden"
            type="button"
            aria-controls={menuId}
            aria-expanded={isOpen}
            aria-label={isOpen ? content.closeMenu : content.openMenu}
            onClick={() => setIsOpen((open) => !open)}
          >
            {isOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </nav>

        {isOpen ? (
          <div
            className="border-t border-border py-3 lg:hidden"
            id={menuId}
          >
            <div className="flex flex-col gap-1">
              {navigationItems.map((item) => (
                <NavigationItem
                  item={item}
                  key={item.to}
                  label={content[item.labelKey]}
                  onClick={closeMenu}
                />
              ))}
              <div className="mt-2 grid gap-2 border-t border-border pt-3 sm:grid-cols-3">
                <Button variant="outline" onClick={() => openAuthModal("signIn")}>
                  Sign In
                </Button>
                <Button onClick={() => openAuthModal("signUp")}>Sign Up</Button>
                <Button as={Link} variant="secondary" onClick={closeMenu} to="/#app">
                  {content.downloadApp}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Container>
      <SignInModal
        isOpen={authModal === "signIn"}
        onClose={() => setAuthModal(null)}
        onSwitchToSignUp={() => setAuthModal("signUp")}
      />
      <SignUpModal
        isOpen={authModal === "signUp"}
        onClose={() => setAuthModal(null)}
        onSwitchToSignIn={() => setAuthModal("signIn")}
      />
    </header>
  );
}
