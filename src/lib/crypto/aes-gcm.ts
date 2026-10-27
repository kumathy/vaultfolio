import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
// Version prefix allows a later key or algorithm rotation.
const VERSION = "v1";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function parseKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `Encryption key must be ${KEY_BYTES} bytes, base64-encoded`,
    );
  }
  return key;
}

// `context` (e.g. "<userId>|refresh_token") is bound as additional
// authenticated data, so a ciphertext copied into another row or column fails
// to decrypt (ciphertext substitution).
export function encrypt(
  plaintext: string,
  key: Buffer,
  context: string,
): string {
  // Reusing an IV under the same GCM key breaks confidentiality and integrity.
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_BYTES,
  });
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return [VERSION, iv, ciphertext, cipher.getAuthTag()]
    .map((part) =>
      typeof part === "string" ? part : part.toString("base64url"),
    )
    .join(".");
}

export function decrypt(payload: string, key: Buffer, context: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Unsupported ciphertext format");
  }
  const [iv, ciphertext, tag] = parts
    .slice(1)
    .map((part) => Buffer.from(part, "base64url"));

  // Truncated tags would make forgery easier.
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("Unsupported ciphertext format");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_BYTES,
  });
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
