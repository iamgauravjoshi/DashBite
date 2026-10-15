import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/data/PageHeader";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
      <PageHeader
        eyebrow="Pricing"
        title="Simple money rules"
        description="Marketplace commission plus mess-owner SaaS plans. Exact numbers are configured before Phase 10 — the structure below is what you can rely on."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customers</CardTitle>
            <CardDescription>What you pay, shown before you confirm.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground">
              <li>Meal price set by the mess, visible per date and slot.</li>
              <li>Delivery charge only when delivery applies — never a surprise at checkout.</li>
              <li>
                Subscription terms: validity, holidays, skip and pause policy shown before purchase.
              </li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mess owners</CardTitle>
            <CardDescription>SaaS plans plus marketplace commission.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground">
              <li>SaaS plan unlocks console features by tier (menus, kitchen, reports).</li>
              <li>
                Commission applies per marketplace order, tracked separately from SaaS billing.
              </li>
              <li>Refunds and adjustments stay traceable to actor, reason, and record.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">No card storage, ever</Badge>
        <Badge variant="secondary">Idempotent webhooks</Badge>
        <Badge variant="outline">Plan numbers: Phase 10</Badge>
      </div>
    </div>
  );
}
