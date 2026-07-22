import { useEffect, useId, useRef, useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { commonContent } from "../data/commonContent";
import { navigationItems } from "../data/navigation";
import useLanguage from "../hooks/useLanguage";
import useProducts from "../hooks/useProducts";
import { cn } from "../utils/cn";
import BrandLogo from "./brand/BrandLogo";
import LanguageToggle from "./LanguageToggle";
import { SignInModal, SignUpModal } from "./auth";
import { Button, Container } from "./ui";

function navigationLinkClass({ isActive }) {
  return cn(
    "rounded-control px-2.5 py-2 text-sm font-semibold tracking-[-0.01em] transition-all duration-200",
    isActive
      ? "bg-primary-50 text-primary-800 shadow-soft"
      : "text-foreground-muted hover:bg-surface hover:text-primary-800",
  );
}

function NavigationItem({ item, label, onClick }) {
  if (item.to.includes("#")) {
    return (
      <Link
        className="rounded-control px-2.5 py-2 text-sm font-semibold tracking-[-0.01em] text-foreground-muted transition-all duration-200 hover:bg-surface hover:text-primary-800"
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
  const { cartCount } = useProducts();
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
    <header className="sticky top-0 z-50 border-b border-primary-900/15 bg-canvas/95 shadow-[0_2px_22px_rgb(23_93_54_/_0.12)] backdrop-blur-2xl supports-[backdrop-filter]:bg-canvas/88">
      <Container className="max-w-[84rem]">
        <nav
          className="flex min-h-18 items-center justify-between gap-3"
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

          <div className="hidden items-center gap-0.5 xl:flex">
            {navigationItems.map((item) => (
              <NavigationItem
                item={item}
                key={item.to}
                label={content[item.labelKey]}
              />
            ))}
          </div>

          <div className="hidden items-center gap-2 xl:flex">
            <Button size="sm" variant="outline" onClick={() => openAuthModal("signIn")}>
              Sign In
            </Button>
            <Button as={Link} className="relative" size="sm" to="/cart" variant="accent">
              <ShoppingBag aria-hidden="true" className="size-4" />
              {content.cart}
              {cartCount ? (
                <span className="grid min-w-5 place-items-center rounded-full bg-primary-950 px-1 text-[0.65rem] leading-5 text-on-primary" aria-label={`${cartCount} items in cart`}>
                  {cartCount}
                </span>
              ) : null}
            </Button>
          </div>

          <Button
            as={Link}
            aria-label={`${content.cart}${cartCount ? `, ${cartCount} items` : ""}`}
            className="ml-auto size-11 shrink-0 px-0 sm:w-auto sm:px-3.5 xl:hidden"
            size="sm"
            title={content.cart}
            to="/cart"
            variant="accent"
          >
            <ShoppingBag aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">{content.cart}</span>
            {cartCount ? <span className="grid min-w-5 place-items-center rounded-full bg-primary-950 px-1 text-[0.65rem] leading-5 text-on-primary">{cartCount}</span> : null}
          </Button>

          <button
            ref={menuButtonRef}
            className="grid size-11 place-items-center rounded-control border border-transparent text-foreground transition-all hover:border-border hover:bg-surface hover:shadow-soft xl:hidden"
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
            className="border-t border-border/80 py-4 xl:hidden"
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
              <div className="mt-2 grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
                <Button variant="outline" onClick={() => openAuthModal("signIn")}>
                  Sign In
                </Button>
                <Button as={Link} onClick={closeMenu} to="/cart" variant="accent">
                  <ShoppingBag aria-hidden="true" className="size-4" />
                  {content.cart}{cartCount ? ` (${cartCount})` : ""}
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
