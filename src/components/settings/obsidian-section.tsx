import { revokeVault } from "@/app/(app)/settings/actions";
import {
  PluginDownloadLink,
  PluginInstallSteps,
} from "@/components/plugin-download";
import { compact, buttonSecondary } from "@/components/ui";
import type { ConnectedVault } from "@/db/plugin";
import { localDate } from "@/lib/reports/period";
import { SettingsSection } from "./form-kit";

export function ObsidianSection({
  vaults,
  timeZone,
}: {
  vaults: ConnectedVault[];
  timeZone: string;
}) {
  return (
    <SettingsSection
      id="obsidian"
      title="Obsidian"
      description="Vaults paired with the Vaultfolio plugin. A vault can only read the monthly reports; revoking it stops syncing immediately."
    >
      {vaults.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">No vaults are connected.</p>
          <PluginInstallSteps />
          <PluginDownloadLink />
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {vaults.map((vault) => (
              <li
                key={vault.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{vault.label}</p>
                  <p className="text-sm text-muted">
                    Connected {localDate(vault.createdAt, timeZone)} ·{" "}
                    {vault.lastUsedAt
                      ? `Last synced ${localDate(vault.lastUsedAt, timeZone)}`
                      : "Not synced yet"}
                  </p>
                </div>
                <form action={revokeVault.bind(null, vault.id)}>
                  <button
                    type="submit"
                    className={`${compact(buttonSecondary)} w-full sm:w-auto`}
                  >
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <PluginDownloadLink className="mt-4" />
        </>
      )}
    </SettingsSection>
  );
}
