import Link from "next/link";
import { MapPin, SearchX } from "lucide-react";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/data/PageHeader";
import { EmptyBlock } from "@/components/data/StateBlock";
import { listDiscoverable } from "@/lib/messes";
import { discoverQuerySchema } from "@/lib/mess-validation";

export const metadata = { title: "Discover messes" };

const DEFAULT_CITY = process.env.APP_DEFAULT_CITY ?? "Pune";

export default async function DiscoverPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; locality?: string; veg?: string; fulfillment?: string }>;
}) {
  const raw = await searchParams;
  const parsed = discoverQuerySchema.safeParse({
    q: raw.q || undefined,
    locality: raw.locality || undefined,
    veg: raw.veg || undefined,
    fulfillment: raw.fulfillment || undefined
  });
  const filters = {
    city: DEFAULT_CITY,
    ...(parsed.success ? parsed.data : {})
  };
  const messes = await listDiscoverable(filters);
  const areas = await db.mess.findMany({
    where: { city: DEFAULT_CITY, published: true, verificationStatus: "APPROVED" },
    select: { locality: true, serviceAreas: true }
  });
  const localities = [...new Set(areas.flatMap((m) => [m.locality, ...m.serviceAreas]))].sort();
  const filtering = Boolean(filters.q || filters.locality || filters.veg || filters.fulfillment);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
      <PageHeader
        eyebrow="Discovery"
        title="Find a mess near you"
        description={`Only approved, published kitchens in ${DEFAULT_CITY} appear here — with hours, prices from Phase 4 menus, and pickup or delivery options.`}
      />
      <form
        method="get"
        aria-label="Search messes"
        className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-end"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="discover-q" className="text-sm font-medium">
            Search
          </label>
          <input
            id="discover-q"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Name, dish, or locality"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="discover-locality" className="text-sm font-medium">
            Locality
          </label>
          <select
            id="discover-locality"
            name="locality"
            defaultValue={filters.locality ?? ""}
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">All localities</option>
            {localities.map((locality) => (
              <option key={locality} value={locality}>
                {locality}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="discover-veg" className="text-sm font-medium">
            Food
          </label>
          <select
            id="discover-veg"
            name="veg"
            defaultValue={filters.veg ?? ""}
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Veg + non-veg</option>
            <option value="VEG">Veg</option>
            <option value="NON_VEG">Non-veg</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="discover-fulfillment" className="text-sm font-medium">
            Get it by
          </label>
          <select
            id="discover-fulfillment"
            name="fulfillment"
            defaultValue={filters.fulfillment ?? ""}
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Pickup or delivery</option>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
        <Button type="submit">Search</Button>
      </form>

      {messes.length === 0 ? (
        <EmptyBlock
          icon={filtering ? <SearchX /> : <MapPin />}
          title={filtering ? "No messes match" : "No listings yet"}
          description={
            filtering
              ? "Try a different search or clear the filters. Only verified kitchens appear here."
              : "When kitchens are approved and published, they will appear here with hours and fulfillment options."
          }
          action={
            filtering ? (
              <Button variant="outline" render={<Link href="/discover" />}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="tnum text-sm text-muted-foreground" role="status">
            {messes.length} verified {messes.length === 1 ? "kitchen" : "kitchens"} in{" "}
            {DEFAULT_CITY}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {messes.map((mess) => (
              <Card key={mess.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/discover/${mess.slug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {mess.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {mess.locality} · {mess.vegType.toLowerCase().replace("_", "-")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {mess.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{mess.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">Verified</Badge>
                    {mess.pickupAllowed && <Badge variant="outline">Pickup</Badge>}
                    {mess.deliveryAllowed && <Badge variant="outline">Delivery</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {mess.operatingDays.join(" · ")} · {mess.opensAt}–{mess.closesAt}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/discover/${mess.slug}`} />}
                  >
                    View kitchen
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
