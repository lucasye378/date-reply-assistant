import { NextRequest, NextResponse } from "next/server";
import { generateOpeningLines } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { context, style } = await request.json();

    if (!context) {
      return NextResponse.json({ error: "Context required" }, { status: 400 });
    }

    const options = await generateOpeningLines(context, style);

    return NextResponse.json({ options });
  } catch (error) {
    console.error("Opener generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate openers", details: String(error) },
      { status: 500 }
    );
  }
}
