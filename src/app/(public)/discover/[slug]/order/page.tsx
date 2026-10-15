import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/data/PageHeader";
import { CheckoutFlow } from "@/components/order/CheckoutFlow";
import { todayInTz } from "@/lib/ist";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mess = await db.mess.findUnique({ where: { slug }, select: { name: true } });
  return { title: mess ? `Order · ${mess.name}` : "Order" };
}

export default async function OrderPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { slug } = await params;
  const { date } = await searchParams;
  const mess = await db.mess.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!mess) notFound();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 md:px-6">
      <PageHeader
        eyebrow="Order"
        title={mess.name}
        description="Pick portions, choose pickup or delivery, review the exact total, then pay. Capacity is confirmed only when payment succeeds."
      />
      <CheckoutFlow slug={slug} initialDate={date ?? todayInTz()} />
    </div>
  );
}
