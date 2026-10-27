import type { NextRequest } from "next/server";
import { loadSettings } from "@/db/settings";
import { textResponse } from "@/lib/auth/http";
import { findSessionUserId, sessionCookieName } from "@/lib/auth/session";
import { localDate, parsePeriod } from "@/lib/reports/period";
import { resolveSettings } from "@/lib/reports/types";
import { tokenDeps } from "@/lib/snaptrade/config";
import { generateReport } from "@/lib/snaptrade/report";
import { ReauthorizationRequired } from "@/lib/snaptrade/tokens";

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/reports/[period]/markdown">,
) {
  const userId = await findSessionUserId(
    request.cookies.get(sessionCookieName())?.value,
  );
  if (!userId) return textResponse("Sign-in required.", 401);

  const period = parsePeriod((await params).period);
  if (!period) {
    return textResponse("Report period must be formatted as YYYY-MM.", 404);
  }

  const settings = await loadSettings(userId);
  const now = new Date();
  if (period.start > localDate(now, resolveSettings(settings).timeZone)) {
    return textResponse("Reports are not available for future months.", 404);
  }

  try {
    const report = await generateReport(
      tokenDeps,
      userId,
      period,
      settings,
      now,
    );
    const disposition =
      request.nextUrl.searchParams.get("download") === "1"
        ? "attachment"
        : "inline";
    return new Response(report.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `${disposition}; filename="${report.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ReauthorizationRequired) {
      return textResponse(
        "SnapTrade authorization expired. Sign in again.",
        401,
      );
    }
    console.error("Report generation failed", {
      kind: error instanceof Error ? error.name : typeof error,
    });
    return textResponse("The report could not be generated.", 502);
  }
}
