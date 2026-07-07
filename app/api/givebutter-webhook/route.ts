import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Givebutter webhook receiver. Configure in the Givebutter dashboard:
// URL https://civix250.ai/api/givebutter-webhook, event "transaction.succeeded",
// then copy the webhook's signing secret into GIVEBUTTER_WEBHOOK_SECRET.
// Givebutter sends the signing secret verbatim in the "Signature" header.

type GivebutterTransaction = {
  id?: string | number;
  status?: string;
  amount?: number | string;
  currency?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  payment_method?: string | null;
  giving_space?: {
    name?: string | null;
    message?: string | null;
  } | null;
};

function isValidSignature(received: string | null, secret: string) {
  if (!received) return false;

  const receivedBuffer = Buffer.from(received);
  const secretBuffer = Buffer.from(secret);

  if (receivedBuffer.length !== secretBuffer.length) return false;
  return timingSafeEqual(receivedBuffer, secretBuffer);
}

export async function POST(req: NextRequest) {
  const secret = process.env.GIVEBUTTER_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Givebutter webhook is not configured." },
      { status: 503 }
    );
  }

  if (!isValidSignature(req.headers.get("signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: { event?: string; data?: GivebutterTransaction };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  // Acknowledge events we don't record so Givebutter doesn't retry them.
  if (payload.event !== "transaction.succeeded") {
    return NextResponse.json({ received: true, ignored: payload.event ?? null });
  }

  const transaction = payload.data ?? {};

  if (transaction.status && transaction.status !== "succeeded") {
    return NextResponse.json({ received: true, ignored: transaction.status });
  }

  const amount = Number(transaction.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid transaction amount." }, { status: 400 });
  }

  const donorName =
    [transaction.first_name, transaction.last_name].filter(Boolean).join(" ") ||
    transaction.giving_space?.name ||
    null;

  const transactionId = transaction.id != null ? String(transaction.id) : null;
  const transactionTag = transactionId
    ? `Givebutter transaction ${transactionId}`
    : null;

  // Givebutter retries undelivered webhooks — skip if already recorded.
  if (transactionTag) {
    const { data: existing } = await supabaseAdmin
      .from("platform_donations")
      .select("id")
      .like("notes", `%${transactionTag}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  const notes = [transactionTag, transaction.giving_space?.message]
    .filter(Boolean)
    .join(" — ");

  const { error } = await supabaseAdmin.from("platform_donations").insert([
    {
      donor_name: donorName,
      donor_email: transaction.email || null,
      amount,
      currency: (transaction.currency || "USD").toUpperCase(),
      payment_method: "givebutter",
      notes: notes || null,
    },
  ]);

  if (error) {
    console.error("Failed to record Givebutter donation:", error.message);
    // Non-200 so Givebutter retries the delivery.
    return NextResponse.json({ error: "Failed to record donation." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
