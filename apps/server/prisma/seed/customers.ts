import prisma from "..";
import { Prisma } from "../generated/client";
import crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config();

export async function createCustomers() {
  const now = new Date();
  const users = new Array(100).fill(undefined).map((_, index) => ({
    id: crypto.randomUUID(),
    name: `Customer ${index + 1}`,
    email: `customer${index + 1}@example.com`,
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
  })) satisfies Prisma.UserCreateManyInput[];

  const customers = users.map((user) => ({
    userId: user.id,
    phoneNumber: `555-010${Math.floor(Math.random() * 90 + 10)}`,
    stripeCustomerId: `cus_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`,
  })) satisfies Prisma.CustomerCreateManyInput[];

  await prisma.user.createMany({ data: users });
  await prisma.customer.createMany({ data: customers });
}
