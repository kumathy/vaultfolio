import { connection, type NextRequest } from "next/server";
import { dbPairingStore } from "@/db/plugin";
import { exchangePairing, revokePluginSelf } from "@/lib/auth/plugin";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Called by the Obsidian plugin with the one-time code and its verifier.
export async function POST(request: NextRequest) {
  await connection();

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    body =
      typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const result = await exchangePairing(dbPairingStore, body);
  if (!result.ok) {
    console.warn("Plugin pairing rejected", { reason: result.reason });
    return json({ error: result.reason }, 400);
  }
  return json({ token: result.token });
}

// Called by the plugin when it disconnects; revokes the presenting token.
export async function DELETE(request: NextRequest) {
  await connection();
  const revoked = await revokePluginSelf(
    dbPairingStore,
    request.headers.get("authorization"),
  );
  return revoked
    ? new Response(null, { status: 204 })
    : json({ error: "invalid_token" }, 401);
}
