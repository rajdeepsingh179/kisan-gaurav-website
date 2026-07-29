export const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export const isAdminRole = (role) => ADMIN_ROLES.has(role);

export const formatRole = (role = "") => role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
