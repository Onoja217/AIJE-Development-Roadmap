import type { ReactNode } from "react";
import { PermissionRoute } from "@/features/access/PermissionRoute";

/**
 * Backward-compatible platform administrator guard. Permission resolution is
 * performed by get_my_access_context(), which does not expose the internal
 * has_role helper to arbitrary client calls.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  return <PermissionRoute platformOnly>{children}</PermissionRoute>;
}

export default AdminRoute;
