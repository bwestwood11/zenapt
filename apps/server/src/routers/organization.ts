import { protectedProcedure, router } from "../lib/trpc";
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

export const organizationRouter = router({
  createOrganization: protectedProcedure
    .input(
      z.object({
        businessName: z.string().trim(),
        businessDescription: z.string().trim().optional(),
        companySize: z
          .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
          .optional(),
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

        const hasManagement = await prisma.user.count({
          where: {
            id: ctx.session.user.id,

            OR: [
              {
                management: {
                  some: {},
                },
              },
              {
                locationEmployees: {
                  some: {},
                },
              },
            ],
          },
        });

        console.log(hasManagement);

        if (hasManagement > 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User is already associated with an organization.",
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
              create: {
                userId: ctx.session.user.id,
                role: OrgRole.OWNER,
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
      const key = `logos/${ctx.session.user.id}/${Date.now()}.${extension}`;
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
});
