import { MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../../services/api";

const label = (value) => String(value || "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const money = (paise = 0) => `₹${(Number(paise) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const date = (value) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(`${value}${String(value).includes("Z") ? "" : "Z"}`)) : "—";

export default function CustomerActions({ customer, role, onReload, setError, setNotice }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [menuPosition, setMenuPosition] = useState({});
  const actionsRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const isSuperAdmin = role === "SUPER_ADMIN";

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.key === "Escape" || (!actionsRef.current?.contains(event.target) && !menuRef.current?.contains(event.target))) setOpen(false);
    };
    const closeOnViewportChange = () => setOpen(false);
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [open]);

  const toggleMenu = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const showAbove = window.innerHeight - bounds.bottom < 300 && bounds.top > 300;
    setMenuPosition(showAbove
      ? { bottom: Math.max(8, window.innerHeight - bounds.top + 4), right: Math.max(8, window.innerWidth - bounds.right) }
      : { top: bounds.bottom + 4, right: Math.max(8, window.innerWidth - bounds.right) });
    setOpen(true);
  };

  const request = async (path, options, notice) => {
    setBusy(true);
    try {
      const result = await apiFetch(path, options);
      setNotice(result?.message || notice);
      setDialog(null);
      await onReload();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };
  const loadDialog = async (type, path, context = {}) => {
    setOpen(false);
    setBusy(true);
    try {
      setDialog({ type, data: await apiFetch(path), ...context });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };
  const statusAction = (action, notice) => request(
    `/api/admin/customers/${customer.id}/status`,
    { method: "PATCH", body: JSON.stringify({ action, reason: dialog?.reason || "" }) },
    notice,
  );
  const confirmStatus = (action, title, message, notice) => {
    setOpen(false);
    setDialog({ type: "statusConfirm", action, title, message, notice, reason: "" });
  };
  const currentStatus = customer.status || customer.account_status || "ACTIVE";
  const isDeleted = customer.account_status === "DELETED";
  const isSuspended = customer.account_status === "SUSPENDED";
  const openEdit = () => {
    setOpen(false);
    setDialog({
      type: "edit",
      form: {
        name: customer.name || "",
        firstName: customer.first_name || "",
        lastName: customer.last_name || "",
        mobile: customer.mobile || "",
        notes: customer.customer_notes || "",
        status: customer.account_status || "ACTIVE",
      },
    });
  };
  const openPermanentDelete = () => {
    setOpen(false);
    setDialog({ type: "permanent", confirmation: "" });
  };

  return <>
    <div className="customer-actions" ref={actionsRef}>
      <button type="button" className="customer-actions__button" onClick={openEdit} disabled={busy}>
        <Pencil aria-hidden="true" /> Edit
      </button>
      {isSuperAdmin ? <button type="button" className="customer-actions__button is-danger" onClick={openPermanentDelete} disabled={busy}>
        <Trash2 aria-hidden="true" /> Delete
      </button> : null}
      <button ref={triggerRef} type="button" className="customer-actions__trigger" aria-label={`More actions for ${customer.name || customer.email}`} aria-haspopup="menu" aria-expanded={open} onClick={toggleMenu} disabled={busy}>
        <MoreVertical aria-hidden="true" />
      </button>
    </div>
    {open ? createPortal(<div className="customer-actions__menu" role="menu" ref={menuRef} style={menuPosition}>
        <button role="menuitem" type="button" onClick={() => loadDialog("profile", `/api/admin/customers/${customer.id}`)}>View Profile</button>
        <button role="menuitem" type="button" onClick={() => loadDialog("orders", `/api/admin/customers/${customer.id}/orders`)}>View Orders</button>
        <button role="menuitem" type="button" onClick={openEdit}>Edit Customer</button>
        <button role="menuitem" type="button" onClick={() => {
          setOpen(false);
          setDialog({
            type: "requestConfirm",
            action: "password-reset",
            title: "Reset Password",
            message: `Send a password reset email to ${customer.email}?`,
          });
        }}>Reset Password</button>
        <button
          role="menuitem"
          type="button"
          disabled={Boolean(customer.email_verified_at)}
          title={customer.email_verified_at ? "This customer's email is already verified." : undefined}
          onClick={() => {
            setOpen(false);
            request(`/api/admin/customers/${customer.id}/resend-verification`, { method: "POST", body: "{}" }, "Verification email queued.");
          }}
        >Resend Verification</button>
        {isSuperAdmin ? <>
          <hr />
          {isSuspended || isDeleted
            ? <button role="menuitem" type="button" onClick={() => confirmStatus("activate", "Activate Customer", "Restore this customer’s access to their account?", "Customer activated.")}>Activate</button>
            : <button role="menuitem" type="button" onClick={() => confirmStatus("suspend", "Suspend Customer", "Suspend sign-in and customer activity for this account?", "Customer suspended.")}>Suspend</button>}
          {customer.blacklisted
            ? <button role="menuitem" type="button" onClick={() => confirmStatus("unblacklist", "Remove From Blacklist", "Allow this email address to use customer services again?", "Customer removed from blacklist.")}>Remove From Blacklist</button>
            : <button role="menuitem" type="button" className="is-danger" onClick={() => confirmStatus("blacklist", "Blacklist Customer", "Block sign-in, registration, orders, reviews, and coupons for this email?", "Customer blacklisted.")}>Blacklist</button>}
          <hr />
          {!isDeleted ? <button role="menuitem" type="button" className="is-danger" onClick={() => confirmStatus("delete", "Soft Delete", "Soft delete this account? Orders and business records will be preserved.", "Customer soft deleted.")}>Soft Delete</button> : null}
          <button role="menuitem" type="button" className="is-danger" onClick={openPermanentDelete}>Permanent Delete</button>
        </> : <p className="customer-actions__permission">Only a Super Admin can suspend or delete customer accounts.</p>}
      </div>, document.body) : null}
    {dialog ? createPortal(
      <CustomerDialog
        customer={customer}
        dialog={dialog}
        setDialog={setDialog}
        busy={busy}
        role={role}
        onClose={() => !busy && setDialog(null)}
        onStatus={() => statusAction(dialog.action, dialog.notice)}
        onRequest={() => request(`/api/admin/customers/${customer.id}/password-reset`, { method: "POST", body: "{}" }, "Password reset email queued.")}
        onEdit={() => request(`/api/admin/customers/${customer.id}`, { method: "PATCH", body: JSON.stringify(dialog.form) }, "Customer updated.")}
        onPermanent={() => request(`/api/admin/customers/${customer.id}`, { method: "DELETE", body: JSON.stringify({ confirmation: dialog.confirmation }) }, "Customer permanently deleted.")}
        onOpenOrder={(orderId) => loadDialog("order", `/api/admin/orders/${orderId}`, { customerOrdersPath: `/api/admin/customers/${customer.id}/orders` })}
        onBackToOrders={() => loadDialog("orders", `/api/admin/customers/${customer.id}/orders`)}
        currentStatus={currentStatus}
      />,
      document.body,
    ) : null}
  </>;
}

export function CustomerProfileButton({ customerId, children, setError }) {
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try {
      setDialog({ type: "profile", data: await apiFetch(`/api/admin/customers/${customerId}`) });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };
  return <>
    <button type="button" className="admin-customer-link" disabled={busy} onClick={open}>{children}</button>
    {dialog ? createPortal(
      <CustomerDialog customer={{ id: customerId }} dialog={dialog} setDialog={setDialog} busy={busy} onClose={() => setDialog(null)} currentStatus={dialog.data.customer.status || dialog.data.customer.account_status} />,
      document.body,
    ) : null}
  </>;
}

function CustomerDialog({
  customer,
  dialog,
  setDialog,
  busy,
  role,
  onClose,
  onStatus,
  onRequest,
  onEdit,
  onPermanent,
  onOpenOrder,
  onBackToOrders,
  currentStatus,
}) {
  const headingId = `customer-dialog-${customer.id}`;
  const formRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    formRef.current?.querySelector("input,button")?.focus();
    const close = (event) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [dialog.type]);
  const shell = (title, content, footer = null) => <div className="admin-modal customer-dialog" role="dialog" aria-modal="true" aria-labelledby={headingId}>
    <button type="button" className="admin-modal__scrim" onClick={onClose} aria-label="Close dialog" />
    <section ref={formRef}>
      <header><div><p>Customer account</p><h2 id={headingId}>{title}</h2></div><button type="button" onClick={onClose} aria-label="Close dialog"><X /></button></header>
      <div className="customer-dialog__body">{content}</div>
      <footer>{footer || <button type="button" className="admin-primary" onClick={onClose}>Close</button>}</footer>
    </section>
  </div>;

  if (dialog.type === "profile") {
    const { customer: profile, addresses = [], providers = [], orderSummary = {}, lastLoginAt, sessions } = dialog.data;
    return shell("Customer Profile", <div className="customer-profile-grid">
      <dl>
        <div><dt>Customer ID</dt><dd>{profile.id}</dd></div>
        <div><dt>Full name</dt><dd>{profile.name}</dd></div>
        <div><dt>Email</dt><dd>{profile.email}</dd></div>
        <div><dt>Phone</dt><dd>{profile.mobile || "—"}</dd></div>
        <div><dt>Status</dt><dd><span className={`admin-status is-${String(currentStatus).toLowerCase()}`}>{label(currentStatus)}</span></dd></div>
        <div><dt>Role</dt><dd>{label(profile.effective_role || profile.role || "customer")}</dd></div>
        <div><dt>Verification</dt><dd>{profile.email_verified_at ? `Verified ${date(profile.email_verified_at)}` : "Not verified"}</dd></div>
        <div><dt>Registration</dt><dd>{date(profile.created_at)}</dd></div>
        <div><dt>Last login</dt><dd>{date(lastLoginAt)}</dd></div>
        <div><dt>Orders</dt><dd>{orderSummary.orders_count || 0}</dd></div>
        <div><dt>Lifetime spend</dt><dd>{money(orderSummary.lifetime_value_paise)}</dd></div>
        <div><dt>Active sessions</dt><dd>{sessions?.individuallyTrackable ? (sessions.activeCount ?? "Available") : "Stateless session (individual count unavailable)"}</dd></div>
      </dl>
      {profile.customer_notes ? <><h3>Internal notes</h3><p className="customer-profile-notes">{profile.customer_notes}</p></> : null}
      <h3>Addresses</h3>
      {addresses.length ? addresses.map((address) => <address key={address.id}><strong>{address.label}</strong><span>{address.recipient_name}, {address.line1}{address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} {address.pincode}</span></address>) : <p>No saved addresses.</p>}
      <h3>Sign-in providers</h3>
      <p>{providers.length ? providers.map((provider) => label(provider.provider)).join(", ") : "Credentials only"}</p>
    </div>);
  }
  if (dialog.type === "orders") return shell("Customer Orders", dialog.data.length
    ? <div className="admin-table-scroll"><table><thead><tr><th>Order</th><th>Status</th><th>Payment</th><th>Total</th><th>Placed</th></tr></thead><tbody>{dialog.data.map((order) => <tr key={order.id}>
      <td><button type="button" className="admin-customer-link" onClick={() => onOpenOrder(order.id)}>{order.order_number}</button></td>
      <td>{label(order.status)}</td><td>{label(order.payment_status)}</td><td>{money(order.total_paise)}</td><td>{date(order.created_at)}</td>
    </tr>)}</tbody></table></div>
    : <p>No orders found for this customer.</p>);
  if (dialog.type === "order") {
    const { order, items = [], history = [] } = dialog.data;
    return shell(`Order ${order.order_number}`, <div className="customer-order-detail">
      <dl>
        <div><dt>Status</dt><dd>{label(order.status)}</dd></div>
        <div><dt>Payment</dt><dd>{label(order.payment_status)} · {label(order.payment_method)}</dd></div>
        <div><dt>Total</dt><dd>{money(order.total_paise)}</dd></div>
        <div><dt>Placed</dt><dd>{date(order.created_at)}</dd></div>
      </dl>
      <h3>Items</h3>
      <div className="admin-table-scroll"><table><thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Price</th></tr></thead><tbody>{items.map((item, index) => <tr key={`${item.sku}-${index}`}>
        <td>{item.product_name}{item.variant_name ? ` · ${item.variant_name}` : ""}</td><td>{item.sku}</td><td>{item.quantity}</td><td>{money(item.unit_price_paise)}</td>
      </tr>)}</tbody></table></div>
      <h3>Status history</h3>
      {history.length ? <ul>{history.map((entry, index) => <li key={`${entry.status}-${entry.created_at}-${index}`}><strong>{label(entry.status)}</strong> · {date(entry.created_at)}{entry.note ? ` — ${entry.note}` : ""}</li>)}</ul> : <p>No status history available.</p>}
    </div>, <><button type="button" onClick={onBackToOrders}>Back to orders</button><button type="button" className="admin-primary" onClick={onClose}>Close</button></>);
  }
  if (dialog.type === "edit") return shell("Edit Customer", <div className="admin-form-grid">
    {[["name", "Display name"], ["firstName", "First name"], ["lastName", "Last name"], ["mobile", "Phone"]].map(([key, text]) => <label key={key}>{text}<input value={dialog.form[key]} onChange={(event) => setDialog({ ...dialog, form: { ...dialog.form, [key]: event.target.value } })} /></label>)}
    <label>Email<input value={customer.email || ""} readOnly aria-describedby={`${headingId}-email-note`} /></label>
    <p id={`${headingId}-email-note`} className="admin-field-note">Email changes require a separate verification flow and cannot be made here.</p>
    {role === "SUPER_ADMIN" ? <label>Status<select value={dialog.form.status} onChange={(event) => setDialog({ ...dialog, form: { ...dialog.form, status: event.target.value } })}><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DELETED">Deleted</option></select></label> : null}
    <label className="admin-form-grid__wide">Internal notes<textarea rows="5" maxLength="4000" value={dialog.form.notes} onChange={(event) => setDialog({ ...dialog, form: { ...dialog.form, notes: event.target.value } })} /></label>
  </div>, <><button type="button" onClick={onClose}>Cancel</button><button type="button" className="admin-primary" disabled={busy || !dialog.form.name.trim()} onClick={onEdit}>{busy ? "Saving…" : "Save changes"}</button></>);
  if (dialog.type === "permanent") return shell("Permanent Delete", <>
    <p>This action permanently deletes the customer and all related data. Type DELETE to continue.</p>
    <label>Confirmation<input autoComplete="off" value={dialog.confirmation} onChange={(event) => setDialog({ ...dialog, confirmation: event.target.value })} /></label>
  </>, <><button type="button" onClick={onClose}>Cancel</button><button type="button" className="admin-danger-button" disabled={busy || dialog.confirmation !== "DELETE"} onClick={onPermanent}>{busy ? "Deleting…" : "Permanent Delete"}</button></>);
  if (dialog.type === "requestConfirm") return shell(dialog.title, <p>{dialog.message}</p>, <><button type="button" onClick={onClose}>Cancel</button><button type="button" className="admin-primary" disabled={busy} onClick={onRequest}>{busy ? "Sending…" : "Send reset email"}</button></>);
  return shell(dialog.title, <>
    <p>{dialog.message}</p>
    <label>Reason (optional)<textarea rows="3" maxLength="500" value={dialog.reason} onChange={(event) => setDialog({ ...dialog, reason: event.target.value })} /></label>
  </>, <><button type="button" onClick={onClose}>Cancel</button><button type="button" className={["blacklist", "delete", "suspend"].includes(dialog.action) ? "admin-danger-button" : "admin-primary"} disabled={busy} onClick={onStatus}>{busy ? "Working…" : "Confirm"}</button></>);
}
