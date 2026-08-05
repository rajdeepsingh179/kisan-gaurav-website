import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const serverDirectory = resolve(root, "dist/server");
const metadataDirectory = resolve(root, "dist/.openai");

await mkdir(serverDirectory, { recursive: true });
await mkdir(metadataDirectory, { recursive: true });
await copyFile(resolve(root, ".openai/hosting.json"), resolve(metadataDirectory, "hosting.json"));

await writeFile(resolve(serverDirectory, "index.js"), `export default {
  async fetch(request, env) {
    if (!env?.ASSETS?.fetch) {
      return new Response("Site assets are unavailable.", { status: 503 });
    }

    let response = await env.ASSETS.fetch(request);
    const url = new URL(request.url);
    const acceptsHtml = (request.headers.get("Accept") || "").includes("text/html");
    if (response.status === 404 && request.method === "GET" && acceptsHtml) {
      response = await env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
    }
    return response;
  },
};
`, "utf8");
