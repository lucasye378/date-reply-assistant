import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, feature, ...rest } = body;
    const timestamp = new Date().toISOString();
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const ua = request.headers.get("user-agent") || "unknown";

    // Log EVERYTHING for analytics when Supabase is down
    console.log(`[TRACK] ${timestamp} | action=${action} | feature=${feature} | ip=${ip} | ua=${ua} | extras=${JSON.stringify(rest)}`);

    if (!supabaseAdmin) {
      return NextResponse.json({ ok: true, tracked: false, logged: true });
    }

    const { error } = await supabaseAdmin.from("analytics_events").insert({
      event_type: action,
      feature,
      created_at: timestamp,
      ip,
      user_agent: ua,
      extra_data: rest,
    });

    if (error) {
      console.error("[TRACK] Supabase error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, tracked: true });
  } catch (error) {
    console.error("[TRACK] Error:", error);
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}
