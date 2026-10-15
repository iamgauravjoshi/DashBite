import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/auth-guards";
import { myTasks, taskHistory } from "@/lib/fulfillment";

export async function GET(request: Request): Promise<NextResponse> {
  const result = await requireApiUser(request, ["DELIVERY_AGENT"]);
  if ("response" in result) return result.response;
  const { searchParams } = new URL(request.url);
  if (searchParams.get("history") === "true") {
    return NextResponse.json({ tasks: await taskHistory(result.user.id) });
  }
  return NextResponse.json({ tasks: await myTasks(result.user.id) });
}
