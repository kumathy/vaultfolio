import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="mx-auto w-full max-w-3xl px-6 pt-10 pb-8">
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-border pb-5">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-accent"
        >
          Vaultfolio
        </Link>
        <nav aria-label="Main" className="text-sm text-muted">
          <Link
            href="/accounts"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Accounts
          </Link>
        </nav>
      </div>
    </header>
  );
}
