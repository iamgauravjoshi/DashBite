import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-10 md:px-6"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}
