import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireFreelancer, apiErrorResponse } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/profile/bank — freelancer stores their bank info for payouts.
 *
 * We do NOT create the Dakota recipient/destination/offramp here — those live
 * on an OPERATOR'S customer. Instead we store the raw bank fields on the
 * freelancer profile; the operator's /api/jobs/[id]/pay lazily provisions on
 * their own customer the first time they pay this freelancer.
 *
 * Clears any previously-cached dakota_recipient/destination/offramp ids so
 * the next payout re-provisions against the new bank info.
 */
export async function POST(request: NextRequest) {
  try {
    const freelancer = await requireFreelancer();
    const body = await request.json();

    const required = [
      "account_holder_name",
      "account_number",
      "routing_number",
      "account_type",
      "street1",
      "city",
      "region",
      "postal_code",
    ];
    for (const f of required) {
      if (!body[f]) {
        return NextResponse.json(
          { error: `${f} is required` },
          { status: 400 }
        );
      }
    }
    if (!["checking", "savings"].includes(body.account_type)) {
      return NextResponse.json(
        { error: "account_type must be checking or savings" },
        { status: 400 }
      );
    }

    const accountNumber = String(body.account_number);
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        bank_name: body.bank_name ?? null,
        account_holder_name: body.account_holder_name,
        account_number: accountNumber,
        account_last4: accountNumber.slice(-4),
        routing_number: body.routing_number,
        account_type: body.account_type,
        street1: body.street1,
        city: body.city,
        region: body.region,
        postal_code: body.postal_code,
        address_country: body.country ?? "US",
        dakota_recipient_id: null,
        dakota_destination_id: null,
        dakota_offramp_account_id: null,
        provisioned_by_user_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", freelancer.id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
