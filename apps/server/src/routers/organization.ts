import { protectedProcedure, router, withPermissions } from "../lib/trpc";
import prisma from "../../prisma";
import z from "zod";
import { OrgRole } from "../../prisma/generated/enums";
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

const CompanySizeSchema = z
  .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
  .optional();

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
      })
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
      })
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


        revalidateTag(ctx.orgWithSub.id)
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
      })
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
          "This should not happened there is a flow in code while uploading file"
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
        },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      const companySize = CompanySizeSchema.safeParse(
        organization.companySize
      ).data;

      return { ...organization, companySize };
    }
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
    }
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

      // TODO: Remove all assets to the user

      await prisma.user.delete({
        where: {
          id: userId,
        },
      });

      revalidateTag(ctx.orgWithSub.id);
      return { success: true };
    }),
});
