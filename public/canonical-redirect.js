(() => {
  const hostname = window.location.hostname.toLowerCase();
  const isDeploymentHost = hostname.endsWith(".kisan-gaurav-website.pages.dev");
  if (hostname !== "www.kisangaurav.com" && !isDeploymentHost) return;

  const canonical = new URL(window.location.href);
  canonical.protocol = "https:";
  canonical.host = "kisangaurav.com";
  window.location.replace(canonical.toString());
})();
