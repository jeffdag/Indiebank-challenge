"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Minimal code block with copy-to-clipboard + a soft token-tinted header.
 * No real syntax highlighting — we keep typography clean and let mono +
 * tabular figures carry the look. Use sparingly on docs pages.
 */
export function CodeBlock({
  filename,
  language = "ts",
  code,
}: {
  filename?: string;
  language?: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-black/[0.06] bg-[var(--color-ink)] text-white shadow-[0_18px_42px_-12px_rgba(20,20,40,0.35)]">
      {/* header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-2 text-[11.5px] text-white/55">
          <span className="flex items-center gap-1.5">
            <span className="block size-2 rounded-full bg-[#ff5f57]" />
            <span className="block size-2 rounded-full bg-[#febc2e]" />
            <span className="block size-2 rounded-full bg-[#28c840]" />
          </span>
          {filename && (
            <span className="ml-2 font-mono text-[11.5px] tabular-nums text-white/75">
              {filename}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-white/55">
            {language}
          </span>
          <button
            type="button"
            onClick={onCopy}
            aria-label="Copy code"
            className="grid size-7 place-items-center rounded-full text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            {copied ? (
              <Check
                className="h-3.5 w-3.5 text-[var(--color-accent)]"
                strokeWidth={2.5}
              />
            ) : (
              <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {/* body */}
      <pre className="overflow-x-auto px-5 py-4 text-[12px] leading-[1.6] tabular-nums">
        <code className="font-mono text-white/90 [&_.cm]:text-white/45 [&_.kw]:text-[var(--color-accent)] [&_.str]:text-[#a5d6ff] [&_.fn]:text-[#ffd580] [&_.num]:text-[#a0e6ff]">
          {highlightLight(code)}
        </code>
      </pre>
    </div>
  );
}

/**
 * Tiny syntax tinting — splits the source into spans so a few token kinds
 * (keyword, string, comment, number, function call) pick up brand colors.
 * Not a real parser. Good enough for a few illustrative snippets.
 */
function highlightLight(src: string): React.ReactNode {
  const lines = src.split("\n");
  return lines.map((line, idx) => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      return (
        <span key={idx} className="cm" style={{ color: "rgba(255,255,255,0.45)" }}>
          {line}
          {"\n"}
        </span>
      );
    }
    const tokens: React.ReactNode[] = [];
    let rest = line;
    let i = 0;
    while (rest.length > 0) {
      // String literal
      const strMatch = rest.match(/^(["'`])(?:\\.|(?!\1).)*\1/);
      if (strMatch) {
        tokens.push(
          <span key={`s-${idx}-${i}`} style={{ color: "#a5d6ff" }}>
            {strMatch[0]}
          </span>
        );
        rest = rest.slice(strMatch[0].length);
        i++;
        continue;
      }
      // Keywords
      const kwMatch = rest.match(
        /^\b(const|let|var|await|async|function|return|if|else|throw|new|export|import|from|type|interface|class|extends|implements|public|private|protected|readonly|static)\b/
      );
      if (kwMatch) {
        tokens.push(
          <span
            key={`k-${idx}-${i}`}
            style={{ color: "var(--color-accent)", fontWeight: 500 }}
          >
            {kwMatch[0]}
          </span>
        );
        rest = rest.slice(kwMatch[0].length);
        i++;
        continue;
      }
      // Number
      const numMatch = rest.match(/^-?\d+(?:\.\d+)?/);
      if (numMatch) {
        tokens.push(
          <span key={`n-${idx}-${i}`} style={{ color: "#a0e6ff" }}>
            {numMatch[0]}
          </span>
        );
        rest = rest.slice(numMatch[0].length);
        i++;
        continue;
      }
      // Function-like identifier followed by '('
      const fnMatch = rest.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\()/);
      if (fnMatch) {
        tokens.push(
          <span key={`f-${idx}-${i}`} style={{ color: "#ffd580" }}>
            {fnMatch[0]}
          </span>
        );
        rest = rest.slice(fnMatch[0].length);
        i++;
        continue;
      }
      // Default: 1 char
      tokens.push(rest[0]);
      rest = rest.slice(1);
      i++;
    }
    return (
      <span key={idx}>
        {tokens}
        {"\n"}
      </span>
    );
  });
}
