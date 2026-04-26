import { NextRequest, NextResponse } from "next/server";
import { generateReplySuggestions } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { theirMessage, context } = await request.json();

    if (!theirMessage) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const options = await generateReplySuggestions(theirMessage, context);

    return NextResponse.json({ options });
  } catch (error) {
    console.error("Reply generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate replies", details: String(error) },
      { status: 500 }
    );
  }
}
