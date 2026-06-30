import { gateOperatorPage } from "@/lib/auth";

export default async function ComplianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await gateOperatorPage();
  return <>{children}</>;
}
