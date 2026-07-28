export function sanitizeHtml(html = "") {
  if (typeof window === "undefined") return "";
  const documentNode = new DOMParser().parseFromString(String(html), "text/html");
  documentNode.querySelectorAll("script,style,iframe,object,embed,form").forEach((node) => node.remove());
  documentNode.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase(); const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on") || ((name === "href" || name === "src") && value.startsWith("javascript:"))) node.removeAttribute(attribute.name);
    });
  });
  return documentNode.body.innerHTML;
}
