import { NextResponse } from "next/server";
import { checkDatabase } from "@/lib/db";

export async function GET() {
  try {
    const db = await checkDatabase();
    return NextResponse.json({
      status: "ok",
      app: "smartmess",
      phase: "phase-0-foundation",
      timezone: process.env.APP_TIMEZONE ?? "Asia/Kolkata",
      database: db
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        database: { ok: false },
        error: error instanceof Error ? error.message : "unknown"
      },
      { status: 503 }
    );
  }
}
