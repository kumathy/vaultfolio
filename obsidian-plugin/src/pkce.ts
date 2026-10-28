// Pairing uses the PKCE pattern (RFC 7636, S256): the verifier stays in the
// plugin and only its hash travels through the browser. A pairing code
// intercepted on its way back through the obsidian:// link is useless
// without the verifier.

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createVerifier(): string {
  // 32 random bytes encode to 43 characters, the RFC 7636 minimum length.
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64url(new Uint8Array(digest));
}
