import { MoreVertical, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../../services/api";

const label = (value) => String(value || "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const money = (paise = 0) => `₹${(Number(paise) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const date = (value) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(`${value}${String(value).includes("Z") ? "" : "Z"}`)) : "—";

export default function CustomerActions({ customer, onReload, setError, setNotice }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef(null);

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

  const request = async (path, options, notice) => {
    setBusy(true);
    try {
      const result = await apiFetch(path, options);
      setNotice(result?.message || notice);
      setDialog(null);
      await onReload();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };
  const loadDialog = async (type, path) => {
    setOpen(false); setBusy(true);
    try { setDialog({ type, data: await apiFetch(path) }); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };
  const statusAction = (action, notice) => request(
    `/api/admin/customers/${customer.id}/status`,
    { method: "PATCH", body: JSON.stringify({ action, reason: dialog?.reason || "" }) },
    notice,
  );
  const confirmStatus = (action, title, message, notice) => {
    setOpen(false);
    setDialog({ type: "confirm", action, title, message, notice, reason: "" });
  };
  const currentStatus = customer.status || customer.account_status || "ACTIVE";
  const isDeleted = customer.account_status === "DELETED";
  const isSuspended = customer.account_status === "SUSPENDED";

  return <>
    <div className="customer-actions" ref={menuRef}>
      <button type="button" className="customer-actions__trigger" aria-label={`Actions for ${customer.name || customer.email}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} disabled={busy}>
        <MoreVertical aria-hidden="true" />
      </button>
      {open ? <div className="customer-actions__menu" role="menu">
        <button role="menuitem" type="button" onClick={() => loadDialog("profile", `/api/admin/customers/${customer.id}`)}>View profile</button>
        <button role="menuitem" type="button" onClick={() => loadDialog("orders", `/api/admin/customers/${customer.id}/orders`)}>View orders</button>
        <button role="menuitem" type="button" onClick={() => { setOpen(false); setDialog({ type: "edit", form: { name: customer.name || "", firstName: customer.first_name || "", lastName: customer.last_name || "", mobile: customer.mobile || "" } }); }}>Edit customer</button>
        <hr />
        <button role="menuitem" type="button" onClick={() => { setOpen(false); request(`/api/admin/customers/${customer.id}/password-reset`, { method: "POST", body: "{}" }, "Password reset email queued."); }}>Reset password</button>
        {!customer.email_verified_at ? <button role="menuitem" type="button" onClick={() => { setOpen(false); request(`/api/admin/customers/${customer.id}/resend-verification`, { method: "POST", body: "{}" }, "Verification email queued."); }}>Resend verification email</button> : null}
        <hr />
        {isSuspended || isDeleted
          ? <button role="menuitem" type="button" onClick={() => confirmStatus("activate", "Activate Customer", "Restore this customer’s access to their account?", "Customer activated.")}>Activate account</button>
          : <button role="menuitem" type="button" onClick={() => confirmStatus("suspend", "Suspend Customer", "Suspend sign-in and customer activity for this account?", "Customer suspended.")}>Suspend account</button>}
        {customer.blacklisted
          ? <button role="menuitem" type="button" onClick={() => confirmStatus("unblacklist", "Remove From Blacklist", "Allow this email address to use customer services again?", "Customer removed from blacklist.")}>Remove from blacklist</button>
          : <button role="menuitem" type="button" className="is-danger" onClick={() => confirmStatus("blacklist", "Blacklist Customer", "Block sign-in, registration, orders, reviews, and coupons for this email?", "Customer blacklisted.")}>Blacklist customer</button>}
        {!isDeleted ? <button role="menuitem" type="button" className="is-danger" onClick={() => confirmStatus("delete", "Delete Customer", "Soft delete this account? Orders and business records will be preserved.", "Customer soft deleted.")}>Soft delete</button> : null}
        <button role="menuitem" type="button" className="is-danger" onClick={() => { setOpen(false); setDialog({ type: "permanent", confirmation: "" }); }}>Permanently delete</button>
      </div> : null}
    </div>
    {dialog ? createPortal(
      <CustomerDialog
        customer={customer}
        dialog={dialog}
        setDialog={setDialog}
        busy={busy}
        onClose={() => !busy && setDialog(null)}
        onStatus={() => statusAction(dialog.action, dialog.notice)}
        onEdit={() => request(`/api/admin/customers/${customer.id}`, { method: "PATCH", body: JSON.stringify(dialog.form) }, "Customer updated.")}
        onPermanent={() => request(`/api/admin/customers/${customer.id}`, { method: "DELETE", body: JSON.stringify({ confirmation: dialog.confirmation }) }, "Customer permanently deleted.")}
        currentStatus={currentStatus}
      />,
      document.body,
    ) : null}
  </>;
}

function CustomerDialog({ customer, dialog, setDialog, busy, onClose, onStatus, onEdit, onPermanent, currentStatus }) {
  const headingId = `customer-dialog-${customer.id}`;
  const formRef = useRef(null);
  useEffect(() => {
    formRef.current?.querySelector("input,button")?.focus();
    const close = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  const shell = (title, content, footer = null) => <div className="admin-modal customer-dialog" role="dialog" aria-modal="true" aria-labelledby={headingId}>
    <button type="button" className="admin-modal__scrim" onClick={onClose} aria-label="Close dialog" />
    <section ref={formRef}>
      <header><div><p>Customer account</p><h2 id={headingId}>{title}</h2></div><button type="button" onClick={onClose} aria-label="Close dialog"><X /></button></header>
      <div className="customer-dialog__body">{content}</div>
      <footer>{footer || <button type="button" className="admin-primary" onClick={onClose}>Close</button>}</footer>
    </section>
  </div>;

  if (dialog.type === "profile") {
    const { customer: profile, addresses = [], providers = [], orderSummary = {} } = dialog.data;
    return shell("Customer Profile", <div className="customer-profile-grid">
      <dl><div><dt>Name</dt><dd>{profile.name}</dd></div><div><dt>Email</dt><dd>{profile.email}</dd></div><div><dt>Mobile</dt><dd>{profile.mobile || "—"}</dd></div><div><dt>Status</dt><dd><span className={`admin-status is-${String(currentStatus).toLowerCase()}`}>{label(currentStatus)}</span></dd></div><div><dt>Email verified</dt><dd>{profile.email_verified_at ? date(profile.email_verified_at) : "No"}</dd></div><div><dt>Joined</dt><dd>{date(profile.created_at)}</dd></div><div><dt>Orders</dt><dd>{orderSummary.orders_count || 0}</dd></div><div><dt>Lifetime value</dt><dd>{money(orderSummary.lifetime_value_paise)}</dd></div></dl>
      <h3>Addresses</h3>{addresses.length ? addresses.map((address) => <address key={address.id}><strong>{address.label}</strong><span>{address.recipient_name}, {address.line1}{address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} {address.pincode}</span></address>) : <p>No saved addresses.</p>}
      <h3>Sign-in providers</h3><p>{providers.length ? providers.map((provider) => label(provider.provider)).join(", ") : "Credentials only"}</p>
    </div>);
  }
  if (dialog.type === "orders") return shell("Customer Orders", dialog.data.length
    ? <div className="admin-table-scroll"><table><thead><tr><th>Order</th><th>Status</th><th>Payment</th><th>Total</th><th>Placed</th></tr></thead><tbody>{dialog.data.map((order) => <tr key={order.id}><td>{order.order_number}</td><td>{label(order.status)}</td><td>{label(order.payment_status)}</td><td>{money(order.total_paise)}</td><td>{date(order.created_at)}</td></tr>)}</tbody></table></div>
    : <p>No orders found for this customer.</p>);
  if (dialog.type === "edit") return shell("Edit Customer", <div className="admin-form-grid">{[
    ["name","Display name"],["firstName","First name"],["lastName","Last name"],["mobile","Mobile"],
  ].map(([key,text]) => <label key={key}>{text}<input value={dialog.form[key]} onChange={(event) => setDialog({ ...dialog, form: { ...dialog.form, [key]: event.target.value } })} /></label>)}</div>,
  <><button type="button" onClick={onClose}>Cancel</button><button type="button" className="admin-primary" disabled={busy || !dialog.form.name.trim()} onClick={onEdit}>{busy ? "Saving…" : "Save changes"}</button></>);
  if (dialog.type === "permanent") return shell("Permanently Delete Customer", <>
    <p>This action cannot be undone. All customer data will be permanently deleted. To continue, type: <strong>DELETE</strong></p>
    <label>Confirmation<input autoComplete="off" value={dialog.confirmation} onChange={(event) => setDialog({ ...dialog, confirmation: event.target.value })} /></label>
  </>, <><button type="button" onClick={onClose}>Cancel</button><button type="button" className="admin-danger-button" disabled={busy || dialog.confirmation !== "DELETE"} onClick={onPermanent}>{busy ? "Deleting…" : "Permanently delete"}</button></>);
  return shell(dialog.title, <>
    <p>{dialog.message}</p>
    <label>Reason (optional)<textarea rows="3" maxLength="500" value={dialog.reason} onChange={(event) => setDialog({ ...dialog, reason: event.target.value })} /></label>
  </>, <><button type="button" onClick={onClose}>Cancel</button><button type="button" className={["blacklist","delete","suspend"].includes(dialog.action) ? "admin-danger-button" : "admin-primary"} disabled={busy} onClick={onStatus}>{busy ? "Working…" : "Confirm"}</button></>);
}
