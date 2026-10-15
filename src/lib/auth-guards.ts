import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  ROLE_HOME,
  UserRoleSchema,
  UserStatusSchema,
  canEnterSegment,
  safeNextPath,
  type UserRole,
  type UserStatus
} from "@/lib/roles";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
  banned: boolean;
}

/** Server-side session read. Returns null when signed out. Never throws for anonymous users. */
export async function getSessionUser(explicitHeaders?: Headers): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: explicitHeaders ?? (await headers()) });
  if (!session?.user) return null;
  const raw = session.user as unknown as Record<string, unknown>;
  const role = UserRoleSchema.safeParse(raw.role);
  const status = UserStatusSchema.safeParse(raw.status);
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    emailVerified: Boolean(raw.emailVerified),
    role: role.success ? role.data : "CUSTOMER",
    status: status.success ? status.data : "UNVERIFIED",
    banned: Boolean(raw.banned)
  };
}

/**
 * Require a usable account: signed in, verified, active, unbanned.
 * Redirects (never renders protected content) for each failure mode.
 */
export async function requireUsableAccount(next: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (user.banned || user.status === "SUSPENDED") redirect("/suspended");
  if (user.status === "INACTIVE") redirect("/suspended?reason=deactivated");
  if (!user.emailVerified || user.status === "UNVERIFIED")
    redirect("/verify-email?notice=required");
  return user;
}

/**
 * Require access to a specific shell path: usable account + role segment.
 * Call at the top of protected layouts/pages with the literal route path.
 */
export async function requirePageAccess(pathname: string): Promise<SessionUser> {
  const user = await requireUsableAccount(pathname);
  if (!canEnterSegment(user.role, pathname)) redirect("/forbidden");
  return user;
}

/** Post-auth landing per role. Falls back to a safe default for unknown values. */
export function homeForRole(role: UserRole): string {
  return ROLE_HOME[role] ?? "/app";
}

export { safeNextPath };

export function apiError(code: string, status: number, details?: string[]) {
  return NextResponse.json({ error: { code, ...(details ? { details } : {}) } }, { status });
}

/** API-layer gate: authenticated + usable + optional role allowlist. */
export async function requireApiUser(
  request: Request,
  roles?: UserRole[]
): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = await getSessionUser(request.headers);
  if (!user) return { response: apiError("UNAUTHENTICATED", 401) };
  if (user.banned || user.status === "SUSPENDED") return { response: apiError("SUSPENDED", 403) };
  if (user.status === "INACTIVE") return { response: apiError("DEACTIVATED", 403) };
  if (!user.emailVerified || user.status === "UNVERIFIED")
    return { response: apiError("UNVERIFIED", 403) };
  if (roles && !roles.includes(user.role)) return { response: apiError("FORBIDDEN", 403) };
  return { user };
}
