import prisma from "..";
import { Prisma } from "../generated/client";
import dotenv from "dotenv";

dotenv.config();

export async function createCustomers() {
  const dummyCustomers = new Array(100).fill(undefined).map((_, index) => ({
    firstName: `Customer${Math.floor(Math.random() * 1000)}`,
    lastName: `Test${Math.floor(Math.random() * 1000)}`,
    email: `customer${(Math.floor(Math.random() * 1000) + 1) * index}@example.com`,
    phoneNumber: `555-010${Math.floor(Math.random() * 90 + 10)}`,
    stripeCustomerId: `cus_${Math.random().toString(36).substring(2, 15)}`,
    locationId: "cmhc4md0j0001xrrw7il1cnre",
  })) satisfies Prisma.CustomerCreateManyInput[];

  await prisma.customer.createMany({ data: dummyCustomers });
}
