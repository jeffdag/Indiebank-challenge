# IndieBank

Banking and freelance payments for indie operators. Built for the **Dakota Agentic Build Challenge**.

You manage money in one place, post freelance jobs, let an AI review submissions, and pay freelancers to their bank account via [Dakota](https://dakota.xyz).

More detail on how it works: run the app and open `/challenge-details`.

## Run locally

```bash
git clone https://github.com/jeffdag/Indiebank-challenge.git
cd Indiebank-challenge
npm install
```

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
DAKOTA_API_KEY=<from platform.sandbox.dakota.xyz>
OPENAI_API_KEY=sk-...
```

Optional: `DAKOTA_WEBHOOK_PUBLIC_KEY` for webhook signature checks.

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Before first run

1. **Dakota** — get a sandbox API key at [platform.sandbox.dakota.xyz](https://platform.sandbox.dakota.xyz).
2. **Supabase** — run `supabase/migrations/20260101000000_init.sql` in your project's SQL editor (safe to run more than once).
3. **OpenAI** — needed for AI job submission review.

## What it does

- **Operators** — sign up, complete KYB (auto-approved in sandbox), get a USD treasury.
- **Jobs** — post work, assign a freelancer, they submit, AI reviews, you approve and pay.
- **Freelancers** — sign up, take jobs, add bank details, get paid via ACH.

## Tech

Next.js 16 · React 19 · TypeScript · Tailwind · Supabase · Dakota SDK · OpenAI (AI SDK)
