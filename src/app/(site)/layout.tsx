import { SiteFooter } from "@/components/site/site-footer";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
