import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); 
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, SECRET_KEY, iv);

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Pack iv + tag + ciphertext into one base64 string
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(data: string): string {
  const raw = Buffer.from(data, "base64");

  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = raw.subarray(IV_LENGTH + 16);

  const decipher = createDecipheriv(ALGORITHM, SECRET_KEY, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

