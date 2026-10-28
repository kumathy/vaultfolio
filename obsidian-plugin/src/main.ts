import { normalizePath, Notice, Plugin, TFile } from "obsidian";
import { ApiError, exchangeCode, fetchReports, revokeToken } from "./api";
import { challengeFor, createVerifier } from "./pkce";
import {
  DEFAULT_SETTINGS,
  normalizeAppUrl,
  VaultfolioSettingTab,
  type VaultfolioSettings,
} from "./settings";
import { normalizeFolder, planSync, summarize } from "./sync";

export default class VaultfolioPlugin extends Plugin {
  settings: VaultfolioSettings = { ...DEFAULT_SETTINGS };
  // Kept in memory only: the verifier is needed for a few minutes and never
  // belongs in data.json.
  private pendingVerifier: string | null = null;
  private syncing = false;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new VaultfolioSettingTab(this.app, this));

    this.registerObsidianProtocolHandler("vaultfolio", (params) => {
      void this.completePairing(params.code);
    });

    this.addCommand({
      id: "sync-now",
      name: "Sync now",
      callback: () => void this.sync(),
    });

    this.app.workspace.onLayoutReady(() => {
      if (this.settings.token) void this.sync({ quiet: true });
    });
  }

  async loadSettings() {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private appUrl(): string {
    return normalizeAppUrl(this.settings.appUrl) ?? DEFAULT_SETTINGS.appUrl;
  }

  async connect() {
    const verifier = createVerifier();
    this.pendingVerifier = verifier;
    const challenge = await challengeFor(verifier);
    window.open(`${this.appUrl()}/pair?challenge=${challenge}`);
  }

  private async completePairing(code: string | undefined) {
    const verifier = this.pendingVerifier;
    // Links that did not start from this plugin's Connect are ignored.
    if (!code || !verifier) {
      new Notice("Vaultfolio: start pairing from the plugin settings.");
      return;
    }
    this.pendingVerifier = null;
    try {
      this.settings.token = await exchangeCode(this.appUrl(), {
        code,
        verifier,
        label: this.app.vault.getName(),
      });
      await this.saveSettings();
      new Notice("Vaultfolio: vault connected.");
      await this.sync();
    } catch (error) {
      new Notice(`Vaultfolio: ${errorMessage(error)}`);
    }
  }

  async disconnect() {
    const token = this.settings.token;
    this.settings.token = null;
    await this.saveSettings();
    if (token) await revokeToken(this.appUrl(), token);
    new Notice("Vaultfolio: vault disconnected.");
  }

  async sync({ quiet = false }: { quiet?: boolean } = {}) {
    const token = this.settings.token;
    if (!token) {
      if (!quiet)
        new Notice("Vaultfolio: connect the vault in settings first.");
      return;
    }
    if (this.syncing) return;
    this.syncing = true;
    try {
      const reports = await fetchReports(this.appUrl(), token);
      const folder = normalizePath(normalizeFolder(this.settings.folder));
      await this.ensureFolder(folder);

      const { vault } = this.app;
      const existing = new Map<string, string>();
      for (const report of reports) {
        const path = normalizePath(`${folder}/${report.fileName}`);
        const file = vault.getAbstractFileByPath(path);
        if (file instanceof TFile) existing.set(path, await vault.read(file));
        // A folder with a report's name is never replaced.
        else if (file) existing.set(path, "");
      }

      const plan = planSync(
        reports,
        folder,
        (path) => existing.get(path) ?? null,
      );
      for (const { path, content } of plan.create) {
        await vault.create(path, content);
      }
      for (const { path, content } of plan.update) {
        const file = vault.getAbstractFileByPath(path);
        if (file instanceof TFile) await vault.modify(file, content);
      }

      this.settings.lastSyncAt = new Date().toISOString();
      await this.saveSettings();
      const changed =
        plan.create.length + plan.update.length + plan.skipped.length;
      if (!quiet || changed > 0) new Notice(summarize(plan));
    } catch (error) {
      if (error instanceof ApiError && error.kind === "invalid_token") {
        this.settings.token = null;
        await this.saveSettings();
      }
      new Notice(`Vaultfolio: ${errorMessage(error)}`);
    } finally {
      this.syncing = false;
    }
  }

  private async ensureFolder(folder: string) {
    let path = "";
    for (const part of folder.split("/")) {
      path = path ? `${path}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(path)) {
        await this.app.vault.createFolder(path);
      }
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "something went wrong while syncing.";
}
