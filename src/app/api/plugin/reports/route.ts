import { connection, type NextRequest } from "next/server";
import { dbPairingStore } from "@/db/plugin";
import { loadSettings } from "@/db/settings";
import { authenticatePlugin } from "@/lib/auth/plugin";
import { buildAllReports } from "@/lib/reports/archive";
import { tokenDeps } from "@/lib/snaptrade/config";
import { loadReportAccounts } from "@/lib/snaptrade/report";
import { ReauthorizationRequired } from "@/lib/snaptrade/tokens";

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", ...headers },
  });

// The plugin's only data route: rendered reports, generated on request and
// not stored. The plugin token grants nothing else.
export async function GET(request: NextRequest) {
  await connection();

  const userId = await authenticatePlugin(
    dbPairingStore,
    request.headers.get("authorization"),
  );
  if (!userId) {
    return json({ error: "invalid_token" }, 401, {
      "WWW-Authenticate": 'Bearer error="invalid_token"',
    });
  }

  try {
    const settings = await loadSettings(userId);
    const now = new Date();
    const accounts = await loadReportAccounts(tokenDeps, userId, settings);
    return json({
      generatedAt: now.toISOString(),
      reports: buildAllReports(accounts, now, settings).map(
        ({ period, report }) => ({
          period,
          fileName: report.fileName,
          markdown: report.markdown,
        }),
      ),
    });
  } catch (error) {
    if (error instanceof ReauthorizationRequired) {
      return json({ error: "reauthorize" }, 403);
    }
    console.error("Plugin reports failed", {
      kind: error instanceof Error ? error.name : typeof error,
    });
    return json({ error: "unavailable" }, 502);
  }
}
