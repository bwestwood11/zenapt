import prisma from "..";
import { Prisma } from "../generated/client";
import crypto from "node:crypto";

export async function createCustomers() {
  const now = new Date();
  const users = Array.from({ length: 100 }, (_, index) => ({
    id: crypto.randomUUID(),
    name: `Customer ${index + 200}`,
    email: `customer${index + 200}@example.com`,
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
  })) satisfies Prisma.UserCreateManyInput[];

  const organization = await prisma.organization.findFirst();

  if (!organization) {
    throw new Error("Cannot seed customers without an organization.");
  }

  await prisma.user.createMany({ data: users, skipDuplicates: true });

  const persistedUsers = await prisma.user.findMany({
    where: {
      email: {
        in: users.map((user) => user.email),
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  const userByEmail = new Map(
    persistedUsers.map((user) => [user.email.toLowerCase(), user.id]),
  );

  await Promise.all(
    users.map(async (user) => {
      const userId = userByEmail.get(user.email.toLowerCase());

      if (!userId) {
        throw new Error(`Seeded user could not be loaded: ${user.email}`);
      }

      await prisma.customer.upsert({
        where: {
          userId_orgId: {
            userId,
            orgId: organization.id,
          },
        },
        update: {
          phoneNumber: buildPhoneNumber(),
        },
        create: {
          userId,
          phoneNumber: buildPhoneNumber(),
          stripeCustomerId: buildStripeCustomerId(),
          orgId: organization.id,
        },
      });
    }),
  );
}

const buildPhoneNumber = () => {
  return `555-010${crypto.randomInt(10, 100)}`;
};

const buildStripeCustomerId = () => {
  return `cus_${crypto.randomUUID().replaceAll("-", "").slice(0, 14)}`;
};
