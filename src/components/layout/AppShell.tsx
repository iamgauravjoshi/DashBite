"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { AppLogo, RoleMark } from "@/components/brand/AppLogo";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { getNavForRole, staffNavItems, type RoleKey, type RoleNav } from "@/config/navigation";
import type { SessionUser } from "@/lib/auth-guards";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  description,
  icon: Icon,
  active,
  onNavigate
}: {
  href: string;
  label: string;
  description: string;
  icon: RoleNav["items"][number]["icon"];
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      title={description}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function AppShell({
  role,
  roleLabel,
  user,
  children
}: {
  role: RoleKey;
  roleLabel: string;
  user: SessionUser;
  children: React.ReactNode;
}) {
  const fullNav: RoleNav = getNavForRole(role);
  // Staff see only assigned sections. Hiding is UX, not enforcement (BR-10):
  // every page and API still checks server-side.
  const nav: RoleNav =
    roleLabel === "Staff"
      ? { ...fullNav, items: fullNav.items.filter((i) => staffNavItems.includes(i.href)) }
      : fullNav;
  const pathname = usePathname();
  const bottomItems = nav.items.slice(0, 4);
  const hasMore = nav.items.length > 4;

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <div className="mx-auto flex min-h-dvh w-full max-w-7xl">
        {/* Desktop sidebar */}
        <aside
          aria-label={`${nav.title} navigation`}
          className="hidden w-64 shrink-0 flex-col gap-4 border-r p-4 md:flex"
        >
          <div className="flex items-center justify-between gap-2 px-1">
            <AppLogo />
          </div>
          <RoleMark label={roleLabel} />
          <nav aria-label={nav.title} className="flex flex-col gap-1">
            {nav.items.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                description={item.description}
                icon={item.icon}
                active={isActive(pathname, item.href)}
              />
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            <Separator />
            <UserMenu user={user} />
            <p className="px-1 text-xs text-muted-foreground">{nav.tagline}</p>
          </div>
        </aside>

        {/* Content column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur md:hidden">
            <AppLogo compact />
            <div className="flex items-center gap-2">
              <RoleMark label={roleLabel} />
              <Sheet>
                <SheetTrigger
                  render={
                    <Button variant="outline" size="sm" aria-label={`Open ${nav.title} menu`}>
                      <Menu data-icon="inline-start" />
                      Menu
                    </Button>
                  }
                />
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>{nav.title}</SheetTitle>
                    <SheetDescription>{nav.tagline}</SheetDescription>
                  </SheetHeader>
                  <nav aria-label={`${nav.title} (all)`} className="flex flex-col gap-1 px-4 pb-4">
                    {nav.items.map((item) => (
                      <NavLink
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        description={item.description}
                        icon={item.icon}
                        active={isActive(pathname, item.href)}
                      />
                    ))}
                  </nav>
                  <div className="mt-auto border-t p-4">
                    <UserMenu user={user} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>

          {/* Desktop top strip */}
          <div className="hidden items-center justify-between gap-2 px-6 pt-4 md:flex">
            <p className="text-xs text-muted-foreground">
              {nav.title} · {nav.tagline}
            </p>
          </div>

          <main id="main-content" className="flex-1 px-4 pt-4 pb-24 md:px-6 md:pt-6 md:pb-10">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label={`${nav.title} (primary)`}
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-5 gap-1 px-2 py-2">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[11px] leading-none",
                  active ? "bg-muted font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          {hasMore && (
            <Sheet>
              <SheetTrigger
                render={
                  <button
                    type="button"
                    aria-label={`More ${nav.title} sections`}
                    className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[11px] leading-none text-muted-foreground"
                  >
                    <Menu className="size-5" aria-hidden="true" />
                    <span>More</span>
                  </button>
                }
              />
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>All sections</SheetTitle>
                  <SheetDescription>{nav.tagline}</SheetDescription>
                </SheetHeader>
                <nav aria-label={`${nav.title} (more)`} className="flex flex-col gap-1 px-4 pb-6">
                  {nav.items.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      description={item.description}
                      icon={item.icon}
                      active={isActive(pathname, item.href)}
                    />
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </nav>
    </div>
  );
}
