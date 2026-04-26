import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { action, feature } = await request.json();
    
    // In production, you'd write to a database or analytics service
    // For now, just log and return success
    console.log(`[TRACK] action=${action} feature=${feature} ts=${new Date().toISOString()}`);
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}