import { ArrowRight } from "lucide-react";

interface Tx {
  amount: string;
  city: string;
  country: string;
  emoji: string;
}

const TXNS: Tx[] = [
  { amount: "$1,250.00", city: "São Paulo", country: "BR", emoji: "🇧🇷" },
  { amount: "$420.00", city: "Berlin", country: "DE", emoji: "🇩🇪" },
  { amount: "$3,800.00", city: "Lagos", country: "NG", emoji: "🇳🇬" },
  { amount: "$675.50", city: "Buenos Aires", country: "AR", emoji: "🇦🇷" },
  { amount: "$5,400.00", city: "Lisbon", country: "PT", emoji: "🇵🇹" },
  { amount: "$1,025.75", city: "Mumbai", country: "IN", emoji: "🇮🇳" },
  { amount: "$890.00", city: "Mexico City", country: "MX", emoji: "🇲🇽" },
  { amount: "$2,400.00", city: "Cape Town", country: "ZA", emoji: "🇿🇦" },
  { amount: "$315.00", city: "Bali", country: "ID", emoji: "🇮🇩" },
  { amount: "$1,800.00", city: "Kyiv", country: "UA", emoji: "🇺🇦" },
];

/**
 * Infinite horizontal scroll of mock payment events. Pure CSS — no JS.
 * The marquee element is duplicated so the loop is seamless.
 */
export function PaymentTicker() {
  return (
    <div className="marquee-mask relative overflow-hidden py-3">
      <div className="marquee gap-3 pr-3">
        {[...TXNS, ...TXNS].map((tx, i) => (
          <div
            key={i}
            className="chip shrink-0 whitespace-nowrap"
            aria-hidden={i >= TXNS.length}
          >
            <span aria-hidden className="text-[14px] leading-none">
              {tx.emoji}
            </span>
            <span className="tabular-nums text-[var(--color-ink)] font-medium">
              {tx.amount}
            </span>
            <ArrowRight
              className="h-3 w-3 text-[var(--color-ink-3)]"
              strokeWidth={2}
            />
            <span className="text-[var(--color-ink-2)]">
              {tx.city}, {tx.country}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
