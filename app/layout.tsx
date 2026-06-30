import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IndieBank | Banking for Global Freelancers",
  description:
    "Receive payments from clients worldwide, convert to USDC instantly, and withdraw to your local bank.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${urbanist.variable} font-sans antialiased`}>
        {/* Soft lava blobs — give frosted glass something to refract. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
          <div className="blob blob-a" />
          <div className="blob blob-b" />
          <div className="blob blob-c" />
          <div className="grain" />
        </div>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
