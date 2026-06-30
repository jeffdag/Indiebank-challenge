import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 font-sans antialiased">
      <div className="w-full max-w-md nm-fade-in-up">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2.5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-[14px] font-bold tracking-tight text-[var(--color-accent-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_10px_-4px_rgba(180,220,0,0.55)]">
            N
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.012em] text-[var(--color-ink)]">
            IndieBank
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
