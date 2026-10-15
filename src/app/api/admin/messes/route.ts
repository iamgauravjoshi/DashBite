import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/auth-guards";

export async function GET(request: Request): Promise<NextResponse> {
  const result = await requireApiUser(request, ["PLATFORM_ADMIN"]);
  if ("response" in result) return result.response;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();
  const messes = await db.mess.findMany({
    where: {
      ...(status ? { verificationStatus: status as never } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { locality: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: { owner: { select: { id: true, name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  return NextResponse.json({ messes });
}
