import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

export const statement = { ...defaultStatements } as const;
export const ac = createAccessControl(statement);

/** Full marketplace oversight. Only PLATFORM_ADMIN holds these. */
export const platformAdmin = ac.newRole({ ...adminAc.statements });

/** No admin-console permissions; product access is enforced by src/lib/roles.ts segment guards. */
const noAdminAccess = { user: [], session: [] } as const;

export const customer = ac.newRole(noAdminAccess);
export const messOwner = ac.newRole(noAdminAccess);
export const messStaff = ac.newRole(noAdminAccess);
export const deliveryAgent = ac.newRole(noAdminAccess);

export const authRoles = {
  CUSTOMER: customer,
  MESS_OWNER: messOwner,
  MESS_STAFF: messStaff,
  DELIVERY_AGENT: deliveryAgent,
  PLATFORM_ADMIN: platformAdmin
};
