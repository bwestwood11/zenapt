import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "..";
import { createCustomers } from "./customers";

const ADMIN_SEED_PASSWORD = process.env.ADMIN_SEED_PASSWORD;


if (!ADMIN_SEED_PASSWORD) {
  throw new Error("ADMIN_SEED_PASSWORD must be set in .env before running the seed.");
}

const admins = [
  {
    email: "diwanshu@zenapt.studio",
    name: "Diwanshu",
  },
  {
    email: "brett@zenapt.studio",
    name: "Brett",
  },
] as const;

const createAdmins = async () => {
  const adminCounts = await prisma.admin.count();
  if (adminCounts > 0) {
    console.log("Admins already exist, skipping seeding.");
    return;
  }
  
  const hashedPassword = await bcrypt.hash(ADMIN_SEED_PASSWORD, 10);

  await Promise.all(
    admins.map((admin) =>
      prisma.admin.upsert({
        where: { email: admin.email },
        update: {
          name: admin.name,
          password: hashedPassword,
        },
        create: {
          email: admin.email,
          name: admin.name,
          password: hashedPassword,
        },
      })
    )
  );
};

const main = async () => {
  await createAdmins();
  // await createCustomers()
};

main()
  .catch((error) => {
    console.error("Failed to seed admins:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });