import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
  });
}

// Check if a customer has an active subscription
// Returns: { active: boolean, plan: "monthly" | "yearly" | null }
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      // Stripe not configured - return inactive (frontend should fall back to localStorage)
      return NextResponse.json({ active: false, configured: false });
    }

    // Search for customer by email
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({ active: false, plan: null });
    }

    const customerId = customers.data[0].id;

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ active: false, plan: null });
    }

    // Determine plan type from price ID
    const sub = subscriptions.data[0];
    const priceId = sub.items.data[0]?.price?.id || "";

    // Identify monthly vs yearly from our known price IDs
    const monthlyPriceIds = (process.env.STRIPE_MONTHLY_PRICE_IDS || "test_4gM00j4Eg5xIbFAayWcjS0a").split(",");
    const yearlyPriceIds = (process.env.STRIPE_YEARLY_PRICE_IDS || "test_eVqfZhfiUaS29xs4aycjS09").split(",");

    let plan: "monthly" | "yearly" | null = null;
    if (monthlyPriceIds.some((p) => priceId.includes(p))) plan = "monthly";
    else if (yearlyPriceIds.some((p) => priceId.includes(p))) plan = "yearly";

    return NextResponse.json({ active: true, plan });
  } catch (error) {
    console.error("Subscription check error:", error);
    return NextResponse.json(
      { error: "Failed to check subscription", details: String(error) },
      { status: 500 }
    );
  }
}
