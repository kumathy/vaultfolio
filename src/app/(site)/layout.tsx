import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <div className="flex-1 animate-page-in motion-reduce:animate-none">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
