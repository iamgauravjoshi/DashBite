"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu } from "lucide-react";
import { AppLogo } from "@/components/brand/AppLogo";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { publicNav } from "@/config/navigation";
import type { SessionUser } from "@/lib/auth-guards";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicShell({
  children,
  user
}: {
  children: React.ReactNode;
  user?: SessionUser | null;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <AppLogo />
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {publicNav.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  isActive(pathname, item.href)
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <>
                <Button variant="outline" size="sm" render={<Link href="/sign-in" />}>
                  Sign in
                </Button>
                <Button size="sm" render={<Link href="/for-owners" />}>
                  For owners
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </>
            )}
          </div>
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="outline" size="sm" aria-label="Open site menu">
                    <Menu data-icon="inline-start" />
                    Menu
                  </Button>
                }
              />
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>SmartMess</SheetTitle>
                  <SheetDescription>Home-style meals, managed</SheetDescription>
                </SheetHeader>
                <nav aria-label="Primary (mobile)" className="flex flex-col gap-1 px-4 pb-4">
                  {[
                    { href: "/", label: "Home", description: "SmartMess overview" },
                    ...publicNav.items
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      className={cn(
                        "rounded-lg px-3 py-2.5 text-sm",
                        isActive(pathname, item.href)
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-auto border-t p-4">
                  {user ? (
                    <UserMenu user={user} />
                  ) : (
                    <Button className="w-full" render={<Link href="/sign-in" />}>
                      Sign in
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex flex-col gap-1">
            <AppLogo />
            <p className="text-xs text-muted-foreground">
              Hybrid marketplace + SaaS for messes and tiffin centers. One city at launch.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-1">
            {publicNav.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
