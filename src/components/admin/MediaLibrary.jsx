import {
  Check, Clipboard, Download, FileText, Grid3X3, Image as ImageIcon, List, LoaderCircle,
  MoreHorizontal, RefreshCw, Search, Trash2, Upload, X,
} from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { apiFetch } from "../../services/api";
import {
  MEDIA_ACCEPT, MEDIA_FOLDERS, mediaDownloadUrl, replaceMedia, uploadMedia,
} from "../../services/mediaService";

const formatSize = (bytes = 0) => bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
const formatDate = (value) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}${String(value).includes("Z") ? "" : "Z"}`));

export default function MediaLibrary({ setError, setNotice }) {
  return <MediaBrowser setError={setError} setNotice={setNotice} />;
}

export function MediaBrowser({
  selectionMode = false, multiple = false, selected = [], onToggle, defaultFolder = "general",
  acceptType = "all", setError = () => {}, setNotice = () => {},
}) {
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [folder, setFolder] = useState(selectionMode ? defaultFolder : "all");
  const [type, setType] = useState(acceptType);
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("grid");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const sentinelRef = useRef(null);
  const requestRef = useRef(0);
  const selectedIds = new Set(selected.map((asset) => asset.id));
  const selectedUrls = new Set(selected.map((asset) => asset.url));

  const fetchAssets = useCallback(async ({ append = false, cursor = "0" } = {}) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    const params = new URLSearchParams({ limit: "30", cursor, sort });
    if (deferredQuery) params.set("search", deferredQuery);
    if (folder !== "all") params.set("folder", folder);
    if (type !== "all") params.set("type", type);
    try {
      const result = await apiFetch(`/api/admin/media-library?${params}`);
      if (requestId !== requestRef.current) return;
      setAssets((current) => append ? [...current, ...result.assets] : result.assets);
      setNextCursor(result.nextCursor);
      setTotal(result.total);
    } catch (reason) {
      if (requestId === requestRef.current) setError(reason.message);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [deferredQuery, folder, setError, sort, type]);

  useEffect(() => {
    const timer = setTimeout(() => fetchAssets(), 180);
    return () => clearTimeout(timer);
  }, [fetchAssets]);

  useEffect(() => {
    if (!nextCursor || !sentinelRef.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loading) fetchAssets({ append: true, cursor: nextCursor });
    }, { rootMargin: "240px" });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchAssets, loading, nextCursor]);

  useEffect(() => {
    const shortcuts = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u") {
        event.preventDefault();
        inputRef.current?.click();
      }
      if (event.key === "Escape") setPreview(null);
    };
    document.addEventListener("keydown", shortcuts);
    return () => document.removeEventListener("keydown", shortcuts);
  }, []);

  const addFiles = async (files) => {
    if (!files?.length) return;
    if (acceptType === "images" && [...files].some((file) => !file.type.startsWith("image/"))) {
      setError("This field accepts images only.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadMedia([...files], { folder: folder === "all" ? defaultFolder : folder, onProgress: setProgress });
      setNotice(`${uploaded.length} asset${uploaded.length === 1 ? "" : "s"} uploaded`);
      await fetchAssets();
      if (selectionMode) uploaded.forEach((asset) => onToggle?.(asset));
    } catch (reason) {
      setError(reason.message);
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const updateAsset = async (asset, patch) => {
    try {
      const updated = await apiFetch(`/api/admin/media/${asset.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, ...updated } : item));
      setPreview((current) => current?.id === asset.id ? { ...current, ...updated } : current);
      setNotice("Asset details updated");
    } catch (reason) { setError(reason.message); }
  };

  const remove = async (asset) => {
    if (!window.confirm(`Remove ${asset.file_name}? Referenced assets are protected automatically.`)) return;
    try {
      await apiFetch(`/api/admin/media/${asset.id}`, { method: "DELETE" });
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setTotal((current) => Math.max(0, current - 1));
      setPreview(null);
      setNotice("Asset removed");
    } catch (reason) { setError(reason.message); }
  };

  const replace = (asset) => {
    const picker = document.createElement("input");
    picker.type = "file"; picker.accept = MEDIA_ACCEPT;
    picker.onchange = async () => {
      const file = picker.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const updated = await replaceMedia(asset, file);
        setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, ...updated } : item));
        setPreview((current) => current?.id === asset.id ? { ...current, ...updated } : current);
        setNotice("Asset replaced without changing its URL");
      } catch (reason) { setError(reason.message); }
      finally { setUploading(false); }
    };
    picker.click();
  };

  const copyUrl = async (asset) => {
    try { await navigator.clipboard.writeText(asset.url); setNotice("Public URL copied"); }
    catch { setError("The browser could not copy the URL."); }
  };

  const choose = (asset) => {
    if (!selectionMode) { setPreview(asset); return; }
    if (!multiple && !selectedIds.has(asset.id) && !selectedUrls.has(asset.url)) onToggle?.(asset, true);
    else onToggle?.(asset);
  };

  return <div className={`media-library${selectionMode ? " is-picker" : ""}`}>
    <div className={`media-dropzone${dragging ? " is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}>
      <Upload aria-hidden="true" /><span><strong>Drop media here</strong><small>JPG, PNG, WEBP, SVG or PDF · 12 MB maximum</small></span>
      <button type="button" className="admin-primary" disabled={uploading} onClick={() => inputRef.current?.click()}>{uploading ? <LoaderCircle className="is-spinning" /> : <Upload />} {uploading ? `${progress?.complete || 0}/${progress?.total || "…"}` : "Browse files"}</button>
      <input ref={inputRef} hidden type="file" multiple accept={acceptType === "images" ? ".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" : MEDIA_ACCEPT} onChange={(event) => addFiles(event.target.files)} />
    </div>
    <div className="media-toolbar">
      <label className="media-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files or alt text" aria-label="Search media" />{query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X /></button> : null}</label>
      <select aria-label="Folder" value={folder} onChange={(event) => setFolder(event.target.value)}><option value="all">All folders</option>{MEDIA_FOLDERS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
      {acceptType === "all" ? <select aria-label="File type" value={type} onChange={(event) => setType(event.target.value)}><option value="all">All types</option><option value="images">Images</option><option value="documents">PDF documents</option></select> : <span className="media-filter-label">Images only</span>}
      <select aria-label="Sort media" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">File name</option><option value="largest">Largest first</option><option value="smallest">Smallest first</option></select>
      <div className="media-view-toggle" aria-label="View"><button type="button" className={view === "grid" ? "is-active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><Grid3X3 /></button><button type="button" className={view === "list" ? "is-active" : ""} onClick={() => setView("list")} aria-label="List view"><List /></button></div>
    </div>
    <div className="media-results-meta"><span>{total} assets</span><span>⌘/Ctrl + U to upload</span></div>
    {assets.length ? <div className={`media-results is-${view}`}>{assets.map((asset) => <MediaAsset key={asset.id} asset={asset} selected={selectedIds.has(asset.id) || selectedUrls.has(asset.url)} selectionMode={selectionMode} onChoose={() => choose(asset)} onPreview={() => setPreview(asset)} onCopy={() => copyUrl(asset)} onRemove={() => remove(asset)} />)}</div> : !loading ? <div className="admin-panel admin-empty"><ImageIcon /><h3>No media found</h3><p>Adjust the filters or upload the first asset in this folder.</p></div> : null}
    <div className="media-load-more" ref={sentinelRef}>{loading ? <><LoaderCircle className="is-spinning" /> Loading media…</> : nextCursor ? "Scroll for more" : assets.length ? "All assets loaded" : null}</div>
    {preview ? <MediaPreview asset={preview} onClose={() => setPreview(null)} onReplace={() => replace(preview)} onRemove={() => remove(preview)} onCopy={() => copyUrl(preview)} onUpdate={updateAsset} busy={uploading} /> : null}
  </div>;
}

function MediaAsset({ asset, selected, selectionMode, onChoose, onPreview, onCopy, onRemove }) {
  const image = asset.mime_type.startsWith("image/");
  return <article className={selected ? "is-selected" : ""}>
    <button className="media-asset-preview" type="button" onClick={onChoose} aria-label={`${selectionMode ? "Select" : "Preview"} ${asset.file_name}`}>
      {image ? <img src={asset.thumbnail_url || asset.url} alt={asset.alt_text || ""} loading="lazy" decoding="async" /> : <span className="media-document"><FileText />PDF</span>}
      {selectionMode ? <i className="media-check">{selected ? <Check /> : null}</i> : null}
    </button>
    <div className="media-asset-info"><strong title={asset.file_name}>{asset.file_name}</strong><span>{asset.folder} · {formatSize(asset.size_bytes)}</span><small>{asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}{asset.usage_count} uses</small></div>
    {selectionMode ? <button className="media-quick-preview" type="button" onClick={onPreview} aria-label={`Preview ${asset.file_name}`}><MoreHorizontal /></button> : <div className="media-asset-actions"><button type="button" onClick={onPreview} aria-label="Asset details"><MoreHorizontal /></button><button type="button" onClick={onCopy} aria-label="Copy public URL"><Clipboard /></button><button type="button" className="is-danger" onClick={onRemove} aria-label="Remove asset"><Trash2 /></button></div>}
  </article>;
}

function MediaPreview({ asset, onClose, onReplace, onRemove, onCopy, onUpdate, busy }) {
  const [altText, setAltText] = useState(asset.alt_text || "");
  const [folder, setFolder] = useState(asset.folder);
  return <div className="admin-modal media-preview-modal" role="dialog" aria-modal="true" aria-label={`Media details for ${asset.file_name}`}>
    <button className="admin-modal__scrim" type="button" onClick={onClose} aria-label="Close preview" />
    <section>
      <header><div><p>Media Library</p><h2>{asset.file_name}</h2></div><button type="button" onClick={onClose} aria-label="Close"><X /></button></header>
      <div className="media-preview-body">{asset.mime_type.startsWith("image/") ? <img src={asset.url} alt={asset.alt_text || ""} /> : <div className="media-document"><FileText /> PDF document</div>}
        <dl><div><dt>Public URL</dt><dd>{asset.url}</dd></div><div><dt>Storage path</dt><dd>{asset.key}</dd></div><div><dt>Dimensions</dt><dd>{asset.width && asset.height ? `${asset.width} × ${asset.height}` : "Not applicable"}</dd></div><div><dt>Size</dt><dd>{formatSize(asset.size_bytes)}</dd></div><div><dt>Type</dt><dd>{asset.mime_type}</dd></div><div><dt>Uploaded by</dt><dd>{asset.uploaded_by_name || "Administrator"}</dd></div><div><dt>Uploaded</dt><dd>{formatDate(asset.created_at)}</dd></div><div><dt>Usage</dt><dd>{asset.usage_count || 0} locations</dd></div></dl>
        <label>Alt text<input value={altText} maxLength="300" onChange={(event) => setAltText(event.target.value)} onBlur={() => altText !== (asset.alt_text || "") && onUpdate(asset, { altText })} /></label>
        <label>Folder<select value={folder} onChange={(event) => { setFolder(event.target.value); onUpdate(asset, { folder: event.target.value }); }}>{MEDIA_FOLDERS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      </div>
      <footer><button type="button" onClick={onCopy}><Clipboard /> Copy URL</button><a href={mediaDownloadUrl(asset)}><Download /> Download</a><button type="button" disabled={busy} onClick={onReplace}><RefreshCw /> Replace</button><button type="button" className="is-danger" onClick={onRemove}><Trash2 /> Remove</button></footer>
    </section>
  </div>;
}
