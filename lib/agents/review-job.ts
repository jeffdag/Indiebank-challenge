import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export interface AgentChecklistItem {
  item: string;
  passed: boolean;
  note: string | null;
}

// NB: OpenAI's strict structured-output mode requires every key in `properties`
// to be in `required`. So we use `.nullable()` instead of `.optional()` —
// the field is always present, but may be null when no note applies.
const ChecklistSchema = z.object({
  item: z.string().describe("A specific requirement that was checked"),
  passed: z.boolean(),
  note: z
    .string()
    .nullable()
    .describe(
      "Short reason if not passed; null when the item passed and there's nothing extra to add."
    ),
});

const ReviewSchema = z.object({
  decision: z.enum(["approve", "request_revisions"]),
  feedback: z
    .string()
    .describe(
      "1–4 short paragraphs for the freelancer. Direct, specific, no fluff."
    ),
  checklist: z
    .array(ChecklistSchema)
    .describe(
      "One entry per concrete requirement. Mark passed=true only if the submission clearly shows the requirement is met."
    ),
});

export interface ReviewInput {
  title: string;
  requirements: string;
  designUrl?: string | null;
  estimatedHours?: string | null;
  hoursWorked: string;
  deliverablesUrl?: string | null;
  notes?: string | null;
}

export interface ReviewResult {
  decision: "approve" | "request_revisions";
  feedback: string;
  checklist: AgentChecklistItem[];
}

const SYSTEM_PROMPT = `You are a strict spec-compliance reviewer. You'll get a \
list of job requirements and a deliverable. Compare the deliverable against \
EACH requirement.

Rules:
- If the deliverable's full content is provided below, base your verdict on the \
  content itself — not on the URL or the freelancer's notes.
- Word counts, presence of links, presence of titles, etc. are all verifiable \
  from the provided content. COUNT before deciding.
- If only a URL is provided (no content), DO NOT assume the work is missing. \
  Treat the URL as referenceable and lean on the freelancer's notes to judge — \
  only block on items you can clearly verify as missing.
- Be conservative: if a requirement is met clearly, mark it passed. If it's \
  ambiguous, mention the ambiguity in the note but still pass it — only block \
  when something concrete is missing.
- Don't request revisions for minor stylistic preferences. Only block on items \
  explicitly listed in the requirements.
- If hours_worked seems wildly off vs the scope, mention it in feedback but \
  don't let that alone drive the decision — the operator makes that call.`;

const FETCH_TIMEOUT_MS = 8000;
const MAX_TEXT_BYTES = 120_000; // ~120 KB of text inlined into the prompt

type Deliverable =
  | { kind: "text"; mime: string; content: string; truncated: boolean }
  | { kind: "image"; mime: string; url: string }
  | { kind: "unfetchable"; reason: string };

async function fetchDeliverable(url: string): Promise<Deliverable> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) {
      return { kind: "unfetchable", reason: `HTTP ${res.status}` };
    }
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    const lowerUrl = url.toLowerCase().split("?")[0];

    const isImage =
      contentType.startsWith("image/") ||
      /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(lowerUrl);
    if (isImage) {
      return { kind: "image", mime: contentType || "image/png", url };
    }

    const isText =
      contentType.startsWith("text/") ||
      contentType.includes("json") ||
      contentType.includes("xml") ||
      contentType.includes("javascript") ||
      contentType.includes("typescript") ||
      contentType === "application/octet-stream" || // Supabase storage default
      /\.(md|markdown|txt|html?|json|csv|js|mjs|ts|tsx|jsx|py|rb|go|java|c|cpp|cc|h|hpp|css|scss|less|yml|yaml|sql|sh|toml|svelte|vue)$/.test(
        lowerUrl
      );
    if (isText) {
      const buf = await res.arrayBuffer();
      const truncated = buf.byteLength > MAX_TEXT_BYTES;
      const slice = truncated ? buf.slice(0, MAX_TEXT_BYTES) : buf;
      const text = new TextDecoder("utf-8", { fatal: false }).decode(slice);
      return {
        kind: "text",
        mime: contentType || "text/plain",
        content: text,
        truncated,
      };
    }

    return {
      kind: "unfetchable",
      reason: `unsupported content-type: ${contentType || "unknown"}`,
    };
  } catch (err) {
    return {
      kind: "unfetchable",
      reason: err instanceof Error ? err.message : "fetch error",
    };
  }
}

export async function reviewSubmission(
  input: ReviewInput
): Promise<ReviewResult> {
  // Try to fetch the actual deliverable content. This is the single biggest
  // signal — without it the model is just guessing from the URL.
  let deliverable: Deliverable | null = null;
  if (input.deliverablesUrl) {
    deliverable = await fetchDeliverable(input.deliverablesUrl);
  }

  const header = `# Job
Title: ${input.title}
${input.estimatedHours ? `Estimated hours: ${input.estimatedHours}` : ""}
${input.designUrl ? `Design / spec URL (reference): ${input.designUrl}` : ""}

## Requirements
${input.requirements}

# Submission
Hours worked: ${input.hoursWorked}
${input.deliverablesUrl ? `Deliverables URL: ${input.deliverablesUrl}` : "Deliverables URL: (none provided)"}

## Notes from freelancer
${input.notes ?? "(none)"}
`;

  let deliverableBlock = "";
  const imagePart: { type: "image"; image: URL; mediaType?: string } | null = (() => {
    if (!deliverable) {
      deliverableBlock = `\n## Deliverable content\n(no deliverable URL provided)\n`;
      return null;
    }
    if (deliverable.kind === "text") {
      const truncNote = deliverable.truncated
        ? `\n[...truncated at ${MAX_TEXT_BYTES.toLocaleString()} bytes]`
        : "";
      deliverableBlock = `\n## Deliverable content (${deliverable.mime})
This is the verbatim content fetched from the deliverable URL. Judge requirements \
against this text. Count words. Look for links, titles, summaries — anything the \
requirements ask for is verifiable here.

\`\`\`
${deliverable.content}${truncNote}
\`\`\`
`;
      return null;
    }
    if (deliverable.kind === "image") {
      deliverableBlock = `\n## Deliverable content
The deliverable is an image (${deliverable.mime}) attached to this message. \
Judge requirements against what you can see in it.
`;
      return { type: "image", image: new URL(deliverable.url), mediaType: deliverable.mime };
    }
    deliverableBlock = `\n## Deliverable content
Could not fetch the deliverable URL (${deliverable.reason}). Be lenient: do not \
penalize the freelancer for content you cannot verify. Lean on the notes to \
judge — only block on items clearly missing.
`;
    return null;
  })();

  const userText = header + deliverableBlock +
    `\nReview the submission against the requirements. Return your decision, a \
specific checklist (one entry per requirement), and short actionable feedback.`;

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: URL; mediaType?: string }
  > = [{ type: "text", text: userText }];
  if (imagePart) userContent.push(imagePart);

  const { object } = await generateObject({
    model: openai(process.env.OPENAI_MODEL || "gpt-4o-mini"),
    schema: ReviewSchema,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  return {
    decision: object.decision,
    feedback: object.feedback,
    checklist: object.checklist as AgentChecklistItem[],
  };
}
