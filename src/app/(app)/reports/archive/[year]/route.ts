import type { NextRequest } from "next/server";
import { loadSettings } from "@/db/settings";
import { textResponse } from "@/lib/auth/http";
import { findSessionUserId, sessionCookieName } from "@/lib/auth/session";
import { buildArchive } from "@/lib/reports/archive";
import { tokenDeps } from "@/lib/snaptrade/config";
import { loadReportAccounts } from "@/lib/snaptrade/report";
import { ReauthorizationRequired } from "@/lib/snaptrade/tokens";

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/reports/archive/[year]">,
) {
  const userId = await findSessionUserId(
    request.cookies.get(sessionCookieName())?.value,
  );
  if (!userId) return textResponse("Sign-in required.", 401);

  const { year: requested } = await params;
  const year = /^\d{4}$/.test(requested) ? Number(requested) : NaN;
  if (!Number.isInteger(year) || year < 2000) {
    return textResponse("Year must be four digits, such as 2026.", 404);
  }

  try {
    const settings = await loadSettings(userId);
    const now = new Date();
    const accounts = await loadReportAccounts(tokenDeps, userId, settings);
    const archive = buildArchive(accounts, year, now, settings);
    if (!archive)
      return textResponse(`No reports are available for ${year}.`, 404);

    return new Response(archive.bytes as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${archive.fileName}"`,
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
    console.error("Report archive failed", {
      kind: error instanceof Error ? error.name : typeof error,
    });
    return textResponse("The reports could not be generated.", 502);
  }
}
