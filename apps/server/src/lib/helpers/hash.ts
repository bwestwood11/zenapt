// crypto-utils.ts
import crypto from "crypto";

// REQUIRED ENV:
// process.env.SIGNING_KEY -> any secret used for HMAC signing
const SIGNING_KEY = process.env.SIGNING_KEY || "";
if (!SIGNING_KEY) throw new Error("SIGNING_KEY must be set in env.");

/**
 * Pack an object with optional expAt into JSON string.
 * expAt can be Date | number (unix seconds or ms) | ISO string
 */
function buildPayload(obj: unknown, expAt?: Date | number | string) {
  let exp: number | undefined;
  if (expAt !== undefined) {
    if (expAt instanceof Date) exp = Math.floor(expAt.getTime() / 1000);
    else if (typeof expAt === "string")
      exp = Math.floor(new Date(expAt).getTime() / 1000);
    else if (typeof expAt === "number") {
      // treat number as seconds if plausible, otherwise ms
      exp = expAt > 1e12 ? Math.floor(expAt / 1000) : Math.floor(expAt);
    }
    if (!exp || Number.isNaN(exp)) throw new Error("Invalid expAt provided");
  }

  const payload = { data: obj, exp }; // exp may be undefined
  return JSON.stringify(payload);
}

/**
 * HMAC-SHA256 sign
 */
function signHex(data: string): string {
  return crypto
    .createHmac("sha256", SIGNING_KEY)
    .update(Buffer.from(data, "utf8"))
    .digest("hex");
}

/**
 * Constant-time hex compare
 */
function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  if (a.length !== b.length) {
    // timingSafeEqual requires equal length; do a fake compare to keep timing similar
    const fake = Buffer.alloc(Math.max(a.length, b.length));
    try {
      return crypto.timingSafeEqual(
        Buffer.concat([a, fake]).slice(0, fake.length),
        Buffer.concat([b, fake]).slice(0, fake.length)
      );
    } catch {
      return false;
    }
  }
  return crypto.timingSafeEqual(a, b);
}

/**
 * Public API
 */

/**
 * Create a signed token for an object.
 * Returns a string: `${signatureHex}.${base64Payload}`
 */
export function createSignedToken<T extends Object>(
  obj: T,
  expAt?: Date | number | string
): string {
  const payloadJson = buildPayload(obj, expAt);

  const base64Payload = Buffer.from(payloadJson, "utf8").toString("base64");

  const sigHex = signHex(base64Payload);
  return `${sigHex}.${base64Payload}`;
}

/**
 * Verify signature, decode payload, and check expiration (if present).
 * Returns the original object `data` if valid.
 * Throws on invalid signature, malformed, or expired.
 */
export function verifySignedToken<T extends Object>(
  token: string
): { data: T | undefined; exp?: number } {
  if (!token || typeof token !== "string") throw new Error("Token is required");

  console.log(token);

  const sepIndex = token.indexOf(".");
  if (sepIndex <= 0) throw new Error("Invalid token format");

  const sigHex = token.slice(0, sepIndex);

  const base64Payload = token.slice(sepIndex + 1);

  // verify signature
  const expectedSig = signHex(base64Payload);

  if (!timingSafeEqualHex(sigHex, expectedSig)) {
    throw new Error("Invalid signature or token tampered");
  }

  // decode payload
  let payloadJson: string;
  try {
    payloadJson = Buffer.from(base64Payload, "base64").toString("utf8");
  } catch (e) {
    throw new Error("Failed to decode token payload");
  }

  // parse JSON
  let parsed: { data: T; exp?: number };
  try {
    parsed = JSON.parse(payloadJson);
  } catch (e) {
    throw new Error("Failed to parse token payload");
  }

  // verify exp if present (exp is unix seconds)
  if (parsed.exp !== undefined && parsed.exp !== null) {
    const now = Math.floor(Date.now() / 1000);
    if (typeof parsed.exp !== "number") throw new Error("Invalid exp field");
    if (now > parsed.exp) throw new Error("Token expired");
  }

  return parsed;
}

/**
 * Convenience: create token with TTL seconds from now
 */
export function createTokenWithTTL<T extends Object>(
  obj: T,
  ttlSeconds: number
): string {
  const exp = Math.floor(Date.now() / 1000) + Math.floor(ttlSeconds);
  return createSignedToken(obj, exp);
}
