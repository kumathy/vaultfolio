import type { NextRequest } from "next/server";
import { findSessionUserId, sessionCookieName } from "@/lib/auth/session";
import { localDate, parsePeriod } from "@/lib/reports/period";
import { DEFAULT_SETTINGS } from "@/lib/reports/types";
import { tokenDeps } from "@/lib/snaptrade/config";
import { generateReport } from "@/lib/snaptrade/report";
import { ReauthorizationRequired } from "@/lib/snaptrade/tokens";

const text = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/reports/[period]">,
) {
  const userId = await findSessionUserId(
    request.cookies.get(sessionCookieName())?.value,
  );
  if (!userId) return text("Sign-in required.", 401);

  const { period: requested } = await params;
  const period = parsePeriod(requested.replace(/\.md$/, ""));
  if (!period) return text("Report period must be formatted as YYYY-MM.", 404);

  const now = new Date();
  if (period.start > localDate(now, DEFAULT_SETTINGS.timeZone)) {
    return text("Reports are not available for future months.", 404);
  }

  try {
    const report = await generateReport(tokenDeps, userId, period, {}, now);
    return new Response(report.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `inline; filename="${report.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ReauthorizationRequired) {
      return text("SnapTrade authorization expired. Sign in again.", 401);
    }
    console.error("Report generation failed", {
      kind: error instanceof Error ? error.name : typeof error,
    });
    return text("The report could not be generated.", 502);
  }
}
