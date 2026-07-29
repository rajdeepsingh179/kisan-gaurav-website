import { ChevronDown, LayoutDashboard, LogOut, Store } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatRole } from "../../utils/roles";

export default function AdminProfileMenu({ user }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const name = user.name || "Administrator";
  const avatarLabel = (name || user.email || "A")[0].toUpperCase();

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.key === "Escape" || !menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  return (
    <div className="admin-profile-menu" ref={menuRef}>
      <button className="admin-profile-trigger" type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}>
        <span className="admin-avatar">{user.image ? <img src={user.image} alt="" /> : avatarLabel}</span>
        <span className="admin-profile-identity"><strong>{name}</strong><small>{user.email}</small></span>
        <span className="admin-role">{formatRole(user.role)}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open ? (
        <div className="admin-profile-dropdown" role="menu">
          <div className="admin-profile-summary">
            <span className="admin-avatar">{user.image ? <img src={user.image} alt="" /> : avatarLabel}</span>
            <span><strong>{name}</strong><small>{user.email}</small></span>
            <span className="admin-role">{formatRole(user.role)}</span>
          </div>
          <div className="admin-context-active"><LayoutDashboard aria-hidden="true" /><span><strong>Admin Dashboard</strong><small>Current context</small></span></div>
          <Link to="/" role="menuitem" onClick={() => setOpen(false)}><Store aria-hidden="true" /><span><strong>Switch to Store</strong><small>Continue as {name}</small></span></Link>
          <Link to="/admin/logout" role="menuitem" onClick={() => setOpen(false)}><LogOut aria-hidden="true" /><span><strong>Sign out</strong><small>End this session</small></span></Link>
        </div>
      ) : null}
    </div>
  );
}
