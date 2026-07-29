export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...options.headers },
  });
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();
  if (!response.ok) throw new Error(data?.error || data?.message || "Request failed.");
  if (path.startsWith("/api/") && !isJson) {
    throw new Error("The API returned an unexpected response.");
  }
  return data;
}

export async function authCsrf() {
  return apiFetch("/api/auth/csrf");
}
