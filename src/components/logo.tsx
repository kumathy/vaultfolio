import Link from "next/link";

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="8" className="fill-accent" />
      <circle
        cx="16"
        cy="16"
        r="7.5"
        fill="none"
        strokeWidth="2.5"
        className="stroke-accent-contrast"
      />
      <path
        d="M16 8.5v4M16 19.5v4M8.5 16h4M19.5 16h4"
        strokeWidth="2.5"
        className="stroke-accent-contrast"
      />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 rounded-lg"
    >
      <LogoMark />
      <span className="text-[1.05rem] font-semibold tracking-tight text-foreground transition-colors group-hover:text-accent">
        Vaultfolio
      </span>
    </Link>
  );
}
