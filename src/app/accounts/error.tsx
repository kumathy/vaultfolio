"use client";

export default function AccountsError({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6">
      <h1 className="mb-3 text-3xl font-semibold tracking-tight">Accounts</h1>
      <div className="mt-4 border-l-2 border-attention bg-surface px-4 py-3 text-sm leading-relaxed">
        <p className="font-medium text-attention">Attention</p>
        <p className="mt-1">Accounts could not be displayed.</p>
      </div>
      <button
        type="button"
        onClick={retry}
        className="mt-6 border-2 border-border px-4 py-2 text-sm font-medium transition-colors hover:border-foreground"
      >
        Retry
      </button>
    </main>
  );
}
