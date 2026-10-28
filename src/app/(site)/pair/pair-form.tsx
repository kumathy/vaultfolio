"use client";

import { useActionState, useEffect } from "react";
import { buttonPrimary, large } from "@/components/ui";
import { connectVault, type PairState } from "./actions";

export function PairForm({ challenge }: { challenge: string }) {
  const [state, connect, pending] = useActionState<PairState, FormData>(
    connectVault,
    { status: "idle" },
  );

  useEffect(() => {
    if (state.status === "ready") window.location.href = state.url;
  }, [state]);

  if (state.status === "ready") {
    return (
      <div className="space-y-3" role="status">
        <p className="font-medium">Opening Obsidian…</p>
        <p className="text-sm leading-relaxed text-muted">
          If Obsidian does not open,{" "}
          <a
            href={state.url}
            className="text-foreground underline underline-offset-4"
          >
            open it from this link
          </a>
          . The link works once and expires in 5 minutes.
        </p>
      </div>
    );
  }

  return (
    <form action={connect} className="space-y-3">
      <input type="hidden" name="challenge" value={challenge} />
      <button
        type="submit"
        disabled={pending}
        className={`${large(buttonPrimary)} disabled:opacity-60`}
      >
        {pending ? "Connecting…" : "Connect this vault"}
      </button>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-attention">
          {state.message}
        </p>
      )}
    </form>
  );
}
