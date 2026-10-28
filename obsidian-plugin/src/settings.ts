import { App, PluginSettingTab, Setting } from "obsidian";
import type VaultfolioPlugin from "./main";
import { DEFAULT_FOLDER } from "./sync";

export interface VaultfolioSettings {
  appUrl: string;
  folder: string;
  // Plugin token: reads reports only. Stored in this vault's data.json, which
  // may be synced or committed, so the server treats it as low-trust.
  token: string | null;
  lastSyncAt: string | null;
}

export const DEFAULT_SETTINGS: VaultfolioSettings = {
  appUrl: "http://127.0.0.1:3000",
  folder: DEFAULT_FOLDER,
  token: null,
  lastSyncAt: null,
};

// Accepts only http(s) origins, so the token is never sent to another scheme.
export function normalizeAppUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export class VaultfolioSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: VaultfolioPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    const { settings } = this.plugin;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Vaultfolio address")
      .setDesc("Where the Vaultfolio web app is running.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.appUrl)
          .setValue(settings.appUrl)
          .onChange(async (value) => {
            const url = normalizeAppUrl(value);
            if (!url) return;
            settings.appUrl = url;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Folder")
      .setDesc("Reports are written here as YYYY-MM.md.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_FOLDER)
          .setValue(settings.folder)
          .onChange(async (value) => {
            settings.folder = value;
            await this.plugin.saveSettings();
          }),
      );

    const connection = new Setting(containerEl).setName("Connection");
    if (settings.token) {
      connection
        .setDesc(
          "Connected. This vault can read the monthly reports; access can be revoked here or in Vaultfolio settings.",
        )
        .addButton((button) =>
          button
            .setButtonText("Disconnect")
            .setWarning()
            .onClick(async () => {
              await this.plugin.disconnect();
              this.display();
            }),
        );
    } else {
      connection
        .setDesc(
          "Opens Vaultfolio in the browser to sign in with SnapTrade and pair this vault.",
        )
        .addButton((button) =>
          button
            .setButtonText("Connect")
            .setCta()
            .onClick(() => void this.plugin.connect()),
        );
    }

    new Setting(containerEl)
      .setName("Sync")
      .setDesc(
        settings.lastSyncAt
          ? `Last synced ${new Date(settings.lastSyncAt).toLocaleString()}. Reports also sync when Obsidian starts.`
          : "Reports sync when Obsidian starts, or with the command Vaultfolio: Sync now.",
      )
      .addButton((button) =>
        button
          .setButtonText("Sync now")
          .setDisabled(!settings.token)
          .onClick(async () => {
            await this.plugin.sync();
            this.display();
          }),
      );
  }
}
