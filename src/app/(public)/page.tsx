import Link from "next/link";
import { ArrowRight, CalendarClock, ClipboardCheck, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/data/PageHeader";

const steps = [
  {
    icon: Search,
    title: "Discover verified messes",
    body: "Browse messes serving your locality. Only approved, published kitchens appear — with hours, pickup and delivery options, and prices up front."
  },
  {
    icon: CalendarClock,
    title: "Order once or subscribe",
    body: "Grab a single meal or subscribe for the month. Skip a day, pause a week, and see remaining meals before you confirm anything."
  },
  {
    icon: ClipboardCheck,
    title: "Kitchen counts on it",
    body: "Every confirmed order and subscription meal lands in the kitchen prep sheet, so the right quantity gets cooked — no silent surprises."
  }
];

const roles = [
  {
    href: "/app",
    title: "Customers",
    body: "Orders, subscriptions, skips and pauses, support — one home for your meals."
  },
  {
    href: "/owner",
    title: "Mess owners",
    body: "Menus, order windows, capacity, kitchen sheets, deliveries, revenue."
  },
  {
    href: "/delivery",
    title: "Delivery",
    body: "Assigned tasks, addresses for your stops only, completion records."
  },
  {
    href: "/admin",
    title: "Platform admin",
    body: "Verification, marketplace oversight, commissions and finance."
  }
];

export default function LandingPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 md:gap-16 md:px-6 md:py-14">
      {/* Hero */}
      <section aria-labelledby="hero-heading" className="flex flex-col gap-6 md:max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>One-city launch</Badge>
          <Badge variant="outline">Every mess verified</Badge>
          <Badge variant="outline">Prices before you pay</Badge>
        </div>
        <h1
          id="hero-heading"
          className="text-4xl font-semibold tracking-tight text-balance md:text-6xl"
        >
          Home-style mess meals, on autopilot.
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          SmartMess pairs customers with neighborhood messes and tiffin centers — and gives owners a
          console that turns subscriptions into exact kitchen quantities every day.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg" render={<Link href="/discover" />}>
            Find a mess
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/for-owners" />}>
            Run your mess here
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Ordering and subscriptions open with Phase 5–6. Today you can explore the shells and the
          plan.
        </p>
      </section>

      {/* Steps */}
      <section aria-labelledby="how-heading" className="flex flex-col gap-6">
        <PageHeader
          eyebrow="How it works"
          title="From craving to cooked, without chaos"
          description="The loop that keeps customers fed and kitchens precise."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <Card key={step.title}>
              <CardHeader>
                <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                  <step.icon className="size-4" aria-hidden="true" />
                </span>
                <CardTitle>{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{step.body}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section aria-labelledby="roles-heading" className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Who it serves"
          title="One platform, four consoles"
          description="Each role gets its own navigation and workspace. Shells are live to explore; business logic arrives phase by phase."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => (
            <Card key={role.href}>
              <CardHeader>
                <CardTitle>{role.title}</CardTitle>
                <CardDescription>{role.body}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" render={<Link href={role.href} />}>
                  Open {role.title.toLowerCase()} shell
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Differentiator */}
      <section aria-labelledby="diff-heading" className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Why SmartMess"
          title="Subscriptions the kitchen can trust"
          description="Skips, pauses, and renewals are entitlement operations — not date hacks. Every change flows into tomorrow's prep counts and the customer's remaining-meal balance, with the consequence shown before confirmation."
        />
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Skip with cutoff</Badge>
          <Badge variant="secondary">Pause, not refund</Badge>
          <Badge variant="secondary">Shared capacity</Badge>
          <Badge variant="secondary">Idempotent payments</Badge>
          <Badge variant="secondary">IST cutoffs</Badge>
        </div>
      </section>
    </div>
  );
}
