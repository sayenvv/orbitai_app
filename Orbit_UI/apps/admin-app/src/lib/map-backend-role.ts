import type { Role } from "@/lib/rbac";

/** Maps backend roles to demo RBAC role ids — UI only; APIs enforce real permissions. */
export function mapBackendRoleToDemoRole(backendRole: string): Role {
  switch (backendRole.trim().toLowerCase()) {
    case "superadmin":
      return "super_admin";
    case "admin":
      return "admin";
    case "operator":
      return "support";
    default:
      return "viewer";
  }
}
