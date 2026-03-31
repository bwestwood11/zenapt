import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { CustomerJWTPayload } from "./types";

export const CUSTOMER_ACCESS_COOKIE = "customer_access";
export const CUSTOMER_REFRESH_COOKIE = "customer_refresh";

const CUSTOMER_JWT_SECRET = process.env.CUSTOMER_JWT_SECRET!;
// if (!CUSTOMER_JWT_SECRET) {
//   throw new Error("CUSTOMER_JWT_SECRET must be set in env.");
// }

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export const signCustomerAccessToken = (payload: CustomerJWTPayload) =>
  jwt.sign(payload, CUSTOMER_JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

export const signCustomerRefreshToken = (payload: CustomerJWTPayload) =>
  jwt.sign(payload, CUSTOMER_JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });

export const verifyCustomerToken = (token: string) =>
  jwt.verify(token, CUSTOMER_JWT_SECRET) as CustomerJWTPayload;

export const hashToken = async (token: string) => bcrypt.hash(token, 10);

export const verifyTokenHash = async (token: string, hash: string) =>
  bcrypt.compare(token, hash);
