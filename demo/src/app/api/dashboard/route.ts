import type { DashboardPayload } from "@/types/dashboard";
import { NextResponse } from "next/server";
import { loadDashboardPayload } from "@/server/load-dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data: DashboardPayload = await loadDashboardPayload();
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
