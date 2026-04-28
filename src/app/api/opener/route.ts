import { NextRequest, NextResponse } from "next/server";
import { generateOpeningLines } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { relationshipStage, style, gender } = await request.json();

    if (!relationshipStage || !style || !gender) {
      return NextResponse.json(
        { error: "relationshipStage, style, and gender are required" },
        { status: 400 }
      );
    }

    const options = await generateOpeningLines({ relationshipStage, style, gender });

    return NextResponse.json({ options });
  } catch (error) {
    console.error("Opener generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate openers", details: String(error) },
      { status: 500 }
    );
  }
}
