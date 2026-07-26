import { ChevronDown, Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";

import { categories } from "../data/catalog";
import { useAuth } from "../contexts/AuthContext";
import { useCommerce } from "../contexts/CommerceContext";
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
  const [open, setOpen] = useState(false);
  const [accordion, setAccordion] = useState(null);
  const [authModal, setAuthModal] = useState(null);
  const { user } = useAuth();
  const { cartCount } = useCommerce();
  const buttonRef = useRef(null);
  const closeMenu = () => { setOpen(false); setAccordion(null); };

  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") {
        closeMenu();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  return (
    <>
      <div className="announcement">Complimentary delivery on eligible orders · Online ordering coming soon</div>
      <header className="store-nav">
        <Link className="store-nav__brand" to="/" onClick={closeMenu}><BrandLogo showTagline /></Link>
        <nav className={`store-nav__links ${open ? "is-open" : ""}`} aria-label="Primary navigation">
          <NavLink end to="/" onClick={closeMenu}>Home</NavLink>
          <NavLink to="/shop" onClick={closeMenu}>Shop</NavLink>
          <div className={`nav-group ${accordion === "categories" ? "is-open" : ""}`}>
            <button type="button" onClick={() => setAccordion((value) => value === "categories" ? null : "categories")} aria-expanded={accordion === "categories"}>Categories <ChevronDown size={14} /></button>
            <div className="nav-dropdown nav-dropdown--categories">
              <div><span className="nav-dropdown__eyebrow">Shop by category</span><strong>Good food for every ritual</strong><Link to="/categories" onClick={closeMenu}>View all collections</Link></div>
              <div className="nav-dropdown__links">
                {categories.map((category) => <Link key={category.id} to={`/category/${category.id}`} onClick={closeMenu}><span>{category.name}</span><small>{category.eyebrow}</small></Link>)}
              </div>
            </div>
          </div>
          <div className={`nav-group ${accordion === "digital" ? "is-open" : ""}`}>
            <button type="button" onClick={() => setAccordion((value) => value === "digital" ? null : "digital")} aria-expanded={accordion === "digital"}>Kisan Gaurav Digital <ChevronDown size={14} /></button>
            <div className="nav-dropdown nav-dropdown--digital">
              <div><span className="nav-dropdown__eyebrow">Farmer-first digital tools</span><strong>Knowledge for better decisions</strong><Link to="/kisan-digital" onClick={closeMenu}>Explore digital platform</Link></div>
              <div className="nav-dropdown__links">
                {digitalLive.map(([label, to]) => <Link key={label} to={to} onClick={closeMenu}><span>{label}</span><small>Explore now</small></Link>)}
                <p>Coming soon</p>
                {digitalSoon.map((label) => <span className="nav-coming-soon" key={label}><span>{label}</span><small>Coming soon</small></span>)}
              </div>
            </div>
          </div>
          <NavLink to="/features" onClick={closeMenu}>Features</NavLink>
          <NavLink to="/about" onClick={closeMenu}>About</NavLink>
          <NavLink to="/contact" onClick={closeMenu}>Contact</NavLink>
          <button className="mobile-signin" onClick={() => { setAuthModal("signIn"); closeMenu(); }} type="button">Sign In</button>
        </nav>
        <div className="store-nav__actions">
          {user ? <Link className="signin-button" to="/account"><User size={16} /> Account</Link> : <button className="signin-button" onClick={() => setAuthModal("signIn")} type="button">Sign In</button>}
          <Link className="cart-display" aria-label={`Cart with ${cartCount} items`} to="/cart"><ShoppingBag size={19} /><span>Cart</span><b>{cartCount}</b></Link>
          <button ref={buttonRef} className="menu-button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close menu" : "Open menu"} type="button">{open ? <X /> : <Menu />}</button>
        </div>
      </header>
      <SignInModal isOpen={authModal === "signIn"} onClose={() => setAuthModal(null)} onSwitchToSignUp={() => setAuthModal("signUp")} />
      <SignUpModal isOpen={authModal === "signUp"} onClose={() => setAuthModal(null)} onSwitchToSignIn={() => setAuthModal("signIn")} />
    </>
  );
}
