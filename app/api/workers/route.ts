import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDakotaClient } from "@/lib/dakota";
import { takeAtMost } from "@/lib/list-helpers";

type Worker = {
  recipientId: string;
  name: string;
  destinationId: string | null;
  offrampAccountId: string | null;
  bankName: string | null;
  accountLast4: string | null;
  accountNumber: string | null;
  routingNumber: string | null;
};

// GET /api/workers - list workers (= all the operator's recipients except the
// auto-created treasury one, which holds the on-ramp crypto destination).
//
// Query params:
//   limit (default 25) — max recipients to return. Caps both the recipients
//     pagination AND the N+1 destinations fan-out so a customer with 200
//     workers doesn't trigger 200 destinations.list calls per page load.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("dakota_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.dakota_customer_id) {
      return NextResponse.json({ workers: [] });
    }

    const url = new URL(request.url);
    const limitParam = parseInt(url.searchParams.get("limit") ?? "25", 10);
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 100)
        : 25;

    const dakota = getDakotaClient();
    const customer = await dakota.customers.get(profile.dakota_customer_id);

    // Cap recipients at `limit + 1` (need one extra to account for the
    // auto-created treasury recipient we filter out below).
    const recipients = await takeAtMost(
      dakota.recipients.list(profile.dakota_customer_id),
      limit + 1
    );

    // The auto-created treasury recipient is the one whose name matches the
    // customer's. Skip it; everyone else is a worker. Fetch the first fiat
    // destination per worker in parallel — bounded by `limit` from above
    // so the fan-out can't explode.
    const workerRecipients = recipients
      .filter((r) => r.name !== customer.name)
      .slice(0, limit);
    const banks = await Promise.all(
      workerRecipients.map(async (r) => {
        const dests = await takeAtMost(dakota.destinations.list(r.id), 5);
        return dests.find((d) => d.destination_type === "fiat_us") ?? null;
      })
    );

    const workers: Worker[] = workerRecipients.map((r, i) => {
      const bank = banks[i];
      const bankId = bank
        ? (bank as { destination_id?: string }).destination_id ||
          (bank as { id?: string }).id ||
          null
        : null;
      const accountNumber = bank
        ? (bank as { account_number?: string }).account_number ?? null
        : null;
      const routingNumber = bank
        ? (bank as { routing_number?: string }).routing_number ?? null
        : null;
      return {
        recipientId: r.id,
        name: r.name,
        destinationId: bankId,
        offrampAccountId: null,
        bankName: bank ? ((bank as { bank_name?: string }).bank_name ?? null) : null,
        accountLast4: accountNumber ? accountNumber.slice(-4) : null,
        accountNumber,
        routingNumber,
      };
    });

    return NextResponse.json({ workers });
  } catch (error) {
    console.error("List workers error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to list workers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/workers - add a worker. Creates recipient + fiat_us destination +
// offramp account.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      bankName,
      routingNumber,
      accountNumber,
      accountType = "checking",
    } = body as {
      name?: string;
      bankName?: string;
      routingNumber?: string;
      accountNumber?: string;
      accountType?: string;
    };

    if (!name?.trim() || !bankName || !routingNumber || !accountNumber) {
      return NextResponse.json(
        { error: "name, bankName, routingNumber, accountNumber required" },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("dakota_customer_id, kyb_status")
      .eq("id", user.id)
      .single();

    if (!profile?.dakota_customer_id || profile.kyb_status !== "active") {
      return NextResponse.json(
        { error: "Complete onboarding before adding workers" },
        { status: 400 }
      );
    }

    const dakota = getDakotaClient();

    const recipient = await dakota.recipients.create(profile.dakota_customer_id, {
      name: name.trim(),
      address: {
        street1: "123 Worker St",
        city: "Austin",
        region: "Texas",
        postal_code: "73301",
        country: "US",
      },
    });

    const destination = await dakota.destinations.create(recipient.id, {
      destination_type: "fiat_us",
      name: `${name.trim()} Bank`,
      bank_name: bankName,
      account_holder_name: name.trim().substring(0, 22),
      account_number: accountNumber,
      aba_routing_number: routingNumber,
      account_type: accountType,
    } as Parameters<typeof dakota.destinations.create>[1]);
    const destinationId =
      (destination as { destination_id?: string }).destination_id ||
      (destination as { id?: string }).id;

    const offramp = await dakota.accounts.create({
      account_type: "offramp",
      fiat_destination_id: destinationId,
      source_asset: "USDC",
      source_network_id: "ethereum-sepolia",
      destination_asset: "USD",
      rail: "ach",
      capabilities: ["ach"],
    } as Parameters<typeof dakota.accounts.create>[0]);

    return NextResponse.json({
      success: true,
      worker: {
        recipientId: recipient.id,
        name: recipient.name,
        destinationId,
        offrampAccountId: offramp.id,
        bankName,
        accountLast4: accountNumber.slice(-4),
      },
    });
  } catch (error) {
    console.error("Create worker error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to add worker";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
