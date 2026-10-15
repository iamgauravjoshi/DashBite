import {
  BookOpenText,
  ChefHat,
  ClipboardList,
  History,
  Home,
  Info,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  ReceiptText,
  Repeat2,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Tag,
  Truck,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export type RoleKey = "public" | "customer" | "owner" | "delivery" | "admin";

export interface RoleNav {
  role: RoleKey;
  home: string;
  title: string;
  tagline: string;
  items: NavItem[];
}

export const publicNav: RoleNav = {
  role: "public",
  home: "/",
  title: "SmartMess",
  tagline: "Home-style meals, managed",
  items: [
    { href: "/discover", label: "Discover", description: "Find messes in your city", icon: Search },
    {
      href: "/how-it-works",
      label: "How it works",
      description: "Orders, plans, delivery",
      icon: Info
    },
    { href: "/pricing", label: "Pricing", description: "Customer and owner plans", icon: Tag },
    {
      href: "/for-owners",
      label: "For owners",
      description: "Run your mess on SmartMess",
      icon: Store
    }
  ]
};

export const customerNav: RoleNav = {
  role: "customer",
  home: "/app",
  title: "My meals",
  tagline: "Orders and subscriptions",
  items: [
    { href: "/app", label: "Home", description: "Upcoming meals at a glance", icon: Home },
    { href: "/app/discover", label: "Discover", description: "Find messes near you", icon: Search },
    {
      href: "/app/orders",
      label: "Orders",
      description: "One-time orders and status",
      icon: ReceiptText
    },
    {
      href: "/app/subscriptions",
      label: "Subscriptions",
      description: "Plans, skips, pauses",
      icon: Repeat2
    },
    {
      href: "/app/addresses",
      label: "Addresses",
      description: "Delivery addresses",
      icon: MapPin
    },
    { href: "/app/support", label: "Support", description: "Issues and help", icon: LifeBuoy }
  ]
};

export const ownerNav: RoleNav = {
  role: "owner",
  home: "/owner",
  title: "Mess console",
  tagline: "Menus, orders, kitchen",
  items: [
    { href: "/owner", label: "Overview", description: "Today at a glance", icon: LayoutDashboard },
    {
      href: "/owner/orders",
      label: "Orders",
      description: "One-time order queue",
      icon: ClipboardList
    },
    {
      href: "/owner/subscribers",
      label: "Subscribers",
      description: "Plans and entitlements",
      icon: Users
    },
    {
      href: "/owner/menus",
      label: "Menus",
      description: "Items, slots, windows",
      icon: BookOpenText
    },
    {
      href: "/owner/kitchen",
      label: "Kitchen",
      description: "Prep sheets and packing",
      icon: ChefHat
    },
    {
      href: "/owner/deliveries",
      label: "Deliveries",
      description: "Pickup and dispatch",
      icon: Truck
    },
    { href: "/owner/revenue", label: "Revenue", description: "Orders and payouts", icon: Wallet },
    { href: "/owner/settings", label: "Settings", description: "Profile and hours", icon: Settings }
  ]
};

/** Mess staff see a subset of the owner console. Enforced server-side from Phase 2. */
export const staffNavItems: string[] = ["/owner/orders", "/owner/kitchen", "/owner/deliveries"];

export const deliveryNav: RoleNav = {
  role: "delivery",
  home: "/delivery",
  title: "Delivery",
  tagline: "Tasks and completion",
  items: [
    {
      href: "/delivery",
      label: "My tasks",
      description: "Assigned pickups and drops",
      icon: Truck
    },
    {
      href: "/delivery/history",
      label: "History",
      description: "Completed deliveries",
      icon: History
    },
    {
      href: "/delivery/support",
      label: "Support",
      description: "Report a delivery issue",
      icon: LifeBuoy
    }
  ]
};

export const adminNav: RoleNav = {
  role: "admin",
  home: "/admin",
  title: "Platform admin",
  tagline: "Verify, oversee, reconcile",
  items: [
    { href: "/admin", label: "Overview", description: "Marketplace health", icon: LayoutDashboard },
    {
      href: "/admin/verifications",
      label: "Verifications",
      description: "Approve or suspend",
      icon: ShieldCheck
    },
    {
      href: "/admin/messes",
      label: "Messes",
      description: "Listings and status",
      icon: UtensilsCrossed
    },
    {
      href: "/admin/orders",
      label: "Orders",
      description: "Marketplace orders",
      icon: ClipboardList
    },
    {
      href: "/admin/finance",
      label: "Finance",
      description: "Commissions and payouts",
      icon: Wallet
    }
  ]
};

export const roleNavs: Record<RoleKey, RoleNav> = {
  public: publicNav,
  customer: customerNav,
  owner: ownerNav,
  delivery: deliveryNav,
  admin: adminNav
};

export function getNavForRole(role: RoleKey): RoleNav {
  return roleNavs[role];
}

/** Every shell route in Phase 1. Used by tests and route verification. */
export function allShellRoutes(): string[] {
  const routes = new Set<string>(["/"]);
  for (const nav of Object.values(roleNavs)) {
    for (const item of nav.items) routes.add(item.href);
  }
  routes.add("/how-it-works");
  routes.add("/pricing");
  routes.add("/for-owners");
  routes.add("/system");
  return [...routes].sort();
}
