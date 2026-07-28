import { ChevronDown, Menu, ShoppingBag, User, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { useCatalog } from "../contexts/CatalogContext";
import { useCommerce } from "../contexts/CommerceContext";
import { useSiteContent } from "../contexts/SiteContentContext";
import BrandLogo from "./brand/BrandLogo";
import { SignInModal, SignUpModal } from "./auth";

const digitalLive = [
  ["Weather Advisory", "/kisan-digital#weather"],
  ["Mandi Prices", "/kisan-digital#mandi"],
  ["Government Schemes", "/kisan-digital#schemes"],
  ["ICAR Knowledge Hub", "/kisan-digital#icar"],
];
const digitalSoon = ["Crop Advisory", "Disease Detection", "AI Assistant"];

export default function Navbar() {
  const { categories } = useCatalog();
  const { get, menu } = useSiteContent();
  const announcement = get("home", "announcement")?.content;
  const mainMenu = menu("main");
  const labelFor = (url, fallback) => mainMenu.find((item) => item.url === url)?.label || fallback;
  const [open, setOpen] = useState(false);
  const [accordion, setAccordion] = useState(null);
  const [authModal, setAuthModal] = useState(null);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia("(min-width: 1101px)").matches);
  const [suppressedMenu, setSuppressedMenu] = useState(null);
  const { user } = useAuth();
  const { cartCount, setCartOpen } = useCommerce();
  const buttonRef = useRef(null);
  const navRef = useRef(null);
  const closeMenu = useCallback(() => { setOpen(false); setAccordion(null); }, [setOpen, setAccordion]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1101px)");
    const updateMode = (event) => {
      setIsDesktop(event.matches);
      closeMenu();
    };
    media.addEventListener("change", updateMode);
    return () => media.removeEventListener("change", updateMode);
  }, [closeMenu]);

  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") {
        closeMenu();
        setSuppressedMenu("all");
        if (!isDesktop) buttonRef.current?.focus();
      }
    };
    const closeOutside = (event) => {
      if (!navRef.current?.contains(event.target)) closeMenu();
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [closeMenu, isDesktop]);

  const selectDestination = (menu) => {
    if (isDesktop) setSuppressedMenu(menu);
    closeMenu();
  };

  return (
    <>
      {announcement?.text ? <div className="announcement">{announcement.text}{announcement.linkUrl ? <> · <Link to={announcement.linkUrl}>{announcement.linkLabel}</Link></> : null}</div> : null}
      <header ref={navRef} className="store-nav">
        <Link className="store-nav__brand" to="/" onClick={closeMenu}><BrandLogo showTagline /></Link>
        <nav id="primary-navigation" className={`store-nav__links ${open ? "is-open" : ""}`} aria-label="Primary navigation">
          <NavLink end to="/" onClick={closeMenu}>{labelFor("/", "Home")}</NavLink>
          <NavLink to="/shop" onClick={closeMenu}>{labelFor("/shop", "Shop")}</NavLink>
          <div
            className={`nav-group ${accordion === "categories" ? "is-open" : ""} ${suppressedMenu === "categories" || suppressedMenu === "all" ? "is-suppressed" : ""}`}
            onMouseEnter={() => { if (isDesktop) setSuppressedMenu(null); }}
            onMouseLeave={() => { if (isDesktop) { setAccordion(null); setSuppressedMenu(null); } }}
          >
            <button type="button" onClick={() => { if (!isDesktop) setAccordion((value) => value === "categories" ? null : "categories"); }} aria-expanded={isDesktop ? undefined : accordion === "categories"} aria-haspopup="true">{labelFor("/categories", "Categories")} <ChevronDown size={14} aria-hidden="true" /></button>
            <div className="nav-dropdown nav-dropdown--categories">
              <div><span className="nav-dropdown__eyebrow">Shop by category</span><strong>Good food for every ritual</strong><Link to="/categories" onClick={() => selectDestination("categories")}>View all collections</Link></div>
              <div className="nav-dropdown__links">
                {categories.map((category) => <Link key={category.id} to={`/category/${category.id}`} onClick={() => selectDestination("categories")}><span>{category.name}</span><small>{category.eyebrow}</small></Link>)}
              </div>
            </div>
          </div>
          <div className={`nav-group ${accordion === "digital" ? "is-open" : ""} ${suppressedMenu === "digital" || suppressedMenu === "all" ? "is-suppressed" : ""}`} onMouseEnter={() => { if (isDesktop) setSuppressedMenu(null); }} onMouseLeave={() => { if (isDesktop) { setAccordion(null); setSuppressedMenu(null); } }}>
            <button type="button" onClick={() => { if (!isDesktop) setAccordion((value) => value === "digital" ? null : "digital"); }} aria-expanded={isDesktop ? undefined : accordion === "digital"} aria-haspopup="true">{labelFor("/kisan-digital", "Kisan Gaurav Digital")} <ChevronDown size={14} aria-hidden="true" /></button>
            <div className="nav-dropdown nav-dropdown--digital">
              <div><span className="nav-dropdown__eyebrow">Farmer-first digital tools</span><strong>Knowledge for better decisions</strong><Link to="/kisan-digital" onClick={() => selectDestination("digital")}>Explore digital platform</Link></div>
              <div className="nav-dropdown__links">
                {digitalLive.map(([label, to]) => <Link key={label} to={to} onClick={() => selectDestination("digital")}><span>{label}</span><small>Explore now</small></Link>)}
                <p>Coming soon</p>
                {digitalSoon.map((label) => <span className="nav-coming-soon" key={label}><span>{label}</span><small>Coming soon</small></span>)}
              </div>
            </div>
          </div>
          {mainMenu.filter((item) => !["/","/shop","/categories","/kisan-digital"].includes(item.url) && !item.parent_id).map((item) => <NavLink key={item.id} to={item.url} onClick={closeMenu}>{item.label}</NavLink>)}
          <button className="mobile-signin" onClick={() => { setAuthModal("signIn"); closeMenu(); }} type="button">Sign In</button>
        </nav>
        <div className="store-nav__actions">
          {user ? <Link className="signin-button" to="/account"><User size={16} /> Account</Link> : <button className="signin-button" onClick={() => setAuthModal("signIn")} type="button">Sign In</button>}
          <button className="cart-display" aria-label={`Cart with ${cartCount} items`} type="button" onClick={() => setCartOpen(true)}><ShoppingBag size={19} /><span>Cart</span><b>{cartCount}</b></button>
          <button ref={buttonRef} className="menu-button" onClick={() => setOpen((value) => !value)} aria-controls="primary-navigation" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} type="button">{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
        </div>
      </header>
      <SignInModal isOpen={authModal === "signIn"} onClose={() => setAuthModal(null)} onSwitchToSignUp={() => setAuthModal("signUp")} />
      <SignUpModal isOpen={authModal === "signUp"} onClose={() => setAuthModal(null)} onSwitchToSignIn={() => setAuthModal("signIn")} />
    </>
  );
}
