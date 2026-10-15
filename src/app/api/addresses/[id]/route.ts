import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, type SessionUser } from "@/lib/auth-guards";
import { addressSchema } from "@/lib/auth-validation";

type Usable = { response: NextResponse } | { user: SessionUser };

async function usable(request: Request): Promise<Usable> {
  const user = await getSessionUser(request.headers);
  if (!user)
    return { response: NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 }) };
  if (user.banned || user.status === "SUSPENDED")
    return { response: NextResponse.json({ error: { code: "SUSPENDED" } }, { status: 403 }) };
  if (user.status === "INACTIVE")
    return { response: NextResponse.json({ error: { code: "DEACTIVATED" } }, { status: 403 }) };
  if (!user.emailVerified || user.status === "UNVERIFIED")
    return { response: NextResponse.json({ error: { code: "UNVERIFIED" } }, { status: 403 }) };
  return { user };
}

const select = {
  id: true,
  label: true,
  line1: true,
  line2: true,
  locality: true,
  city: true,
  state: true,
  pincode: true,
  phone: true,
  isDefault: true
} as const;

async function owned(userId: string, id: string) {
  return db.address.findFirst({ where: { id, userId }, select: { id: true, isDefault: true } });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const result = await usable(request);
  if ("response" in result) return result.response;
  const { id } = await params;
  const existing = await owned(result.user.id, id);
  if (!existing) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  const body = await request.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID", details: parsed.error.issues.map((i) => i.message) } },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const updated = await db.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({
        where: { userId: result.user.id },
        data: { isDefault: false }
      });
    }
    return tx.address.update({
      where: { id },
      data: {
        label: data.label,
        line1: data.line1,
        line2: data.line2 || null,
        locality: data.locality,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        phone: data.phone || null,
        isDefault: data.isDefault ?? existing.isDefault
      },
      select
    });
  });
  return NextResponse.json({ address: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const result = await usable(request);
  if ("response" in result) return result.response;
  const { id } = await params;
  const existing = await owned(result.user.id, id);
  if (!existing) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  await db.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });
    if (existing.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId: result.user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true }
      });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
  return NextResponse.json({ deleted: id });
}
