import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt, encrypt, parseKey } from "@/lib/crypto/aes-gcm";
import { randomToken, safeEqual, sha256Hex } from "@/lib/crypto/random";

const key = randomBytes(32);
const context = "user-1|refresh_token";

function splitSealed(sealed: string) {
  const [version, iv, ciphertext, tag] = sealed.split(".");
  return { version, iv, ciphertext, tag };
}

describe("aes-gcm", () => {
  it("round-trips a value without exposing the plaintext", () => {
    const sealed = encrypt("secret-token", key, context);
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("secret-token");
    expect(decrypt(sealed, key, context)).toBe("secret-token");
  });

  it("uses a fresh IV for every encryption", () => {
    expect(encrypt("same", key, context)).not.toBe(
      encrypt("same", key, context),
    );
  });

  it("rejects a modified ciphertext", () => {
    const { version, iv, ciphertext, tag } = splitSealed(
      encrypt("secret-token", key, context),
    );
    const bytes = Buffer.from(ciphertext, "base64url");
    bytes[0] ^= 0x01;
    const tampered = [version, iv, bytes.toString("base64url"), tag].join(".");
    expect(() => decrypt(tampered, key, context)).toThrow();
  });

  it("rejects a value moved to another row or column", () => {
    const sealed = encrypt("secret-token", key, context);
    expect(() => decrypt(sealed, key, "user-2|refresh_token")).toThrow();
    expect(() => decrypt(sealed, key, "user-1|access_token")).toThrow();
  });

  it("rejects the wrong key", () => {
    const sealed = encrypt("secret-token", key, context);
    expect(() => decrypt(sealed, randomBytes(32), context)).toThrow();
  });

  it("rejects a truncated tag and an unknown version", () => {
    const { version, iv, ciphertext, tag } = splitSealed(
      encrypt("secret-token", key, context),
    );
    const shortTag = Buffer.from(tag, "base64url")
      .subarray(0, 4)
      .toString("base64url");
    expect(() =>
      decrypt([version, iv, ciphertext, shortTag].join("."), key, context),
    ).toThrow();
    expect(() =>
      decrypt(["v0", iv, ciphertext, tag].join("."), key, context),
    ).toThrow();
  });

  it("requires a 32-byte key", () => {
    expect(parseKey(randomBytes(32).toString("base64"))).toHaveLength(32);
    expect(() => parseKey(randomBytes(16).toString("base64"))).toThrow();
  });
});

describe("random helpers", () => {
  it("generates distinct URL-safe tokens", () => {
    const token = randomToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(token);
  });

  it("hashes with SHA-256", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("compares strings of any length", () => {
    expect(safeEqual("state-1", "state-1")).toBe(true);
    expect(safeEqual("state-1", "state-2")).toBe(false);
    expect(safeEqual("short", "much-longer-value")).toBe(false);
  });
});
