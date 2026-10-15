import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/data/PageHeader";

export const metadata = { title: "For owners" };

const points = [
  {
    title: "Publish once",
    body: "Profile, service areas, hours, holidays. Verification states stay auditable."
  },
  {
    title: "Control every slot",
    body: "Prices, cutoffs, capacity, pickup and delivery — per breakfast, lunch, dinner."
  },
  {
    title: "Cook the right count",
    body: "Prep sheets fuse one-time orders with subscription entitlements. No double-counting."
  },
  {
    title: "Deliver your way",
    body: "Self-pickup, your staff, or assigned agents — with failure reasons that resolve."
  }
];

export default function ForOwnersPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
      <PageHeader
        eyebrow="For mess owners"
        title="Your kitchen, precisely run"
        description="Onboarding opens in Phase 3. The console shell is ready to explore today."
        actions={<Button render={<Link href="/owner" />}>Open owner shell</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {points.map((point) => (
          <Card key={point.title}>
            <CardHeader>
              <CardTitle>{point.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{point.body}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
