import { Image as ImageIcon, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { MediaBrowser } from "./MediaLibrary";

export default function MediaPicker({
  open, onClose, onConfirm, multiple = false, value = [], folder = "general",
  acceptType = "all", setError, setNotice,
}) {
  const initial = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
  const [selected, setSelected] = useState(initial);
  if (!open) return null;
  const toggle = (asset, replace = false) => {
    if (!multiple || replace) { setSelected([asset]); return; }
    setSelected((current) => current.some((item) => item.id === asset.id || item.url === asset.url) ? current.filter((item) => item.id !== asset.id && item.url !== asset.url) : [...current, asset]);
  };
  return <div className="admin-modal media-picker-modal" role="dialog" aria-modal="true" aria-label="Select media">
    <button type="button" className="admin-modal__scrim" onClick={onClose} aria-label="Close media picker" />
    <section>
      <header><div><p>Media Library</p><h2>{multiple ? "Select media" : "Select an asset"}</h2></div><button type="button" onClick={onClose} aria-label="Close"><X /></button></header>
      <div className="media-picker-body"><MediaBrowser selectionMode multiple={multiple} selected={selected} onToggle={toggle} defaultFolder={folder} acceptType={acceptType} setError={setError} setNotice={setNotice} /></div>
      <footer><span>{selected.length} selected</span><button type="button" onClick={onClose}>Cancel</button><button type="button" className="admin-primary" disabled={!selected.length} onClick={() => { onConfirm(multiple ? selected : selected[0]); onClose(); }}>Confirm selection</button></footer>
    </section>
  </div>;
}

export function MediaField({
  label, value, onChange, multiple = false, folder = "general", required = false,
  returnAsset = false, mediaType = "images", setError, setNotice,
}) {
  const [open, setOpen] = useState(false);
  const assets = multiple ? (Array.isArray(value) ? value : []) : value ? [typeof value === "string" ? { id: value, url: value, file_name: value.split("/").pop() } : value] : [];
  const remove = (index) => onChange(multiple ? assets.filter((_, position) => position !== index) : "");
  const confirm = (selection) => onChange(returnAsset || multiple ? selection : selection.url);
  return <div className={`media-field${multiple ? " is-multiple" : ""}`}>
    <span>{label}{required ? " *" : ""}</span>
    {assets.length ? <div className="media-field-selection">{assets.map((asset, index) => <article key={asset.id || asset.url}><span>{asset.mime_type === "application/pdf" ? <ImageIcon /> : <img src={asset.thumbnail_url || asset.url} alt={asset.alt_text || ""} />}</span><div><strong>{asset.file_name || `Asset ${index + 1}`}</strong><small>{asset.url}</small></div><button type="button" onClick={() => remove(index)} aria-label={`Remove ${asset.file_name || "asset"}`}><Trash2 /></button></article>)}</div> : <div className="media-field-empty"><ImageIcon /><span>No asset selected{required ? " (required)" : ""}</span></div>}
    <button type="button" className="media-select-button" onClick={() => setOpen(true)}><Plus /> {assets.length ? multiple ? "Add or change media" : "Change asset" : multiple ? "Select media" : "Select asset"}</button>
    {open ? <MediaPicker open onClose={() => setOpen(false)} onConfirm={confirm} multiple={multiple} value={multiple ? assets : assets[0]} folder={folder} acceptType={mediaType} setError={setError} setNotice={setNotice} /> : null}
  </div>;
}

export function JsonMediaTextarea({
  label, value, onChange, rows = 12, folder = "cms", help, setError, setNotice,
}) {
  const [open, setOpen] = useState(false);
  const textareaRef = useRef(null);
  const insert = (asset) => {
    const textarea = textareaRef.current;
    let start = textarea?.selectionStart ?? value.length;
    let end = textarea?.selectionEnd ?? start;
    if (start === end) {
      const openingQuote = value.lastIndexOf("\"", Math.max(0, start - 1));
      const closingQuote = value.indexOf("\"", end);
      const precedingColon = value.lastIndexOf(":", openingQuote);
      const precedingDelimiter = Math.max(value.lastIndexOf(",", openingQuote), value.lastIndexOf("{", openingQuote), value.lastIndexOf("[", openingQuote));
      if (openingQuote >= 0 && closingQuote >= end && precedingColon > precedingDelimiter) {
        start = openingQuote;
        end = closingQuote + 1;
      }
    }
    const insertion = JSON.stringify(asset.url);
    onChange(`${value.slice(0, start)}${insertion}${value.slice(end)}`);
  };
  return <div className="content-code-label media-json-field"><span>{label}</span>{help ? <small>{help}</small> : null}<textarea aria-label={label} ref={textareaRef} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} spellCheck="false" /><button type="button" className="media-select-button" onClick={() => setOpen(true)}><Plus /> Insert from Media Library</button>{open ? <MediaPicker open onClose={() => setOpen(false)} onConfirm={insert} folder={folder} setError={setError} setNotice={setNotice} /> : null}</div>;
}
