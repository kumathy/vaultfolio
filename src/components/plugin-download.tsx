import { TbDownload } from "react-icons/tb";
import { buttonSecondary, compact } from "@/components/ui";

export const PLUGIN_DOWNLOAD_URL = "/downloads/vaultfolio.zip";

export function PluginDownloadLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={PLUGIN_DOWNLOAD_URL}
      download
      className={`${compact(buttonSecondary)} ${className}`}
    >
      <TbDownload aria-hidden />
      Download plugin
    </a>
  );
}

export function PluginInstallSteps() {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted marker:text-muted">
      <li>
        Unzip into the vault&rsquo;s{" "}
        <code className="font-mono text-xs text-foreground">
          .obsidian/plugins/
        </code>{" "}
        folder.
      </li>
      <li>Enable Vaultfolio in Settings → Community plugins.</li>
      <li>Choose Connect in Vaultfolio&rsquo;s settings.</li>
    </ol>
  );
}
