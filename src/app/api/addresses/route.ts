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

export async function GET(request: Request): Promise<NextResponse> {
  const result = await usable(request);
  if ("response" in result) return result.response;
  const addresses = await db.address.findMany({
    where: { userId: result.user.id },
    select,
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
  });
  return NextResponse.json({ addresses });
}

export async function POST(request: Request): Promise<NextResponse> {
  const result = await usable(request);
  if ("response" in result) return result.response;
  const body = await request.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID", details: parsed.error.issues.map((i) => i.message) } },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const created = await db.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId: result.user.id } });
    const makeDefault = data.isDefault || count === 0;
    if (makeDefault) {
      await tx.address.updateMany({
        where: { userId: result.user.id },
        data: { isDefault: false }
      });
    }
    return tx.address.create({
      data: {
        userId: result.user.id,
        label: data.label,
        line1: data.line1,
        line2: data.line2 || null,
        locality: data.locality,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        phone: data.phone || null,
        isDefault: makeDefault
      },
      select
    });
  });
  return NextResponse.json({ address: created }, { status: 201 });
}
