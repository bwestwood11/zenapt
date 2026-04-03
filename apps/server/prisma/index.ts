import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "./generated/client";

const prismaDir = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(prismaDir, "..");

loadEnv({ path: path.join(serverRoot, ".env.local"), override: false, quiet: true });
loadEnv({ path: path.join(serverRoot, ".env"), override: false, quiet: true });

declare global {
    var prisma: PrismaClient | undefined;
}

if (!process.env.DATABASE_URL) {
    throw new Error(
        "DATABASE_URL is not set. Ensure the server process loads apps/server/.env before initializing Prisma.",
    );
}

const prisma = process.env.NODE_ENV === "production"
    ? new PrismaClient()
    : (() => {
        globalThis.prisma ??= new PrismaClient();
        return globalThis.prisma;
    })();

export default prisma;
