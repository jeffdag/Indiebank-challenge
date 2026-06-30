import { NextRequest, NextResponse } from "next/server";
import { WebhookHandler } from "@dakota-xyz/ts-sdk/webhook";

let _handler: WebhookHandler | null = null;

function getHandler(): WebhookHandler | null {
  if (!process.env.DAKOTA_WEBHOOK_PUBLIC_KEY) return null;
  if (!_handler) {
    _handler = new WebhookHandler({
      publicKey: process.env.DAKOTA_WEBHOOK_PUBLIC_KEY,
    });

    _handler.on("customer.kyb_status.updated", async (event) => {
      console.log("[webhook] customer.kyb_status.updated", event.data);
    });
    _handler.on("transaction.*", async (event) => {
      console.log(`[webhook] ${event.type}`, event.data);
    });
    _handler.on("auto_account.*", async (event) => {
      console.log(`[webhook] ${event.type}`, event.data);
    });
    _handler.onDefault(async (event) => {
      console.log(`[webhook] unhandled event ${event.type}`);
    });
  }
  return _handler;
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const handler = getHandler();

  if (!handler) {
    console.warn(
      "[webhook] DAKOTA_WEBHOOK_PUBLIC_KEY not set — verification disabled. Set it in .env.local to enable Ed25519 signature checks."
    );
    try {
      const event = JSON.parse(body);
      console.log("[webhook] (unverified) received", event.type);
      return NextResponse.json({ received: true, verified: false });
    } catch (err) {
      console.error("[webhook] failed to parse body", err);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  try {
    await handler.handleRequest(body, headersToObject(request.headers));
    return NextResponse.json({ received: true, verified: true });
  } catch (error) {
    console.error("[webhook] processing failed", error);
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
