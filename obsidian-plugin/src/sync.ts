// Decides what a sync writes. Kept free of Obsidian APIs so it can be tested.

export interface RemoteReport {
  period: string;
  fileName: string;
  markdown: string;
}

export interface SyncPlan {
  create: { path: string; content: string }[];
  update: { path: string; content: string }[];
  unchanged: string[];
  // Existing notes that are not Vaultfolio reports; never overwritten.
  skipped: string[];
}

export const DEFAULT_FOLDER = "Investing";

// "Investing/", "/Investing", " Investing " all mean the same folder. An empty
// value falls back to the default rather than the vault root.
export function normalizeFolder(value: string): string {
  const folder = value
    .trim()
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part !== "" && part !== "." && part !== "..")
    .join("/");
  return folder || DEFAULT_FOLDER;
}

// Only notes with `type: investing-report` in their frontmatter are treated
// as Vaultfolio's, so a user's own note with the same name is left alone.
export function isVaultfolioReport(content: string): boolean {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match !== null && /^type:\s*investing-report\s*$/m.test(match[1]);
}

// Report file names come from the server; anything other than YYYY-MM.md is
// refused, so a response can never write outside the folder.
const FILE_NAME = /^\d{4}-\d{2}\.md$/;

export function planSync(
  reports: RemoteReport[],
  folder: string,
  existing: (path: string) => string | null,
): SyncPlan {
  const plan: SyncPlan = { create: [], update: [], unchanged: [], skipped: [] };
  for (const report of reports) {
    if (!FILE_NAME.test(report.fileName)) continue;
    const path = `${folder}/${report.fileName}`;
    const current = existing(path);
    if (current === null) {
      plan.create.push({ path, content: report.markdown });
    } else if (!isVaultfolioReport(current)) {
      plan.skipped.push(path);
    } else if (current === report.markdown) {
      plan.unchanged.push(path);
    } else {
      plan.update.push({ path, content: report.markdown });
    }
  }
  return plan;
}

export function summarize(plan: SyncPlan): string {
  const written = plan.create.length + plan.update.length;
  const parts = [
    written === 0
      ? "Reports are up to date"
      : `${written} report${written === 1 ? "" : "s"} written`,
  ];
  if (plan.skipped.length > 0) {
    parts.push(
      `${plan.skipped.length} skipped (existing notes with the same name: ${plan.skipped.join(", ")})`,
    );
  }
  return `Vaultfolio: ${parts.join("; ")}.`;
}
