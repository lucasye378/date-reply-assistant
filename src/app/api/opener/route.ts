import { NextRequest, NextResponse } from "next/server";
import { generateOpeningLines } from "@/lib/api";

export const runtime = "nodejs";

// In-memory rate limit store (per-day per-IP)
const dailyUsage = new Map<string, { date: string; count: number }>();
const FREE_DAILY_LIMIT = 3;

function getDateKey(): string {
  return new Date().toISOString().split("T")[0];
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const { profile, subscribed } = await request.json();

    if (!profile?.trim()) {
      return NextResponse.json(
        { error: "profile is required" },
        { status: 400 }
      );
    }

    // If user is subscribed, allow unlimited
    if (subscribed) {
      const options = await generateOpeningLines({ profile: profile.trim() });
      return NextResponse.json({ options, unlimited: true });
    }

    // Free user: enforce 3/day limit by IP
    const ip = getClientIP(request);
    const today = getDateKey();
    const key = `${ip}:${today}`;

    const current = dailyUsage.get(key);
    if (current && current.date === today && current.count >= FREE_DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: "daily_limit_reached",
          message: "Free daily limit reached. Upgrade to unlimited.",
          limit: FREE_DAILY_LIMIT,
        },
        { status: 429 }
      );
    }

    // Increment count
    dailyUsage.set(key, {
      date: today,
      count: (current?.date === today ? (current.count || 0) : 0) + 1,
    });

    const options = await generateOpeningLines({ profile: profile.trim() });
    return NextResponse.json({
      options,
      unlimited: false,
      remaining: Math.max(0, FREE_DAILY_LIMIT - (current?.date === today ? current.count || 0 : 0)),
    });
  } catch (error) {
    console.error("Opener generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate openers", details: String(error) },
      { status: 500 }
    );
  }
}
