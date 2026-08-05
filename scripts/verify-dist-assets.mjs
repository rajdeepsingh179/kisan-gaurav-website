import { access, readFile } from "node:fs/promises";
import { extname, join, normalize, relative, resolve } from "node:path";

const dist = resolve("dist");
const html = await readFile(join(dist, "index.html"), "utf8");
const references = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);

if (!references.length) {
  throw new Error("Production index.html does not reference any bundled assets.");
}

for (const reference of new Set(references)) {
  const relativePath = normalize(reference.replace(/^\/+/, ""));
  const absolutePath = resolve(dist, relativePath);
  if (relative(dist, absolutePath).startsWith("..")) {
    throw new Error(`Asset path escapes dist: ${reference}`);
  }
  await access(absolutePath);
  if (![".css", ".js"].includes(extname(absolutePath))) {
    throw new Error(`Unexpected executable asset type: ${reference}`);
  }
}

const redirects = await readFile(join(dist, "_redirects"), "utf8");
if (/^\s*\/\*\s+(?:\/|\/index\.html)\s+200\s*$/m.test(redirects)) {
  throw new Error("Catch-all SPA rewrite would allow missing assets to return index.html.");
}

const manifest = JSON.parse(await readFile(join(dist, ".vite", "manifest.json"), "utf8"));
if (!Object.keys(manifest).length) {
  throw new Error("Vite asset manifest is empty.");
}

console.log(`Verified ${new Set(references).size} HTML asset references and ${Object.keys(manifest).length} manifest entries.`);
