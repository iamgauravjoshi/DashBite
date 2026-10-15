import { describe, expect, it } from "vitest";
import {
  allShellRoutes,
  ownerNav,
  roleNavs,
  staffNavItems,
  type RoleKey
} from "../src/config/navigation";

const roles: RoleKey[] = ["public", "customer", "owner", "delivery", "admin"];

describe("role navigation structure", () => {
  it("defines a home, title, and at least three items per role", () => {
    for (const role of roles) {
      const nav = roleNavs[role];
      expect(nav.home, `${role} home`).toMatch(/^\//);
      expect(nav.title.length, `${role} title`).toBeGreaterThan(0);
      expect(nav.items.length, `${role} items`).toBeGreaterThanOrEqual(3);
    }
  });

  it("uses absolute hrefs with no duplicates inside a role", () => {
    for (const role of roles) {
      const hrefs = roleNavs[role].items.map((item) => item.href);
      for (const href of hrefs) expect(href, `${role} href`).toMatch(/^\//);
      expect(new Set(hrefs).size, `${role} duplicates`).toBe(hrefs.length);
    }
  });

  it("exposes every nav href through allShellRoutes", () => {
    const routes = allShellRoutes();
    for (const role of roles) {
      for (const item of roleNavs[role].items) {
        expect(routes, item.href).toContain(item.href);
      }
    }
  });

  it("keeps staff to their assigned owner subset", () => {
    const ownerHrefs = new Set(ownerNav.items.map((item) => item.href));
    expect(staffNavItems.length).toBeGreaterThan(0);
    for (const href of staffNavItems) {
      expect(ownerHrefs.has(href), href).toBe(true);
    }
  });
});
