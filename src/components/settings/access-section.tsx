import { TbLogout, TbPlugConnectedX } from "react-icons/tb";
import { DismissibleDetails } from "@/components/dismissible-details";
import { SnapTradeName } from "@/components/snaptrade";
import { buttonDanger, buttonSecondary, card, compact } from "@/components/ui";

// Plain forms posting to route handlers, so both work even when SnapTrade data
// cannot be loaded.
export function AccessSection({ email }: { email: string | null }) {
  return (
    <section
      aria-label="Account"
      className={`${card} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}
    >
      <div className="min-w-0">
        <p className="font-medium">
          Signed in with <SnapTradeName />
        </p>
        {email && <p className="mt-0.5 truncate text-sm text-muted">{email}</p>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <form method="post" action="/logout">
          <button
            type="submit"
            className={`${compact(buttonSecondary)} w-full sm:w-auto`}
          >
            <TbLogout aria-hidden />
            Sign out
          </button>
        </form>

        <DismissibleDetails className="group relative">
          <summary
            className={`${compact(buttonDanger)} w-full cursor-pointer list-none sm:w-auto [&::-webkit-details-marker]:hidden`}
          >
            <TbPlugConnectedX aria-hidden />
            Disconnect SnapTrade
          </summary>
          <div
            className={`${card} absolute top-full right-0 z-20 mt-2 w-full p-4 text-sm group-data-[above]:top-auto group-data-[above]:bottom-full group-data-[above]:mt-0 group-data-[above]:mb-2 sm:w-80`}
          >
            <p className="leading-relaxed text-muted">
              Removes Vaultfolio’s access to brokerage data and signs out on
              every device. Settings are kept. Signing in again reconnects.
            </p>
            <form method="post" action="/disconnect" className="mt-3">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full bg-attention px-4 py-2 text-sm font-medium whitespace-nowrap text-background transition-opacity hover:opacity-90"
              >
                Confirm disconnect
              </button>
            </form>
          </div>
        </DismissibleDetails>
      </div>
    </section>
  );
}
