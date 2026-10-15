"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { profilePath } from "@/lib/roles";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth-guards";

function initials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/") }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar>
        <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
      </Avatar>
      <div className="hidden min-w-0 flex-col leading-tight lg:flex">
        <span className="truncate text-sm font-medium">{user.name}</span>
        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={profilePath(user.role)} aria-label="Open your profile" />}
      >
        <UserRound data-icon="inline-start" />
        <span className="hidden sm:inline">Profile</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={signOut} aria-label={`Sign out ${user.email}`}>
        <LogOut data-icon="inline-start" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </div>
  );
}
