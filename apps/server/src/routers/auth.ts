import z from "zod";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { auth } from "../lib/auth";
import prisma from "../../prisma";
import { TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { keyToFileUrl, mimeTypeToExtension } from "../lib/s3/utils";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3client } from "../lib/s3";

import { APIError } from "better-auth/api";
const AVATARS = [
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_1.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_2.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_3.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_4.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_5.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_6.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_7.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_8.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_9.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_10.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_11.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_12.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_13.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_14.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_15.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_16.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_17.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_18.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_19.png",
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png/vibrent_20.png",
] as const;

export const authRouter = router({
  signUp: publicProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string(),
        password: z.string(),
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await auth.api.signUpEmail({
        body: {
          email: input.email,
          password: input.password,
          name: input.name,
          token: input.token,
          image: AVATARS[Math.floor(Math.random() * AVATARS.length)],
        },
      });
      return "OK";
    }),
  changePassword: protectedProcedure
    .input(
      z.object({
        temporaryPassword: z.string(),
        newPassword: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isTempPassword) {
        throw new TRPCError({
          message: "Try using reset password route to change password.",
          code: "BAD_REQUEST",
        });
      }

      try {
        await auth.api.changePassword({
          body: {
            currentPassword: input.temporaryPassword,
            newPassword: input.newPassword,
            revokeOtherSessions: true,
          },

          headers: await headers(),
        });

        await prisma.user.update({
          data: {
            isTempPassword: false,
          },
          where: {
            id: ctx.session.user.id,
          },
        });

        return "OK";
      } catch (error) {
        console.error(error);
        if (error instanceof APIError && error.status === "BAD_REQUEST") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "The password is Invalid. Make sure you put the password you got from the email",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Something went wrong try it after some time.",
        });
      }
    }),
  updateProfileImage: protectedProcedure
    .input(
      z.object({
        url: z.url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await auth.api.updateUser({
          body: {
            image: input.url,
          },
          headers: await headers(),
        });
      } catch (error) {
        console.error(error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Something Went wrong",
        });
      }
    }),

  updateProfile: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await auth.api.updateUser({
          body: {
            name: input.name,
          },
          headers: await headers(),
        });
      } catch (error) {
        console.error(error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Something Went wrong",
        });
      }
    }),

  getSignedUrlForProfileUpdate: protectedProcedure
    .input(
      z.object({
        mimeType: z.string(),
        filesize: z.number().min(1),
        checksum: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { mimeType, filesize, checksum } = input;
      const extension = mimeTypeToExtension(mimeType);
      const key = `user/${ctx.session.user.id}/user_avatar.${extension}`;
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

      const url = keyToFileUrl(key);

      return { url, signedUrl };
    }),
});
