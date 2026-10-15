import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/data/PageHeader";
import { MessMenuSection } from "@/components/mess/MessMenuSection";
import { getPublicMess } from "@/lib/messes";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mess = await getPublicMess(slug);
  return { title: mess ? mess.name : "Kitchen not found" };
}

const DAY_LABELS: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday"
};

export default async function MessProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; slot?: string }>;
}) {
  const { slug } = await params;
  const { date, slot } = await searchParams;
  const mess = await getPublicMess(slug);
  if (!mess) notFound();
  const orderHref = date ? `/discover/${slug}/order?date=${date}` : `/discover/${slug}/order`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
      <Button variant="ghost" size="sm" className="w-fit" render={<Link href="/discover" />}>
        <ArrowLeft data-icon="inline-start" />
        All kitchens
      </Button>
      <PageHeader
        eyebrow={`${mess.locality} · ${mess.city}`}
        title={mess.name}
        description={mess.description ?? undefined}
      />
      <div className="flex flex-wrap gap-2">
        <Badge>Verified kitchen</Badge>
        <Badge variant="secondary">{mess.vegType.toLowerCase().replace("_", "-")}</Badge>
        {mess.pickupAllowed && <Badge variant="outline">Self-pickup</Badge>}
        {mess.deliveryAllowed && <Badge variant="outline">Delivery</Badge>}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4" aria-hidden="true" />
              Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="tnum text-sm">
              {mess.opensAt} – {mess.closesAt}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mess.operatingDays.map((d) => DAY_LABELS[d] ?? d).join(", ")}
            </p>
            <CardDescription className="mt-2">
              Order cutoffs are enforced at checkout from Phase 5.
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-4" aria-hidden="true" />
              Areas served
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {mess.serviceAreas.map((area) => (
                <Badge key={area} variant="secondary">
                  {area}
                </Badge>
              ))}
            </div>
            {mess.deliveryNote && (
              <p className="mt-2 text-sm text-muted-foreground">{mess.deliveryNote}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="size-4" aria-hidden="true" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {mess.line1}, {mess.locality}, {mess.city} {mess.pincode}
            </p>
            <p className="tnum mt-1 text-sm">{mess.phone}</p>
          </CardContent>
        </Card>
      </div>
      <MessMenuSection messId={mess.id} date={date ?? ""} slotId={slot ?? null} />
      <div>
        <Button render={<Link href={orderHref} />}>Order from this kitchen</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>How payment works here</CardTitle>
          <CardDescription>
            Pay at checkout and the kitchen confirms only if room remains — otherwise money comes
            straight back. Cancellations before the slot cutoff refund automatically. No ratings yet
            — reviews open with Phase 9 support tooling and only ever reflect verified orders.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
