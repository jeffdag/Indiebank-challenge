import { NextResponse } from "next/server";
import { generateKeyPairSync } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getDakotaClient } from "@/lib/dakota";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ProfilePatch = {
  dakota_customer_id?: string;
  dakota_application_id?: string;
  kyb_status?: string;
  dakota_wallet_id?: string;
  dakota_wallet_address?: string;
  dakota_onramp_account_id?: string;
  updated_at?: string;
};

type OnrampInfo = {
  accountId: string;
  bankName: string | null;
  routingNumber: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  accountType: string | null;
  status: string | null;
};

type WalletInfo = {
  walletId: string;
  address: string;
  network: string;
  networkId: string;
};

// GET /api/onboarding - read current onboarding state for the operator.
export async function GET() {
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
      .select(
        "dakota_customer_id, dakota_application_id, kyb_status, dakota_wallet_id, dakota_wallet_address, dakota_onramp_account_id"
      )
      .eq("id", user.id)
      .single();

    if (!profile?.dakota_customer_id) {
      return NextResponse.json({
        customerId: null,
        kybStatus: null,
        onramp: null,
        wallet: null,
      });
    }

    const dakota = getDakotaClient();
    const customer = await dakota.customers.get(profile.dakota_customer_id);

    // On-ramp — prefer the cached account ID; fall back to iterating
    // accounts.list only if we haven't cached it yet. The cache miss path
    // is for users provisioned before we added the column.
    const myWallet = (profile.dakota_wallet_address ?? "").toLowerCase();
    let ours: unknown = null;
    let cachedAccountId = profile.dakota_onramp_account_id ?? null;

    if (cachedAccountId) {
      try {
        ours = await dakota.accounts.get(cachedAccountId);
      } catch (err) {
        console.warn("cached onramp account fetch failed:", err);
        cachedAccountId = null;
      }
    }

    if (!ours && myWallet) {
      for await (const a of dakota.accounts.list({
        account_type: "onramp",
        limit: 100,
      })) {
        const acctWallet = (
          (a as { destination?: { crypto_address?: string } }).destination
            ?.crypto_address ?? ""
        ).toLowerCase();
        if (acctWallet && acctWallet === myWallet) {
          ours = a;
          break;
        }
      }
      // Backfill the cache so the next call skips the iteration.
      const foundId = (ours as { id?: string } | null)?.id;
      if (foundId && foundId !== profile.dakota_onramp_account_id) {
        await supabase
          .from("profiles")
          .update({
            dakota_onramp_account_id: foundId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      }
    }
    let onramp: OnrampInfo | null = null;
    if (ours) {
      const acct = ours as {
        id?: string;
        bank_account?: Record<string, unknown>;
        status?: string;
      };
      const bank = acct.bank_account ?? {};
      onramp = {
        accountId: acct.id ?? "",
        bankName: (bank as { bank_name?: string }).bank_name ?? null,
        routingNumber: (bank as { aba_routing_number?: string }).aba_routing_number ?? null,
        accountNumber: (bank as { account_number?: string }).account_number ?? null,
        accountHolderName:
          (bank as { account_holder_name?: string }).account_holder_name ?? null,
        accountType:
          (bank as { account_type?: string }).account_type ?? null,
        status: acct.status ?? null,
      };
    }

    // Wallet (treasury)
    let wallet: WalletInfo | null = null;
    if (profile.dakota_wallet_id && profile.dakota_wallet_address) {
      wallet = {
        walletId: profile.dakota_wallet_id,
        address: profile.dakota_wallet_address,
        network: "Ethereum Sepolia",
        networkId: "ethereum-sepolia",
      };
    }

    if (customer.kyb_status !== profile.kyb_status) {
      await supabase
        .from("profiles")
        .update({
          kyb_status: customer.kyb_status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    return NextResponse.json({
      customerId: customer.id,
      kybStatus: customer.kyb_status,
      applicationStatus: customer.application_status ?? null,
      onramp,
      wallet,
    });
  } catch (error) {
    console.error("Onboarding GET error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load onboarding state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/onboarding - full onboarding pipeline for this operator:
//   1. customers.create        (idempotent — skip if already on the profile)
//   2. sandbox.simulateOnboarding kyb_approve
//   3. Provision wallet         (signer → signer group → wallet) — treasury
//      that receives USDC directly from customers + ACH-funded USDC.
//   4. Provision on-ramp        (crypto destination points at the wallet)
export async function POST() {
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
      .select(
        "dakota_customer_id, dakota_application_id, kyb_status, dakota_wallet_id, dakota_wallet_address, dakota_onramp_account_id, email"
      )
      .eq("id", user.id)
      .single();

    const dakota = getDakotaClient();
    const patch: ProfilePatch = { updated_at: new Date().toISOString() };

    // 1) Customer
    let customerId = profile?.dakota_customer_id ?? null;
    let applicationId = profile?.dakota_application_id ?? null;
    if (!customerId) {
      const displayName = profile?.email
        ? `${profile.email.split("@")[0]} Co`
        : `IndieBank User ${user.id.slice(0, 8)}`;
      const created = await dakota.customers.create({
        name: displayName,
        customer_type: "business",
        external_id: `indiebank_${user.id}`,
      });
      customerId = created.id;
      applicationId = created.application_id;
      patch.dakota_customer_id = customerId;
      patch.dakota_application_id = applicationId;
    }

    // 2) KYB sandbox approval
    const customerBefore = await dakota.customers.get(customerId);
    if (customerBefore.kyb_status !== "active") {
      if (!applicationId && customerBefore.application_id) {
        applicationId = customerBefore.application_id;
        patch.dakota_application_id = applicationId;
      }
      if (!applicationId) {
        return NextResponse.json(
          { error: "Customer has no onboarding application" },
          { status: 400 }
        );
      }
      await dakota.sandbox.simulateOnboarding({
        type: "kyb_approve",
        applicant_id: applicationId,
        simulation_id: `sim_kyb_${user.id}`,
      } as Parameters<typeof dakota.sandbox.simulateOnboarding>[0]);

      for (let i = 0; i < 8; i++) {
        await sleep(300);
        const c = await dakota.customers.get(customerId);
        if (c.kyb_status === "active") break;
      }
    }

    const customer = await dakota.customers.get(customerId);
    patch.kyb_status = customer.kyb_status;

    let wallet: WalletInfo | null = null;
    let onramp: OnrampInfo | null = null;

    if (customer.kyb_status === "active") {
      // 3) Wallet (treasury) — lazy
      let walletId = profile?.dakota_wallet_id ?? null;
      let walletAddress = profile?.dakota_wallet_address ?? null;

      if (!walletId || !walletAddress) {
        // Generate ES256 (P-256) keypair for the wallet's signer. We do not
        // persist the private key — the demo doesn't sign wallet transactions
        // (payouts use one-off transactions, not wallets.createTransaction).
        // In production you'd hold this key in your HSM / KMS.
        const { publicKey } = generateKeyPairSync("ec", {
          namedCurve: "P-256",
          publicKeyEncoding: { type: "spki", format: "der" },
          privateKeyEncoding: { type: "pkcs8", format: "der" },
        });
        const memberKey = Buffer.from(publicKey).toString("base64");

        await dakota.signers.create({
          name: `${customer.name} Signer`,
          public_key: memberKey,
          key_type: "ES256",
        } as Parameters<typeof dakota.signers.create>[0]);

        const group = await dakota.signerGroups.create({
          name: `${customer.name} Group ${Date.now() % 100000}`,
          member_keys: [memberKey],
        });

        const w = await dakota.wallets.create({
          customer_id: customerId,
          family: "evm",
          name: `${customer.name} Treasury`,
          signer_groups: [group.id],
          policies: [],
        } as Parameters<typeof dakota.wallets.create>[0]);

        walletId = w.id;
        walletAddress = (w as { address?: string }).address ?? null;
        if (walletId && walletAddress) {
          patch.dakota_wallet_id = walletId;
          patch.dakota_wallet_address = walletAddress;
        }
      }

      if (walletId && walletAddress) {
        wallet = {
          walletId,
          address: walletAddress,
          network: "Ethereum Sepolia",
          networkId: "ethereum-sepolia",
        };
      }

      // 4) On-ramp — lazy. Prefer the cached account ID; only iterate
      // accounts.list if we haven't cached it yet. Match by the wallet
      // address (accounts.list doesn't return customer_id).
      const targetWallet = (walletAddress ?? "").toLowerCase();
      let mine: unknown = null;
      const cachedOnrampId = profile?.dakota_onramp_account_id ?? null;

      if (cachedOnrampId) {
        try {
          mine = await dakota.accounts.get(cachedOnrampId);
        } catch (err) {
          console.warn("cached onramp account fetch failed:", err);
        }
      }

      if (!mine && targetWallet) {
        for await (const a of dakota.accounts.list({
          account_type: "onramp",
          limit: 100,
        })) {
          const acctWallet = (
            (a as { destination?: { crypto_address?: string } }).destination
              ?.crypto_address ?? ""
          ).toLowerCase();
          if (acctWallet && acctWallet === targetWallet) {
            mine = a;
            break;
          }
        }
      }

      if (mine) {
        const acct = mine as {
          id?: string;
          bank_account?: Record<string, unknown>;
          status?: string;
        };
        const bank = acct.bank_account ?? {};
        onramp = {
          accountId: acct.id ?? "",
          bankName: (bank as { bank_name?: string }).bank_name ?? null,
          routingNumber: (bank as { aba_routing_number?: string }).aba_routing_number ?? null,
          accountNumber: (bank as { account_number?: string }).account_number ?? null,
          accountHolderName:
            (bank as { account_holder_name?: string }).account_holder_name ?? null,
          accountType:
            (bank as { account_type?: string }).account_type ?? null,
          status: acct.status ?? null,
        };
        if (acct.id && acct.id !== profile?.dakota_onramp_account_id) {
          patch.dakota_onramp_account_id = acct.id;
        }
      } else {
        const recipients = await dakota.recipients.list(customerId).toArray();
        if (recipients.length === 0) {
          await supabase.from("profiles").update(patch).eq("id", user.id);
          return NextResponse.json(
            { error: "Expected auto-created recipient after KYB" },
            { status: 500 }
          );
        }
        const treasury = recipients[0];

        if (!walletAddress) {
          return NextResponse.json(
            { error: "Wallet provisioning did not return an address" },
            { status: 500 }
          );
        }

        const cryptoDestination = await dakota.destinations.create(treasury.id, {
          destination_type: "crypto",
          name: "Treasury USDC",
          crypto_address: walletAddress,
          network_id: "ethereum-sepolia",
        } as Parameters<typeof dakota.destinations.create>[1]);
        const cryptoDestinationId =
          (cryptoDestination as { destination_id?: string }).destination_id ||
          (cryptoDestination as { id?: string }).id;

        const acct = await dakota.accounts.create({
          account_type: "onramp",
          customer_id: customerId,
          crypto_destination_id: cryptoDestinationId,
          source_asset: "USD",
          destination_asset: "USDC",
          destination_network_id: "ethereum-sepolia",
          rail: "us_bank_account",
          capabilities: ["ach"],
        } as Parameters<typeof dakota.accounts.create>[0]);

        const bank = (acct as { bank_account?: Record<string, unknown> }).bank_account ?? {};
        onramp = {
          accountId: acct.id,
          bankName: (bank as { bank_name?: string }).bank_name ?? null,
          routingNumber: (bank as { aba_routing_number?: string }).aba_routing_number ?? null,
          accountNumber: (bank as { account_number?: string }).account_number ?? null,
          accountHolderName:
            (bank as { account_holder_name?: string }).account_holder_name ?? null,
          accountType:
            (bank as { account_type?: string }).account_type ?? null,
          status: (acct as { status?: string }).status ?? null,
        };
        if (acct.id) patch.dakota_onramp_account_id = acct.id;
      }
    }

    await supabase.from("profiles").update(patch).eq("id", user.id);

    return NextResponse.json({
      success: true,
      customerId,
      kybStatus: customer.kyb_status,
      onramp,
      wallet,
    });
  } catch (error) {
    console.error("Onboarding POST error:", error);
    const message =
      error instanceof Error ? error.message : "Onboarding failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
