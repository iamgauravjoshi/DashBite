import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { getOwnerMess } from "@/lib/messes";
import { itemSchema } from "@/lib/menu-validation";

async function owned(request: Request, messId: string) {
  const result = await requireApiUser(request, ["MESS_OWNER"]);
  if ("response" in result) return result;
  if (!(await getOwnerMess(result.user.id, messId)))
    return { response: apiError("NOT_FOUND", 404) };
  return { user: result.user };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await owned(request, id);
  if ("response" in result) return result.response;
  const items = await db.menuItem.findMany({ where: { messId: id }, orderBy: { name: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const result = await owned(request, id);
  if ("response" in result) return result.response;
  const body = await request.json().catch(() => null);
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID",
      400,
      parsed.error.issues.map((i) => i.message)
    );
  }
  const data = parsed.data;
  const item = await db.menuItem.create({
    data: {
      messId: id,
      name: data.name,
      description: data.description || null,
      pricePaise: data.pricePaise,
      vegType: data.vegType,
      photoUrl: data.photoUrl || null,
      active: data.active ?? true
    }
  });
  return NextResponse.json({ item }, { status: 201 });
}
