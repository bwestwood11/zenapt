import crypto from "crypto";

type Header = {
  alg: "HS256";
  typ: "JWT";
  v: number; // versioning for key rotation
};

type Payload = {
  email: string;
  name?: string;
  [key: string]: any;
  exp: number; // expiry timestamp
};

const ALGORITHM = "sha256";
const EXPIRY_DAYS = 7;

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(data: string, secret: string): string {
  return base64url(crypto.createHmac(ALGORITHM, secret).update(data).digest());
}

/**
 * Create a secure HMAC token (JWT style)
 */
export function createInvitationToken(user: Omit<Payload, "exp">): string {
  const header: Header = { alg: "HS256", typ: "JWT", v: 1 };
  const payload = {
    ...user,
    exp: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };
  const SECRET = process.env.INVITE_SECRET!;
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = sign(`${headerB64}.${payloadB64}`, SECRET);

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Verify token integrity and expiry
 */
export function verifyInvitationToken(token: string): Payload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const SECRET = process.env.INVITE_SECRET!;
  const [headerB64, payloadB64, signature] = parts;

  const expected = sign(`${headerB64}.${payloadB64}`, SECRET);

  // normalize lengths for timingSafeEqual
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;

  if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64").toString("utf8")
  ) as Payload;

  if (Math.floor(Date.now() / 1000) > payload.exp) {
    return null; // expired
  }

  return payload;
}