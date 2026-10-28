"use server";

import { dbPairingStore } from "@/db/plugin";
import { requireUserId } from "@/lib/auth/session";
import { isChallenge, startPairing } from "@/lib/auth/plugin";

export type PairState =
  | { status: "idle" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

// A POST (Server Action) rather than a GET, so a pairing code is only issued
// after an explicit click by the signed-in user, never by a link or prefetch.
export async function connectVault(
  _: PairState,
  form: FormData,
): Promise<PairState> {
  const userId = await requireUserId();
  const challenge = form.get("challenge");
  if (!isChallenge(challenge)) {
    return {
      status: "error",
      message: "This pairing link is invalid. Start again from the plugin.",
    };
  }
  const code = await startPairing(dbPairingStore, userId, challenge);
  return {
    status: "ready",
    url: `obsidian://vaultfolio?code=${encodeURIComponent(code)}`,
  };
}
