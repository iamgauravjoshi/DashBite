import Link from "next/link";
import { cn } from "@/lib/utils";

export function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
      aria-label="SmartMess home"
    >
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
      >
        S
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-base font-semibold tracking-tight">SmartMess</span>
          <span className="text-xs text-muted-foreground">Mess &amp; tiffin OS</span>
        </span>
      )}
    </Link>
  );
}

export function RoleMark({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full bg-secondary px-2.5 text-xs font-medium text-secondary-foreground",
        className
      )}
    >
      {label}
    </span>
  );
}
