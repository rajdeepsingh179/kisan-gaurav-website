import { API_BASE_URL, apiFetch } from "./api";

export const MEDIA_FOLDERS = [
  ["general", "General"], ["products", "Products"], ["categories", "Categories"], ["banners", "Banners"],
  ["cms", "CMS"], ["homepage", "Homepage"], ["blog", "Blog"], ["seo", "SEO"],
];

export const MEDIA_ACCEPT = ".jpg,.jpeg,.png,.webp,.svg,.pdf,image/jpeg,image/png,image/webp,image/svg+xml,application/pdf";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml", "application/pdf"]);
const MAX_FILE_SIZE = 12_000_000;

export function validateMediaFile(file) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error(`${file.name} is not a supported JPG, PNG, WEBP, SVG or PDF file.`);
  if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} is larger than 12 MB.`);
}

async function imageInfo(file) {
  if (!file.type.startsWith("image/")) return { width: null, height: null, image: null, cleanup: () => {} };
  const objectUrl = URL.createObjectURL(file);
  const image = new window.Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error(`${file.name} could not be read as an image.`));
    image.src = objectUrl;
  });
  return { width: image.naturalWidth, height: image.naturalHeight, image, cleanup: () => URL.revokeObjectURL(objectUrl) };
}

function canvasBlob(canvas, type = "image/webp", quality = .82) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareMediaFile(original) {
  validateMediaFile(original);
  const info = await imageInfo(original);
  if (!info.image) return { file: original, width: null, height: null, thumbnail: null };
  try {
    let file = original;
    let width = info.width;
    let height = info.height;
    if (["image/jpeg", "image/png"].includes(original.type)) {
      const scale = Math.min(1, 2400 / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      canvas.getContext("2d").drawImage(info.image, 0, 0, canvas.width, canvas.height);
      const blob = await canvasBlob(canvas);
      if (blob) {
        file = new File([blob], `${original.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
        width = canvas.width;
        height = canvas.height;
      }
    }
    const thumbnailScale = Math.min(1, 480 / Math.max(info.width, info.height));
    const thumbnailCanvas = document.createElement("canvas");
    thumbnailCanvas.width = Math.max(1, Math.round(info.width * thumbnailScale));
    thumbnailCanvas.height = Math.max(1, Math.round(info.height * thumbnailScale));
    thumbnailCanvas.getContext("2d").drawImage(info.image, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
    const thumbnailBlob = await canvasBlob(thumbnailCanvas, "image/webp", .76);
    return {
      file,
      width,
      height,
      thumbnail: thumbnailBlob ? new File([thumbnailBlob], `${original.name.replace(/\.[^.]+$/, "")}-thumb.webp`, { type: "image/webp" }) : null,
    };
  } finally {
    info.cleanup();
  }
}

function uploadBody(prepared, folder, altText = "") {
  const body = new FormData();
  body.append("file", prepared.file);
  body.append("folder", folder);
  body.append("altText", altText);
  if (prepared.width) body.append("width", String(prepared.width));
  if (prepared.height) body.append("height", String(prepared.height));
  if (prepared.thumbnail) body.append("thumbnail", prepared.thumbnail);
  return body;
}

export async function uploadMedia(files, { folder = "general", altText = "", onProgress } = {}) {
  const assets = [];
  for (const [index, original] of [...files].entries()) {
    const prepared = await prepareMediaFile(original);
    assets.push(await apiFetch("/api/admin/uploads", { method: "POST", body: uploadBody(prepared, folder, altText) }));
    onProgress?.({ complete: index + 1, total: files.length, fileName: original.name });
  }
  return assets;
}

export async function replaceMedia(asset, original) {
  const prepared = await prepareMediaFile(original);
  return apiFetch(`/api/admin/media/${asset.id}/replace`, { method: "PUT", body: uploadBody(prepared, asset.folder, asset.alt_text || "") });
}

export const mediaDownloadUrl = (asset) => `${API_BASE_URL}/api/admin/media/${asset.id}/download`;
