import { TbLogout, TbPlugConnectedX } from "react-icons/tb";
import { buttonDanger, buttonSecondary, compact } from "@/components/ui";

const row =
  "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between";

// Plain forms posting to route handlers, so both work even when SnapTrade data
// cannot be loaded.
export function AccessActions() {
  return (
    <div className="divide-y divide-border rounded-xl border border-border">
      <div className={row}>
        <div>
          <p className="font-medium">Sign out</p>
          <p className="mt-0.5 text-sm text-muted">
            Ends this browser session. SnapTrade access stays in place.
          </p>
        </div>
        <form method="post" action="/logout">
          <button
            type="submit"
            className={`${compact(buttonSecondary)} w-full sm:w-auto`}
          >
            <TbLogout aria-hidden />
            Sign out
          </button>
        </form>
      </div>

      <div className={row}>
        <div>
          <p className="font-medium">Disconnect SnapTrade</p>
          <p className="mt-0.5 text-sm text-muted">
            Revokes Vaultfolio’s access at SnapTrade and deletes the stored
            tokens. Settings are kept.
          </p>
        </div>
        <details className="group shrink-0 sm:text-right">
          <summary
            className={`${compact(buttonDanger)} w-full cursor-pointer list-none sm:w-auto [&::-webkit-details-marker]:hidden`}
          >
            <TbPlugConnectedX aria-hidden />
            Disconnect…
          </summary>
          <div className="mt-3 rounded bg-attention-soft px-4 py-3 text-left text-sm sm:w-72">
            <p className="leading-relaxed">
              Reports stop until access is granted again by signing in.
            </p>
            <form method="post" action="/disconnect" className="mt-3">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full bg-attention px-4 py-2 text-sm font-medium whitespace-nowrap text-background transition-opacity hover:opacity-90"
              >
                Disconnect SnapTrade
              </button>
            </form>
          </div>
        </details>
      </div>
    </div>
  );
}
