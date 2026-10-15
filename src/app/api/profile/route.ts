import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-guards";
import { profileSchema } from "@/lib/auth-validation";

function blocked(user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>) {
  if (user.banned || user.status === "SUSPENDED")
    return NextResponse.json({ error: { code: "SUSPENDED" } }, { status: 403 });
  if (user.status === "INACTIVE")
    return NextResponse.json({ error: { code: "DEACTIVATED" } }, { status: 403 });
  if (!user.emailVerified || user.status === "UNVERIFIED")
    return NextResponse.json({ error: { code: "UNVERIFIED" } }, { status: 403 });
  return null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getSessionUser(request.headers);
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const stop = blocked(user);
  if (stop) return stop;
  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, phone: true, role: true, status: true }
  });
  if (!record) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  return NextResponse.json({ profile: record });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const user = await getSessionUser(request.headers);
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const stop = blocked(user);
  if (stop) return stop;
  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID", details: parsed.error.issues.map((i) => i.message) } },
      { status: 400 }
    );
  }
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null
    },
    select: { id: true, name: true, email: true, phone: true, role: true, status: true }
  });
  return NextResponse.json({ profile: updated });
}
