export const SNAPTRADE_DASHBOARD_URL = "https://dashboard.snaptrade.com";

export const linkClass =
  "text-accent underline decoration-2 underline-offset-4 transition-opacity hover:opacity-75";

export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
    </a>
  );
}
