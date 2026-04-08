import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const prismaDir = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(prismaDir, "..");

loadEnv({ path: path.join(serverRoot, ".env.local"), override: false, quiet: true });
loadEnv({ path: path.join(serverRoot, ".env"), override: false, quiet: true });

declare global {
    var prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error(
            "DATABASE_URL is not set. Ensure it is configured in Vercel Project Settings (Environment Variables) or apps/server/.env before Prisma is used.",
        );
    }

    if (process.env.NODE_ENV === "production") {
        return new PrismaClient();
    }

    globalThis.prisma ??= new PrismaClient();
    return globalThis.prisma;
};

const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
        const client = createPrismaClient();
        const value = Reflect.get(client, prop, receiver);

        if (typeof value === "function") {
            return value.bind(client);
        }

        return value;
    },
});

export default prisma;
