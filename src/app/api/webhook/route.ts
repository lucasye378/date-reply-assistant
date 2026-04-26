import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Webhook signature error:", message);
    return NextResponse.json({ error: "Invalid signature", details: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("Subscription started:", session.customer);

    // Write to Supabase subscriptions table
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from("subscriptions").insert({
        customer_id: session.customer,
        customer_email: session.customer_details?.email ?? null,
        subscription_id: session.subscription,
        price_id: session.line_items?.data[0]?.price?.id ?? null,
        status: "active",
        period_start: new Date().toISOString(),
      });
      if (error) {
        console.error("[WEBHOOK] Supabase insert error:", error);
      }
    }
  }

  return NextResponse.json({ received: true });
}
