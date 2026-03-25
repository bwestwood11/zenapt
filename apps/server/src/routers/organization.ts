import { protectedProcedure, router, withPermissions } from "../lib/trpc";
import prisma from "../../prisma";
import z from "zod";
import { TRPCError } from "@trpc/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3client } from "../lib/s3/index";
import {
  checkFile,
  extractS3Key,
  keyToFileUrl,
  mimeTypeToExtension,
} from "../lib/s3/utils";
import { deleteFile } from "../lib/s3/commands";
import { revalidateTag } from "next/cache";
import { stripe } from "../lib/stripe/server-stripe";
import { ACTIVITY_LOG_ACTIONS, addActivityLog } from "../lib/activitylogs";
import { OrgRole } from "../../prisma/generated/enums";
import {
  organizationEmailService,
  type ContactListFilter,
} from "../lib/email/organization-email";

const promoCodeInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, "Use only uppercase letters, numbers, _ or -"),
  description: z.string().trim().max(200).optional(),
  discount: z.number().int().min(1).max(100),
  maxUsage: z.number().int().min(1).max(100000).optional(),
});

const CompanySizeSchema = z
  .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
  .optional();

const organizationDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .regex(/^([a-z\d-]+\.)+[a-z]{2,}$/i, "Enter a valid domain."),
});

const organizationSenderEmailSchema = z.object({
  email: z.email(),
  displayName: z.string().trim().max(120).optional(),
});

const organizationEmailIdentityIdSchema = z.object({
  id: z.string().min(1),
});

const organizationSendTestEmailSchema = z.object({
  id: z.string().min(1),
});

const organizationContactListSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  description: z.string().trim().max(500).optional(),
  filterMode: z.enum(["ALL", "ANY"]).default("ALL"),
  filters: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("SERVICE_USED"),
          serviceId: z.string().min(1, "Select a service."),
        }),
        z.object({
          type: z.literal("NO_APPOINTMENT_IN_DAYS"),
          days: z.number().int().min(1).max(3650),
        }),
        z.object({
          type: z.literal("APPOINTMENT_STATUS"),
          status: z.enum([
            "SCHEDULED",
            "COMPLETED",
            "CANCELED",
            "NO_SHOW",
            "RESCHEDULED",
          ]),
        }),
      ]),
    )
    .min(1, "Add at least one filter."),
});

const assertOrganizationEmailManager = async (
  userId: string,
  organizationId: string,
) => {
  const membership = await prisma.managementMembership.findFirst({
    where: {
      userId,
      organizationId,
      role: {
        in: [OrgRole.OWNER, OrgRole.ADMIN],
      },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only organization owners and admins can manage sender identities.",
    });
  }
};

export const organizationRouter = router({
  createOrganization: protectedProcedure
    .input(
      z.object({
        businessName: z.string().trim(),
        businessDescription: z.string().trim().optional(),
        companySize: CompanySizeSchema,
        logo: z
          .string()
          .url()
          .optional()
          .refine((url) => !url || url.startsWith("https://"), {
            message: "Logo URL must use https://",
          }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { businessName, businessDescription, companySize, logo } = input;
        const slug = `${businessName
          .toLowerCase()
          .replace(/\s+/g, "-")}-${Math.floor(1000 + Math.random() * 9000)}`;

        const user = await prisma.user.findFirst({
          where: {
            id: ctx.session.user.id,
          },
          include: {
            _count: {
              select: {
                locationEmployees: true,
              },
            },
            management: true,
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "There is no user",
          });
        }

        if (user._count.locationEmployees > 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User is already associated with an organization.",
          });
        }

        const ownerManagement = user.management.find((u) => u.role === "OWNER");

        if (!ownerManagement?.role) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have any organization.",
          });
        }

        const organization = await prisma.organization.create({
          data: {
            name: businessName,
            description: businessDescription,
            companySize,
            logo,
            slug,
            management: {
              connect: {
                id: ownerManagement.id,
              },
            },
          },
        });

        addActivityLog({
          type: ACTIVITY_LOG_ACTIONS.CREATED_ORGANIZATION,
          description: `Organization ${organization.name} was created.`,
          userId: ctx.session.user.id,
          organizationId: organization.id,
        });

        return organization;
      } catch (error) {
        // Cleanup
        if (input.logo) {
          try {
            const key = extractS3Key(input.logo);
            if (key) await deleteFile(key);
          } catch (cleanupError) {
            console.error("Failed to cleanup uploaded logo:", cleanupError);
          }
        }

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          message: "Something went wrong",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),

  updateOrganizationGeneralInfo: withPermissions("UPDATE::ORGANIZATION")
    .input(
      z.object({
        businessName: z.string().trim(),
        businessDescription: z.string().trim().optional(),
        companySize: CompanySizeSchema,
        logo: z.url().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { businessName, businessDescription, companySize, logo } = input;
        console.log("Update org info:", input);
        const organization = await prisma.organization.update({
          where: {
            id: ctx.orgWithSub.id,
          },
          data: {
            name: businessName,
            description: businessDescription,
            companySize,
            logo,
          },
        });

        addActivityLog({
          type: ACTIVITY_LOG_ACTIONS.UPDATED_ORGANIZATION,
          description: `Organization profile was updated to ${businessName}.`,
          userId: ctx.session.user.id,
          organizationId: ctx.orgWithSub.id,
        });

        revalidateTag(ctx.orgWithSub.id);
        return organization;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          message: "Something went wrong",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
  initLogoUpload: protectedProcedure
    .input(
      z.object({
        mimeType: z.string().min(1),
        filesize: z.number().min(1),
        checksum: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { mimeType, filesize, checksum } = input;

      const res = checkFile("logos", {
        clientFileSize: filesize,
        clientFileType: mimeType,
      });
      if (!res.valid) {
        throw new TRPCError({
          message: res.reason,
          code: "INTERNAL_SERVER_ERROR",
          cause: res.code,
        });
      }

      const extension = mimeTypeToExtension(mimeType);
      if (!extension) {
        console.error(
          "This should not happened there is a flow in code while uploading file",
        );
        throw new TRPCError({
          message: "Something Went Wrong",
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      // Generate safe key on server
      const key = `user/${ctx.session.user.id}/org_logo.${extension}`;
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        ContentType: mimeType,
        ContentLength: filesize,
        ChecksumSHA256: checksum,
      });

      const signedUrl = await getSignedUrl(S3client, command, {
        expiresIn: 600, // 10 minutes
      });
      console.log(signedUrl);

      const url = keyToFileUrl(key);

      return {
        signedUrl,
        url,
      };
    }),
  getOrganizationDetails: withPermissions("READ::ORGANIZATION").query(
    async ({ ctx }) => {
      const organization = await prisma.organization.findUnique({
        where: {
          id: ctx.orgWithSub.id,
        },
        select: {
          id: true,
          name: true,
          description: true,
          companySize: true,
          logo: true,
          stripeAccountId: true,
          updatedAt: true,
          createdAt: true,
        },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      const companySize = CompanySizeSchema.safeParse(
        organization.companySize,
      ).data;

      return { ...organization, companySize };
    },
  ),
  getOrganizationEmailSettings: withPermissions("UPDATE::ORGANIZATION").query(
    async ({ ctx }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.getSettings(ctx.orgWithSub.id);
    },
  ),
  createOrganizationEmailDomain: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationDomainSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.createDomain({
        organizationId: ctx.orgWithSub.id,
        domain: input.domain,
      });
    }),
  refreshOrganizationEmailDomain: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationEmailIdentityIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.refreshDomain({
        organizationId: ctx.orgWithSub.id,
        domainId: input.id,
      });
    }),
  deleteOrganizationEmailDomain: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationEmailIdentityIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.deleteDomain({
        organizationId: ctx.orgWithSub.id,
        domainId: input.id,
      });
    }),
  createOrganizationSenderEmail: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationSenderEmailSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
        return organizationEmailService.createSenderEmail({
          organizationId: ctx.orgWithSub.id,
          email: input.email,
          displayName: input.displayName,
        });
      } catch (error) {
        console.error("Failed to create sender email identity:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create sender email identity",
          cause: error,
        });
      }

    }),
  refreshOrganizationSenderEmail: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationEmailIdentityIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.refreshSenderEmail({
        organizationId: ctx.orgWithSub.id,
        senderEmailId: input.id,
      });
    }),
  deleteOrganizationSenderEmail: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationEmailIdentityIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.deleteSenderEmail({
        organizationId: ctx.orgWithSub.id,
        senderEmailId: input.id,
      });
    }),
  setOrganizationDefaultSenderEmail: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationEmailIdentityIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.setDefaultSenderEmail({
        organizationId: ctx.orgWithSub.id,
        senderEmailId: input.id,
      });
    }),
  sendOrganizationTestEmail: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationSendTestEmailSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);

      if (!ctx.session.user.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Your account does not have an email address for receiving test emails.",
        });
      }

      return organizationEmailService.sendTestEmail({
        organizationId: ctx.orgWithSub.id,
        senderEmailId: input.id,
        to: ctx.session.user.email,
        organizationName: ctx.orgWithSub.name,
        requestedByName: ctx.session.user.name,
      });
    }),
  createOrganizationContactList: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationContactListSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.createContactList({
        organizationId: ctx.orgWithSub.id,
        name: input.name,
        description: input.description,
        filterMode: input.filterMode,
        filters: input.filters as ContactListFilter[],
      });
    }),
  deleteOrganizationContactList: withPermissions("UPDATE::ORGANIZATION")
    .input(organizationEmailIdentityIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOrganizationEmailManager(ctx.session.user.id, ctx.orgWithSub.id);
      return organizationEmailService.deleteContactList({
        organizationId: ctx.orgWithSub.id,
        contactListId: input.id,
      });
    }),
  createStripeConnectAccount: withPermissions("UPDATE::SUBSCRIPTION").mutation(
    async ({ ctx }) => {
      const dashboardUrl = process.env.DASHBOARD_URL;
      if (!dashboardUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Missing DASHBOARD_URL configuration",
        });
      }

      const organization = await prisma.organization.findUnique({
        where: {
          id: ctx.orgWithSub.id,
        },
        select: {
          id: true,
          name: true,
          stripeAccountId: true,
        },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      let stripeAccountId = organization.stripeAccountId;
      if (!stripeAccountId) {
        const account = await stripe.accounts.create({
          type: "express",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          email: ctx.session.user.email,
          business_profile: {
            name: organization.name,
          },
          metadata: {
            organizationId: organization.id,
          },
        });

        stripeAccountId = account.id;
        await prisma.organization.update({
          where: { id: organization.id },
          data: { stripeAccountId },
        });
      }

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${dashboardUrl}/settings?tab=billing`,
        return_url: `${dashboardUrl}/settings?tab=billing`,
        type: "account_onboarding",
      });

      return {
        accountId: stripeAccountId,
        url: accountLink.url,
      };
    },
  ),
  getOrganizationUsers: withPermissions("READ::MEMBERS").query(
    async ({ ctx }) => {
      const users = await prisma.managementMembership.findMany({
        where: {
          organizationId: ctx.orgWithSub.id,
        },
        select: {
          role: true,
          id: true,
          user: {
            select: {
              name: true,
              email: true,
              id: true,
              image: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return users;
    },
  ),

  removeOrganizationMember: withPermissions("DELETE::MEMBERS")
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input: { userId }, ctx }) => {
      const userToRemove = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          management: true,
        },
      });

      if (!userToRemove?.management) {
        throw new TRPCError({
          message: "The user is not a part of organization",
          code: "BAD_REQUEST",
        });
      }

      if (userToRemove.management.some((m) => m.role === "OWNER")) {
        throw new TRPCError({
          message: "Owner cannot be removed from organization",
          code: "BAD_REQUEST",
        });
      }

      if (
        ctx.session.user.management?.role !== "OWNER" &&
        userToRemove.management.some((m) => m.role === "ADMIN")
      ) {
        throw new TRPCError({
          message:
            "You dont have privlage to remove another admin. Please ask Owner to remove admin",
          code: "BAD_REQUEST",
        });
      }

      await prisma.user.delete({
        where: {
          id: userId,
        },
      });

      addActivityLog({
        type: ACTIVITY_LOG_ACTIONS.REMOVED_ORGANIZATION_MEMBER,
        description: `Organization member ${userToRemove.email} was removed.`,
        userId: ctx.session.user.id,
        organizationId: ctx.orgWithSub.id,
      });

      revalidateTag(ctx.orgWithSub.id);
      return { success: true };
    }),

  listOrganizationPromoCodes: withPermissions("READ::ORGANIZATION").query(
    async ({ ctx }) => {
      return prisma.promoCode.findMany({
        where: {
          organizationId: ctx.orgWithSub.id,
          appliesToLevel: "ORGANIZATION",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          code: true,
          description: true,
          discount: true,
          maxUsage: true,
          isActive: true,
          createdAt: true,
        },
      });
    },
  ),

  createOrganizationPromoCode: withPermissions("UPDATE::ORGANIZATION")
    .input(promoCodeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const normalizedCode = input.code.toUpperCase();

      try {
        return await prisma.promoCode.create({
          data: {
            code: normalizedCode,
            description: input.description,
            discount: input.discount,
            maxUsage: input.maxUsage,
            organizationId: ctx.orgWithSub.id,
            appliesToLevel: "ORGANIZATION",
          },
          select: {
            id: true,
            code: true,
            description: true,
            discount: true,
            maxUsage: true,
            isActive: true,
          },
        });
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          (error as { code?: string }).code === "P2002"
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Promo code already exists",
          });
        }

        throw error;
      }
    }),

  updateOrganizationPromoCode: withPermissions("UPDATE::ORGANIZATION")
    .input(
      z.object({
        promoCodeId: z.string(),
        isActive: z.boolean().optional(),
        description: z.string().trim().max(200).optional(),
        discount: z.number().int().min(1).max(100).optional(),
        maxUsage: z.number().int().min(1).max(100000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.promoCode.findFirst({
        where: {
          id: input.promoCodeId,
          organizationId: ctx.orgWithSub.id,
          appliesToLevel: "ORGANIZATION",
        },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Promo code not found",
        });
      }

      return prisma.promoCode.update({
        where: { id: input.promoCodeId },
        data: {
          ...(typeof input.isActive === "boolean" && {
            isActive: input.isActive,
          }),
          ...(typeof input.description === "string" && {
            description: input.description,
          }),
          ...(typeof input.discount === "number" && {
            discount: input.discount,
          }),
          ...(input.maxUsage !== undefined && {
            maxUsage: input.maxUsage,
          }),
        },
        select: {
          id: true,
          code: true,
          description: true,
          discount: true,
          maxUsage: true,
          isActive: true,
        },
      });
    }),

  deleteOrganizationPromoCode: withPermissions("UPDATE::ORGANIZATION")
    .input(
      z.object({
        promoCodeId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.promoCode.findFirst({
        where: {
          id: input.promoCodeId,
          organizationId: ctx.orgWithSub.id,
          appliesToLevel: "ORGANIZATION",
        },
        select: { id: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Promo code not found",
        });
      }

      await prisma.promoCode.delete({
        where: { id: input.promoCodeId },
      });

      return { success: true };
    }),
});
