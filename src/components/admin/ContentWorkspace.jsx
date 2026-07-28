import { Clock3, Eye, FileText, GripVertical, History, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../services/api";

const types = [
  ["home", "Home Page"], ["product_content", "Product Pages"], ["category_content", "Categories"],
  ["digital_content", "Kisan Digital"], ["page", "About & Contact"], ["faq", "FAQs"], ["legal", "Legal Pages"],
  ["blog", "Blog"], ["announcement", "Announcements"], ["banner", "Banners"], ["footer", "Footer"],
  ["seo", "SEO"], ["search", "Search"], ["menus", "Menus"], ["emails", "Email Templates"],
];
const starterContent = {
  home: { heading: "", subheading: "", primaryCta: { label: "", url: "" }, images: [], badges: [] },
  product_content: { productId: "", specifications: [], benefits: [], ingredients: "", nutrition: "", faqs: [], relatedProductIds: [], crossSellProductIds: [], upsellProductIds: [] },
  category_content: { categoryId: "", description: "", heroBanner: "", featured: false, homepageVisible: true },
  digital_content: { contentType: "article", body: "", image: "", sourceUrl: "", featured: false, categoryOrder: 0 },
  page: { mission: "", vision: "", story: "", founderMessage: "", timeline: [], achievements: [], images: [], videos: [] },
  faq: { question: "", answer: "", category: "general" },
  legal: { body: "" },
  blog: { body: "", coverImage: "", videoUrl: "", categories: [], tags: [] },
  announcement: { text: "", linkLabel: "", linkUrl: "", placement: "sitewide" },
  banner: { bannerType: "homepage", desktopImage: "", mobileImage: "", linkUrl: "" },
  footer: { copyright: "", description: "", quickLinks: [], supportLinks: [], policyLinks: [], categoryLinks: [], socialLinks: [] },
  seo: { keywords: [], openGraph: {}, twitter: {}, canonicalUrl: "", schemaMarkup: {}, robots: "index,follow" },
  search: { suggestions: [], trendingSearches: [], popularProductIds: [] },
};
const pretty = (value) => { try { return JSON.stringify(typeof value === "string" ? JSON.parse(value) : value, null, 2); } catch { return value || "{}"; } };
const camel = (value) => value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
const normalize = (row) => {
  const result = {};
  for (const [key, value] of Object.entries(row || {})) result[camel(key)] = value;
  result.content = pretty(row?.content_json || result.content || {});
  result.seo = pretty(row?.seo_json || result.seo || {});
  result.visibility ||= "sitewide"; result.status ||= "draft";
  return result;
};

export default function ContentWorkspace({ rows, onReload, setError, setNotice }) {
  const [type, setType] = useState("home");
  const [editor, setEditor] = useState(null);
  const [versions, setVersions] = useState(null);
  const [preview, setPreview] = useState(null);
  const [systemRows, setSystemRows] = useState([]);
  const dragId = useRef(null);
  const visible = useMemo(() => rows.filter((row) => row.entry_type === type), [rows, type]);
  useEffect(() => {
    if (!["menus", "emails"].includes(type)) return;
    apiFetch(`/api/admin/content-system/${type}`).then(setSystemRows).catch((reason) => setError(reason.message));
  }, [setError, type]);

  const create = () => setEditor({ entryType: type, slug: "", title: "", excerpt: "", content: pretty(starterContent[type] || {}), seo: "{}", status: "draft", visibility: type === "home" ? "homepage" : "sitewide", sortOrder: visible.length * 10 });
  const edit = (row) => setEditor(normalize(row));
  const remove = async (row) => {
    if (!window.confirm(`Delete “${row.title}” and its version history?`)) return;
    try { await apiFetch(`/api/admin/content/${row.id}`, { method: "DELETE" }); setNotice("Content deleted"); await onReload(); } catch (reason) { setError(reason.message); }
  };
  const showVersions = async (row) => {
    try { setVersions({ entry: row, rows: await apiFetch(`/api/admin/content/${row.id}/versions`) }); } catch (reason) { setError(reason.message); }
  };
  const rollback = async (version) => {
    if (!window.confirm(`Restore version ${version}? A new version will be created.`)) return;
    try { await apiFetch(`/api/admin/content/${versions.entry.id}/rollback/${version}`, { method: "POST" }); setVersions(null); setNotice("Previous version restored"); await onReload(); } catch (reason) { setError(reason.message); }
  };
  const reorder = async (targetId) => {
    if (!dragId.current || dragId.current === targetId) return;
    const ordered = [...visible]; const from = ordered.findIndex((row) => row.id === dragId.current); const to = ordered.findIndex((row) => row.id === targetId);
    const [moved] = ordered.splice(from, 1); ordered.splice(to, 0, moved);
    try { await apiFetch("/api/admin/content/reorder", { method: "PATCH", body: JSON.stringify({ items: ordered.map(({ id }) => ({ id })) }) }); setNotice("Content order updated"); await onReload(); } catch (reason) { setError(reason.message); }
  };
  const refreshSystem = () => apiFetch(`/api/admin/content-system/${type}`).then(setSystemRows);
  const reorderMenus=async(items)=>{try{await apiFetch("/api/admin/content-system/menus/reorder",{method:"PATCH",body:JSON.stringify({items})});setNotice("Menu order updated");await refreshSystem();}catch(reason){setError(reason.message);}};

  return <div className="content-cms">
    <div className="content-cms__tabs" role="tablist" aria-label="Content types">{types.map(([id, label]) => <button type="button" role="tab" aria-selected={type === id} className={type === id ? "is-active" : ""} key={id} onClick={() => { setType(id); setEditor(null); }}>{label}</button>)}</div>
    <div className="content-cms__bar"><div><strong>{types.find(([id]) => id === type)?.[1]}</strong><span>{["menus", "emails"].includes(type) ? systemRows.length : visible.length} records · drag rows to reorder</span></div>{type === "menus" ? <button className="admin-primary" type="button" onClick={() => setEditor({ systemType: "menus", menuLocation: "main", label: "", url: "", enabled: true, sortOrder: systemRows.length * 10 })}><Plus /> Add menu item</button> : type !== "emails" ? <button className="admin-primary" type="button" onClick={create}><Plus /> Add content</button> : null}</div>
    {type === "menus" ? <SystemTable rows={systemRows} type="menus" onReorder={reorderMenus} onEdit={(row) => setEditor({ systemType: "menus", ...normalize(row) })} onDelete={async (row) => { await apiFetch(`/api/admin/content-system/menus/${row.id}`, { method: "DELETE" }); setNotice("Menu item removed"); await refreshSystem(); }} /> : type === "emails" ? <SystemTable rows={systemRows} type="emails" onEdit={(row) => setEditor({ systemType: "emails", ...normalize(row), htmlContent: row.html_content, textContent: row.text_content })} /> :
      visible.length ? <div className="content-cms__list">{visible.map((row) => <article draggable key={row.id} onDragStart={() => { dragId.current = row.id; }} onDragOver={(event) => event.preventDefault()} onDrop={() => reorder(row.id)}><GripVertical /><div><span>{row.entry_type.replaceAll("_", " ")}</span><strong>{row.title}</strong><small>/{row.slug} · Version {row.current_version} · Updated {new Date(`${row.updated_at}Z`).toLocaleDateString("en-IN")}</small></div><Status status={row.status} publishAt={row.publish_at} /><div className="content-cms__actions"><button type="button" onClick={() => setPreview(normalize(row))}><Eye /> Preview</button><button type="button" onClick={() => edit(row)}><FileText /> Edit</button><button type="button" onClick={() => showVersions(row)}><History /> History</button><button type="button" className="is-danger" onClick={() => remove(row)}><Trash2 /></button></div></article>)}</div> : <div className="admin-panel content-cms__empty"><FileText /><h3>No content in this section</h3><p>Create the first database-driven entry.</p><button type="button" className="admin-primary" onClick={create}><Plus /> Add content</button></div>}
    {editor ? <ContentEditor value={editor} type={type} onClose={() => setEditor(null)} onSaved={async () => { setEditor(null); setNotice("Content saved"); if (["menus", "emails"].includes(type)) await refreshSystem(); else await onReload(); }} setError={setError} /> : null}
    {versions ? <VersionPanel value={versions} onClose={() => setVersions(null)} onRollback={rollback} /> : null}
    {preview ? <PreviewPanel value={preview} onClose={()=>setPreview(null)}/> : null}
  </div>;
}

function ContentEditor({ value, type, onClose, onSaved, setError }) {
  const [form, setForm] = useState(value); const [busy, setBusy] = useState(false); const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      if (form.systemType === "menus") await apiFetch("/api/admin/content-system/menus", { method: "POST", body: JSON.stringify(form) });
      else if (form.systemType === "emails") await apiFetch(`/api/admin/content-system/emails/${form.id}`, { method: "PUT", body: JSON.stringify(form) });
      else {
        const content = JSON.parse(form.content || "{}"); const seo = JSON.parse(form.seo || "{}");
        await apiFetch("/api/admin/content", { method: "POST", body: JSON.stringify({ ...form, content, seo, entryType: form.entryType || type }) });
      }
      await onSaved();
    } catch (reason) { setError(reason instanceof SyntaxError ? "Content and SEO must contain valid JSON." : reason.message); } finally { setBusy(false); }
  };
  return <div className="admin-modal content-editor" role="dialog" aria-modal="true"><button type="button" className="admin-modal__scrim" onClick={onClose} /><form onSubmit={submit}><header><div><p>Content Management System</p><h2>{form.id ? "Edit" : "Create"} {form.systemType || form.entryType || type}</h2></div><button type="button" onClick={onClose}><X /></button></header><div className="admin-editor-body">{form.systemType === "menus" ? <MenuFields form={form} update={update} /> : form.systemType === "emails" ? <EmailFields form={form} update={update} /> : <EntryFields form={form} update={update} />}</div><footer><button type="button" onClick={onClose}>Cancel</button><button className="admin-primary" disabled={busy}><Save /> {busy ? "Saving…" : form.status === "published" ? "Save & publish" : "Save draft"}</button></footer></form></div>;
}
function EntryFields({ form, update }) {
  return <div className="content-form">
    <div className="admin-form-grid"><Field label="Title" value={form.title} onChange={(value) => update("title", value)} required /><Field label="Slug" value={form.slug} onChange={(value) => update("slug", value)} required /><Field label="Summary" value={form.excerpt || ""} onChange={(value) => update("excerpt", value)} wide textarea /><Field label="Status" value={form.status} onChange={(value) => update("status", value)} select={["draft","published","scheduled","archived"]} /><Field label="Visibility" value={form.visibility} onChange={(value) => update("visibility", value)} select={["sitewide","homepage","hidden"]} /><Field label="Publish date" value={toInputDate(form.publishAt)} onChange={(value) => update("publishAt", value)} type="datetime-local" /><Field label="Expiry date" value={toInputDate(form.expiresAt)} onChange={(value) => update("expiresAt", value)} type="datetime-local" /><Field label="Display order" value={form.sortOrder ?? 0} onChange={(value) => update("sortOrder", Number(value))} type="number" /></div>
    <label className="content-code-label"><span>Structured content</span><small>Text, images, buttons, lists, relations and rich HTML are stored here.</small><textarea rows="18" value={form.content} onChange={(event) => update("content", event.target.value)} spellCheck="false" /></label>
    <details><summary>SEO, social cards and schema markup</summary><label className="content-code-label"><textarea rows="10" value={form.seo} onChange={(event) => update("seo", event.target.value)} spellCheck="false" /></label></details>
    <label className="content-change-note">Version note<input value={form.changeNote || ""} onChange={(event) => update("changeNote", event.target.value)} placeholder="What changed in this version?" /></label>
  </div>;
}
function MenuFields({ form, update }) { return <div className="admin-form-grid"><Field label="Label" value={form.label} onChange={(value) => update("label", value)} required /><Field label="URL" value={form.url} onChange={(value) => update("url", value)} required /><Field label="Location" value={form.menuLocation} onChange={(value) => update("menuLocation", value)} select={["main","footer_quick","footer_support","footer_policies"]} /><Field label="Parent item ID" value={form.parentId || ""} onChange={(value) => update("parentId", value)} /><Field label="Description" value={form.description || ""} onChange={(value) => update("description", value)} wide textarea /><Field label="Display order" value={form.sortOrder || 0} onChange={(value) => update("sortOrder", Number(value))} type="number" /><Toggle label="Mega menu" value={form.megaMenu} onChange={(value) => update("megaMenu", value)} /><Toggle label="Enabled" value={form.enabled} onChange={(value) => update("enabled", value)} /></div>; }
function EmailFields({ form, update }) { return <div className="admin-form-grid"><Field label="Template name" value={form.name} onChange={(value) => update("name", value)} required /><Field label="Subject" value={form.subject} onChange={(value) => update("subject", value)} required /><Field label="Preheader" value={form.preheader || ""} onChange={(value) => update("preheader", value)} wide /><Field label="HTML template" value={form.htmlContent || ""} onChange={(value) => update("htmlContent", value)} wide textarea /><Field label="Plain text template" value={form.textContent || ""} onChange={(value) => update("textContent", value)} wide textarea /><Toggle label="Enabled" value={form.enabled} onChange={(value) => update("enabled", value)} /></div>; }
function Field({ label, value, onChange, type="text", textarea=false, wide=false, select, required=false }) { return <label className={wide ? "is-wide" : ""}>{label}{select ? <select value={value || select[0]} onChange={(event) => onChange(event.target.value)}>{select.map((item) => <option key={item} value={item}>{item.replaceAll("_"," ")}</option>)}</select> : textarea ? <textarea rows="4" required={required} value={value} onChange={(event) => onChange(event.target.value)} /> : <input type={type} required={required} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />}</label>; }
function Toggle({label,value,onChange}) { return <label className="admin-switch"><input type="checkbox" checked={Boolean(value)} onChange={(event)=>onChange(event.target.checked)} /><span />{label}</label>; }
function Status({status,publishAt}) { return <span className={`content-status is-${status}`}>{status === "scheduled" ? <Clock3 /> : status === "published" ? <Eye /> : <FileText />}{status}{publishAt && status === "scheduled" ? ` · ${new Date(publishAt).toLocaleDateString("en-IN")}` : ""}</span>; }
function SystemTable({rows,type,onEdit,onDelete,onReorder}) { const dragging=useRef(null);const drop=(target)=>{if(!onReorder||!dragging.current||dragging.current===target)return;const ordered=[...rows];const from=ordered.findIndex((item)=>item.id===dragging.current);const to=ordered.findIndex((item)=>item.id===target);const[moved]=ordered.splice(from,1);ordered.splice(to,0,moved);onReorder(ordered.map(({id})=>({id})));};return <div className="admin-panel admin-data"><table><thead><tr><th>{type === "menus" ? "Label" : "Template"}</th><th>{type === "menus" ? "URL" : "Subject"}</th><th>{type === "menus" ? "Location" : "Version"}</th><th /></tr></thead><tbody>{rows.map((row)=><tr draggable={Boolean(onReorder)} onDragStart={()=>{dragging.current=row.id;}} onDragOver={(event)=>onReorder&&event.preventDefault()} onDrop={()=>drop(row.id)} key={row.id}><td><strong>{row.label || row.name}</strong></td><td>{row.url || row.subject}</td><td>{row.menu_location || row.current_version}</td><td className="admin-row-actions"><button type="button" onClick={()=>onEdit(row)}>Edit</button>{onDelete?<button type="button" className="is-danger" onClick={()=>onDelete(row)}><Trash2 /></button>:null}</td></tr>)}</tbody></table></div>; }
function VersionPanel({value,onClose,onRollback}) { return <div className="admin-modal content-versions"><button className="admin-modal__scrim" type="button" onClick={onClose}/><section><header><div><p>Version history</p><h2>{value.entry.title}</h2></div><button type="button" onClick={onClose}><X /></button></header><div>{value.rows.map((version)=><article key={version.id}><div><strong>Version {version.version}</strong><span>{new Date(`${version.created_at}Z`).toLocaleString("en-IN")} · {version.created_by_name || "System"}</span><small>{version.change_note || "Saved content version"}</small></div><button type="button" onClick={()=>onRollback(version.version)}><RotateCcw /> Roll back</button></article>)}</div></section></div>; }
function PreviewPanel({value,onClose}) { const content=JSON.parse(value.content||"{}");return <div className="admin-modal content-versions"><button className="admin-modal__scrim" type="button" onClick={onClose}/><section><header><div><p>Draft preview</p><h2>{value.title}</h2></div><button type="button" onClick={onClose}><X/></button></header><div className="content-preview">{content.backgroundImage||content.coverImage||content.image?<img src={content.backgroundImage||content.coverImage||content.image} alt=""/>:null}<p>{value.excerpt}</p><h3>{content.heading}</h3><p>{content.subheading||content.body||content.description}</p><pre>{pretty(content)}</pre></div></section></div>; }
function toInputDate(value) { return value ? String(value).replace("Z","").slice(0,16) : ""; }
