import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Zeffy webhook receiver. Configure in Zeffy: Settings → Integrations → Webhook,
// URL https://civix250.ai/api/zeffy-webhook?token=<ZEFFY_WEBHOOK_SECRET>,
// event "payment.completed". Zeffy has no documented request-signing scheme, so
// we authenticate with a shared secret carried in the URL's ?token= query param.
//
// NOTE: Zeffy's payment payload field names are not publicly documented. The
// parser below accepts the common camelCase/snake_case variants and falls back
// gracefully. After the first real payment, check the logged payload (search
// logs for "Zeffy webhook payload") and tighten the field mapping if needed.

type ZeffyPayment = Record<string, unknown> & {
  id?: string | number;
  amount?: number | string;
  totalAmount?: number | string;
  total_amount?: number | string;
  currency?: string;
  firstName?: string | null;
  first_name?: string | null;
  lastName?: string | null;
  last_name?: string | null;
  email?: string | null;
  frequency?: string | null;
  recurring?: boolean | null;
  isRecurring?: boolean | null;
  message?: string | null;
};

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function isValidToken(received: string | null, secret: string) {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.ZEFFY_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Zeffy webhook is not configured." },
      { status: 503 }
    );
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!isValidToken(token, secret)) {
    return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  }

  let payload: { event?: string; type?: string; data?: ZeffyPayment; payment?: ZeffyPayment };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const event = payload.event ?? payload.type ?? null;

  // Acknowledge events we don't record so Zeffy doesn't retry them.
  if (event && event !== "payment.completed") {
    return NextResponse.json({ received: true, ignored: event });
  }

  // Zeffy nests the payment object under "data" (or "payment" in some payloads).
  const payment: ZeffyPayment = payload.data ?? payload.payment ?? {};

  // Log once so the exact field shape can be confirmed against a real payment.
  console.log("Zeffy webhook payload:", JSON.stringify(payload));

  const amount = Number(payment.amount ?? payment.totalAmount ?? payment.total_amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid transaction amount." }, { status: 400 });
  }

  const donorName =
    [
      pickString(payment.firstName, payment.first_name),
      pickString(payment.lastName, payment.last_name),
    ]
      .filter(Boolean)
      .join(" ") || null;

  const paymentId = payment.id != null ? String(payment.id) : null;
  const paymentTag = paymentId ? `Zeffy payment ${paymentId}` : null;

  // Zeffy retries undelivered webhooks — skip if already recorded.
  if (paymentTag) {
    const { data: existing } = await supabaseAdmin
      .from("platform_donations")
      .select("id")
      .like("notes", `%${paymentTag}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  const notes = [paymentTag, pickString(payment.message)].filter(Boolean).join(" — ");

  const frequency = pickString(payment.frequency);
  const recurring = Boolean(
    payment.recurring === true ||
      payment.isRecurring === true ||
      (frequency && frequency.toLowerCase() !== "once" && frequency.toLowerCase() !== "onetime")
  );

  const { error } = await supabaseAdmin.from("platform_donations").insert([
    {
      donor_name: donorName,
      donor_email: pickString(payment.email),
      amount,
      currency: (pickString(payment.currency) || "USD").toUpperCase(),
      payment_method: "zeffy",
      recurring,
      notes: notes || null,
    },
  ]);

  if (error) {
    console.error("Failed to record Zeffy donation:", error.message);
    // Non-200 so Zeffy retries the delivery.
    return NextResponse.json({ error: "Failed to record donation." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
