import { useEffect, useId, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { navigationItems } from "../data/navigation";
import { cn } from "../utils/cn";
import BrandLogo from "./brand/BrandLogo";
import { Button, Container } from "./ui";

function navigationLinkClass({ isActive }) {
  return cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary-50 text-primary-800"
      : "text-foreground-muted hover:bg-surface-muted hover:text-foreground",
  );
}

function NavigationItem({ item, onClick }) {
  if (item.to.includes("#")) {
    return (
      <Link
        className="rounded-lg px-3 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        onClick={onClick}
        to={item.to}
      >
        {item.label}
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
      {item.label}
    </NavLink>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef(null);

  const closeMenu = () => setIsOpen(false);

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
          aria-label="Primary navigation"
        >
          <Link
            className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-foreground"
            onClick={closeMenu}
            to="/"
          >
            <BrandLogo />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navigationItems.map((item) => (
              <NavigationItem
                item={item}
                key={item.to}
              />
            ))}
          </div>

          <div className="hidden md:block">
            <Button as={Link} size="sm" to="/#app">
              Download App
            </Button>
          </div>

          <button
            ref={menuButtonRef}
            className="grid size-11 place-items-center rounded-control text-foreground transition-colors hover:bg-surface-muted md:hidden"
            type="button"
            aria-controls={menuId}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
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
            className="border-t border-border py-3 md:hidden"
            id={menuId}
          >
            <div className="flex flex-col gap-1">
              {navigationItems.map((item) => (
                <NavigationItem
                  item={item}
                  key={item.to}
                  onClick={closeMenu}
                />
              ))}
              <Button
                as={Link}
                className="mt-2 w-full"
                onClick={closeMenu}
                to="/#app"
              >
                Download App
              </Button>
            </div>
          </div>
        ) : null}
      </Container>
    </header>
  );
}
