import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { getOwnerMess } from "@/lib/messes";
import { slotSchema } from "@/lib/menu-validation";

const DEFAULT_SLOTS = [
  { key: "BREAKFAST", name: "Breakfast", cutoffTime: "07:00", sortOrder: 0 },
  { key: "LUNCH", name: "Lunch", cutoffTime: "09:30", sortOrder: 1 },
  { key: "DINNER", name: "Dinner", cutoffTime: "16:00", sortOrder: 2 }
];

async function owned(request: Request, messId: string) {
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result;
  const mess = await getOwnerMess(result.user.id, messId);
  if (!mess) return { response: apiError("NOT_FOUND", 404) };
  return { user: result.user, mess };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const result = await owned(request, (await params).id);
  if ("response" in result) return result.response;
  const slots = await db.menuSlot.findMany({
    where: { messId: (await params).id },
    orderBy: { sortOrder: "asc" }
  });
  return NextResponse.json({ slots });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await owned(request, id);
  if ("response" in result) return result.response;
  const body = await request.json().catch(() => null);
  if (body && typeof body === "object" && (body as { defaults?: unknown }).defaults === true) {
    const existing = await db.menuSlot.count({ where: { messId: id } });
    if (existing > 0) return apiError("ALREADY_SETUP", 409);
    await db.menuSlot.createMany({ data: DEFAULT_SLOTS.map((s) => ({ ...s, messId: id })) });
    const slots = await db.menuSlot.findMany({
      where: { messId: id },
      orderBy: { sortOrder: "asc" }
    });
    return NextResponse.json({ slots }, { status: 201 });
  }
  const parsed = slotSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const key =
    parsed.data.key ??
    parsed.data.name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .slice(0, 20);
  try {
    const slot = await db.menuSlot.create({
      data: {
        messId: id,
        key,
        name: parsed.data.name,
        cutoffTime: parsed.data.cutoffTime,
        sortOrder: parsed.data.sortOrder ?? 0,
        active: parsed.data.active ?? true
      }
    });
    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return apiError("DUPLICATE_KEY", 409);
    throw error;
  }
}
