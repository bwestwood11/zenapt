import { TRPCError } from "@trpc/server";
import prisma from "../../../prisma";

type ResolvePromoInput = {
  code: string;
  organizationId: string;
  locationId: string;
};

type ResolvePromoOutput = {
  id: string;
  code: string;
  discountPercentage: number;
};

export async function resolveActivePromoCode(
  input: ResolvePromoInput,
): Promise<ResolvePromoOutput> {
  const normalizedCode = input.code.trim().toUpperCase();

  if (!normalizedCode) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Coupon code is required",
    });
  }

  const promoCode = await prisma.promoCode.findFirst({
    where: {
      code: normalizedCode,
      isActive: true,
      organizationId: input.organizationId,
      OR: [
        {
          appliesToLevel: "ORGANIZATION",
        },
        {
          appliesToLevel: "LOCATION",
          locationId: input.locationId,
        },
      ],
    },
    select: {
      id: true,
      code: true,
      discount: true,
      maxUsage: true,
    },
  });

  if (!promoCode) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid or inactive coupon code",
    });
  }

  if (typeof promoCode.maxUsage === "number") {
    const usageCount = await prisma.appointment.count({
      where: {
        promoCodeId: promoCode.id,
      },
    });

    if (usageCount >= promoCode.maxUsage) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This coupon has reached its usage limit",
      });
    }
  }

  return {
    id: promoCode.id,
    code: promoCode.code,
    discountPercentage: Math.min(100, Math.max(0, promoCode.discount)),
  };
}

export function calculateDiscountedTotal(
  totalAmount: number,
  discountPercentage: number,
) {
  const safeTotal = Math.max(0, totalAmount);
  const safeDiscount = Math.min(100, Math.max(0, discountPercentage));
  const discountAmount = Math.round((safeTotal * safeDiscount) / 100);
  const discountedTotal = Math.max(0, safeTotal - discountAmount);

  return {
    discountAmount,
    discountedTotal,
  };
}
