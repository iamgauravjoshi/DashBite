import { Suspense } from "react";
import { PageHeader } from "@/components/data/PageHeader";
import { LoadingBlock } from "@/components/data/StateBlock";
import { MockPayPanel } from "@/components/order/MockPayPanel";

export const metadata = { title: "Test payment" };

export default function MockPayPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-12">
      <PageHeader
        eyebrow="Sandbox"
        title="Test payment"
        description="Development stand-in. Razorpay test mode replaces this before pilot."
      />
      <Suspense fallback={<LoadingBlock label="Loading payment…" />}>
        <MockPayPanel />
      </Suspense>
    </div>
  );
}
