import { NotchNavbar } from "@/components/ui/notch-navbar";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NotchNavbar />
      <div className="pt-16">{children}</div>
    </>
  );
}
