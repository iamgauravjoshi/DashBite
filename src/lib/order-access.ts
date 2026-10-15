import { db } from "@/lib/db";

/** Order visibility: customer owns it, owner holds the mess, staff assigned, admin all. Null = 404 (no leaks). */
export async function visibleOrder(userId: string, role: string, orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      mess: { select: { id: true, name: true, slug: true, ownerId: true } },
      items: true,
      payments: { orderBy: { createdAt: "desc" }, include: { refunds: true } },
      fulfillmentRecord: { include: { attempts: { orderBy: { createdAt: "asc" } } } }
    }
  });
  if (!order) return null;
  if (order.customerId === userId) return order;
  if (role === "PLATFORM_ADMIN") return order;
  if (role === "MESS_OWNER" && order.mess.ownerId === userId) return order;
  if (role === "MESS_STAFF") {
    const assignment = await db.messStaff.findUnique({
      where: { messId_userId: { messId: order.messId, userId } }
    });
    if (assignment) return order;
  }
  return null;
}
