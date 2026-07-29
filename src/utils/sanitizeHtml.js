export function sanitizeHtml(html = "") {
  if (typeof window === "undefined") return "";
  const documentNode = new DOMParser().parseFromString(String(html), "text/html");
  const allowedTags = new Set([
    "a", "b", "blockquote", "br", "code", "del", "div", "em", "figcaption", "figure",
    "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre",
    "span", "strong", "table", "tbody", "td", "th", "thead", "tr", "u", "ul",
  ]);
  const blockedTags = new Set(["applet", "base", "embed", "form", "iframe", "link", "math", "meta", "object", "script", "style", "svg"]);
  const allowedAttributes = {
    a: new Set(["href", "title", "target"]),
    img: new Set(["src", "alt", "title", "width", "height", "loading"]),
    td: new Set(["colspan", "rowspan"]),
    th: new Set(["colspan", "rowspan", "scope"]),
  };
  const safeUrl = (value, image = false) => {
    const source = String(value || "").trim();
    if (!source || [...source].some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    })) return false;
    if (source.startsWith("/") && !source.startsWith("//")) return true;
    if (!image && source.startsWith("#")) return true;
    try {
      const protocol = new URL(source, window.location.origin).protocol;
      return image ? ["http:", "https:"].includes(protocol) : ["http:", "https:", "mailto:", "tel:"].includes(protocol);
    } catch {
      return false;
    }
  };
  [...documentNode.body.querySelectorAll("*")].reverse().forEach((node) => {
    const tag = node.tagName.toLowerCase();
    if (!allowedTags.has(tag)) {
      if (blockedTags.has(tag)) node.remove();
      else node.replaceWith(...node.childNodes);
      return;
    }
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (!allowedAttributes[tag]?.has(name)) node.removeAttribute(attribute.name);
    });
    if (tag === "a" && !safeUrl(node.getAttribute("href"))) node.removeAttribute("href");
    if (tag === "img" && !safeUrl(node.getAttribute("src"), true)) node.remove();
    if (tag === "a" && node.getAttribute("target") === "_blank") node.setAttribute("rel", "noopener noreferrer");
    if (tag === "img") node.setAttribute("loading", "lazy");
  });
  return documentNode.body.innerHTML;
}
