import { NextRequest, NextResponse } from "next/server";
import { generateKeyPairSync } from "crypto";
import { DakotaClient } from "@dakota-xyz/ts-sdk";
import { createClient } from "@/lib/supabase/server";
import { getDakotaClient } from "@/lib/dakota";

const DEMO_SIGNER_GROUP_NAME = "IndieBank Demo Operators";

// Find or create the demo signer group. Required because every policy needs a
// signer group to govern its rule mutations. We generate one ES256 keypair the
// first time we need it; the private key is thrown away (demo doesn't actually
// endorse intents — it just demonstrates that the policy exists).
async function ensureDemoSignerGroupId(
  dakota: DakotaClient
): Promise<string> {
  const groups = await dakota.signerGroups.list().toArray();
  const existing = groups.find((g) => g.name === DEMO_SIGNER_GROUP_NAME);
  if (existing) return existing.id;

  const { publicKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  });
  const memberKey = Buffer.from(publicKey).toString("base64");

  await dakota.signers.create({
    name: "IndieBank Demo Operator",
    public_key: memberKey,
    key_type: "ES256",
  } as Parameters<typeof dakota.signers.create>[0]);

  const group = await dakota.signerGroups.create({
    name: DEMO_SIGNER_GROUP_NAME,
    member_keys: [memberKey],
  });

  return group.id;
}

// GET /api/compliance/policies - List all policies the customer has configured.
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dakota = getDakotaClient();
    const policies = await dakota.policies.list().toArray();

    return NextResponse.json({
      policies: policies.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        version: p.version,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        rules:
          p.rules?.map((r) => ({
            id: r.id,
            ruleType: r.rule_type,
            action: r.action,
            definition: r.definition,
            createdAt: r.created_at,
          })) ?? [],
      })),
    });
  } catch (error) {
    console.error("List policies error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to list policies";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/compliance/policies - Create a new amount-threshold policy.
// Body: { name, description?, amountUsd: number-as-string }
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
    const name: string = body.name;
    const description: string | undefined = body.description;
    const amountUsd: string = body.amountUsd;

    if (!name || !amountUsd) {
      return NextResponse.json(
        { error: "name and amountUsd are required" },
        { status: 400 }
      );
    }

    const amountNumber = Number(amountUsd);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json(
        { error: "amountUsd must be a positive number" },
        { status: 400 }
      );
    }

    const dakota = getDakotaClient();
    const signerGroupId = await ensureDemoSignerGroupId(dakota);

    // The SDK types `definition` as Record<string, never> due to an OpenAPI
    // quirk; the real API accepts a free-form JSON object with min_amount,
    // threshold, and currency for amount_threshold rules.
    const policy = await dakota.policies.create({
      name,
      description,
      signer_group_id: signerGroupId,
      rules: [
        {
          rule_type: "amount_threshold",
          action: "deny",
          // amount_threshold definition per the platform validator
          // (pkg/core/policy.go:311 AmountThresholdRuleDefinition):
          //   min_amount: int64 in the smallest currency unit (USD → cents)
          //   threshold: int32 approvals required (0 = hard deny)
          //   asset:     { id, name } — NOT a `currency: "USD"` string
          definition: {
            min_amount: Math.round(amountNumber * 100),
            threshold: 0,
            asset: { id: "USD", name: "US Dollar" },
          },
        },
      ],
    } as unknown as Parameters<typeof dakota.policies.create>[0]);

    return NextResponse.json({
      success: true,
      policy: {
        id: policy.id,
        name: policy.name,
        description: policy.description ?? null,
        version: policy.version,
        signerGroupId,
      },
    });
  } catch (error) {
    console.error("Create policy error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create policy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
