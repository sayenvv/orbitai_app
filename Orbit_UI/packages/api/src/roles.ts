export function isAdminRole(role: string): boolean {
  return role === "admin" || role === "superadmin";
}

export function isOperatorRole(role: string): boolean {
  return role === "operator" || role === "admin" || role === "superadmin";
}
