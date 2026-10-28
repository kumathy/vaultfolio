import { describe, expect, it } from "vitest";
import {
  authenticatePlugin,
  challengeFor,
  cleanLabel,
  exchangePairing,
  isChallenge,
  pairReturnPath,
  PAIRING_TTL_MS,
  revokePluginSelf,
  startPairing,
  type PairingStore,
} from "@/lib/auth/plugin";

function memoryStore() {
  const codes = new Map<
    string,
    { userId: string; challenge: string; expiresAt: Date }
  >();
  const tokens = new Map<string, { userId: string; label: string }>();
  const store: PairingStore = {
    async savePairingCode({ codeHash, ...rest }) {
      codes.set(codeHash, rest);
    },
    async takePairingCode(codeHash, now) {
      const entry = codes.get(codeHash);
      codes.delete(codeHash);
      return entry && entry.expiresAt > now
        ? { userId: entry.userId, challenge: entry.challenge }
        : null;
    },
    async saveToken({ tokenHash, ...rest }) {
      tokens.set(tokenHash, rest);
    },
    async useToken(tokenHash) {
      return tokens.get(tokenHash)?.userId ?? null;
    },
    async deleteToken(tokenHash) {
      tokens.delete(tokenHash);
    },
  };
  return { store, codes, tokens };
}

// RFC 7636 appendix B test vector.
const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const now = new Date("2026-10-28T12:00:00Z");

describe("plugin pairing", () => {
  it("derives the S256 challenge as in RFC 7636", () => {
    expect(challengeFor(verifier)).toBe(challenge);
    expect(isChallenge(challenge)).toBe(true);
    expect(isChallenge("too-short")).toBe(false);
    expect(isChallenge(undefined)).toBe(false);
  });

  it("exchanges a code and verifier for a plugin token, stored hashed", async () => {
    const { store, tokens } = memoryStore();
    const code = await startPairing(store, "user-1", challenge, now);
    const result = await exchangePairing(
      store,
      { code, verifier, label: "Personal vault" },
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.token).toMatch(/^vfp_[A-Za-z0-9_-]{43}$/);
    expect([...tokens.keys()]).not.toContain(result.token);
    expect([...tokens.values()]).toEqual([
      { userId: "user-1", label: "Personal vault" },
    ]);
    expect(await authenticatePlugin(store, `Bearer ${result.token}`, now)).toBe(
      "user-1",
    );
  });

  it("accepts a code only once", async () => {
    const { store } = memoryStore();
    const code = await startPairing(store, "user-1", challenge, now);
    expect((await exchangePairing(store, { code, verifier }, now)).ok).toBe(
      true,
    );
    expect(await exchangePairing(store, { code, verifier }, now)).toEqual({
      ok: false,
      reason: "invalid_code",
    });
  });

  it("rejects an expired code", async () => {
    const { store } = memoryStore();
    const code = await startPairing(store, "user-1", challenge, now);
    const later = new Date(now.getTime() + PAIRING_TTL_MS + 1);
    expect(await exchangePairing(store, { code, verifier }, later)).toEqual({
      ok: false,
      reason: "invalid_code",
    });
  });

  it("rejects an intercepted code without the plugin's verifier, and burns it", async () => {
    const { store } = memoryStore();
    const code = await startPairing(store, "user-1", challenge, now);
    const attacker = "a".repeat(43);
    expect(
      await exchangePairing(store, { code, verifier: attacker }, now),
    ).toEqual({ ok: false, reason: "invalid_code" });
    expect(await exchangePairing(store, { code, verifier }, now)).toEqual({
      ok: false,
      reason: "invalid_code",
    });
  });

  it("rejects malformed requests before touching the store", async () => {
    const { store, codes } = memoryStore();
    await startPairing(store, "user-1", challenge, now);
    for (const input of [
      {},
      { code: "x", verifier: "short" },
      { code: 42, verifier },
      { code: "x".repeat(200), verifier },
    ]) {
      expect(await exchangePairing(store, input, now)).toEqual({
        ok: false,
        reason: "invalid_request",
      });
    }
    expect(codes.size).toBe(1);
  });

  it("lets a plugin revoke its own token", async () => {
    const { store } = memoryStore();
    const code = await startPairing(store, "user-1", challenge, now);
    const result = await exchangePairing(store, { code, verifier }, now);
    if (!result.ok) throw new Error("pairing failed");
    const header = `Bearer ${result.token}`;
    expect(await revokePluginSelf(store, header)).toBe(true);
    expect(await authenticatePlugin(store, header, now)).toBeNull();
    expect(await revokePluginSelf(store, "Bearer nope")).toBe(false);
  });

  it("authenticates only well-formed, known plugin tokens", async () => {
    const { store } = memoryStore();
    for (const header of [
      null,
      "",
      "Bearer",
      "Basic abc",
      "Bearer not-a-plugin-token",
      `Bearer vfp_${"x".repeat(43)}`,
    ]) {
      expect(await authenticatePlugin(store, header, now)).toBeNull();
    }
  });

  it("returns to the pairing page only, rebuilt from a valid challenge", () => {
    expect(pairReturnPath(`/pair?challenge=${challenge}`)).toBe(
      `/pair?challenge=${challenge}`,
    );
    for (const value of [
      null,
      "/accounts",
      "/pair",
      "/pair?challenge=short",
      `/pair?challenge=${challenge}&next=/evil`,
      `https://evil.example/pair?challenge=${challenge}`,
      `//evil.example/pair?challenge=${challenge}`,
      `/\\evil.example/pair?challenge=${challenge}`,
    ]) {
      expect(pairReturnPath(value)).toBeNull();
    }
  });

  it("cleans labels for display", () => {
    expect(cleanLabel("  Work\nvault  ")).toBe("Workvault");
    expect(cleanLabel("")).toBe("Obsidian vault");
    expect(cleanLabel(undefined)).toBe("Obsidian vault");
    expect(cleanLabel("x".repeat(100))).toHaveLength(60);
  });
});
