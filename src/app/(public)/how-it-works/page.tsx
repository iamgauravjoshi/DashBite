import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/data/PageHeader";

export const metadata = { title: "How it works" };

const faqs = [
  {
    q: "When do orders close?",
    a: "Every meal slot has its own cutoff in IST (for example lunch 09:30, dinner 16:00). After cutoff, your order or skip applies to the next eligible service day."
  },
  {
    q: "Does pausing refund me?",
    a: "No. Pausing preserves your meals or extends validity under the plan policy. Cash refunds only happen through an explicit cancellation or refund flow."
  },
  {
    q: "What if the mess closes new orders?",
    a: "Existing commitments stand. Confirmed orders and entitled subscription meals survive menu or availability changes — changes apply to new purchases only."
  },
  {
    q: "Pickup or delivery?",
    a: "Each order states exactly one fulfillment path: self-pickup, mess-managed delivery, or an assigned delivery agent. Addresses are visible only to authorized fulfillment participants."
  }
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
      <PageHeader
        eyebrow="Guide"
        title="How SmartMess works"
        description="The rules that keep customers, kitchens, and riders in sync."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {faqs.map((faq) => (
          <Card key={faq.q}>
            <CardHeader>
              <CardTitle>{faq.q}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{faq.a}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
