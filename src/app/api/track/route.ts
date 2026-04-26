import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { action, feature } = await request.json();

    if (!supabaseAdmin) {
      // Supabase not configured, just log and succeed
      console.log(`[TRACK] (no Supabase) action=${action} feature=${feature}`);
      return NextResponse.json({ ok: true, tracked: false });
    }

    const { error } = await supabaseAdmin.from("analytics_events").insert({
      event_type: action,
      feature,
      created_at: new Date().toISOString(),
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
