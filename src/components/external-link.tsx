import { TbArrowUpRight } from "react-icons/tb";

// Outbound links are neutral with an arrow; the accent marks Vaultfolio's own actions.
export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium whitespace-nowrap text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
    >
      {children}
      <TbArrowUpRight
        aria-hidden
        className="-mr-0.5 ml-0.5 inline-block align-[-0.1em] text-[0.9em]"
      />
      <span className="sr-only">
        {" "}
        (opens {new URL(href).host} in a new tab)
      </span>
    </a>
  );
}
