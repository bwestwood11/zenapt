import { InvitationEmail } from "transactional/emails";
import { publicProcedure, router, withPermissions } from "../lib/trpc";
import { resend } from "../lib/resend";
import { after } from "next/server";
import prisma from "../../prisma";
import { maskEmail, toSeconds } from "../lib/helpers/utils";
import { ACTIVITY_LOG_ACTIONS } from "../lib/activitylogs";
import { decrypt, encrypt } from "../lib/helpers/encyrption";
import { TRPCError } from "@trpc/server";
import { createSignedToken, verifySignedToken } from "../lib/helpers/hash";
import z from "zod";
import crypto from "crypto";
import { OrgRole } from "../../prisma/generated/enums";
import { auth } from "../lib/auth";
import {
  createInvitationToken,
  INVITATION_TYPE,
  verifyInvitationToken,
} from "../lib/invitationToken";

const INVITATION_EXPIRE_IN_HOURS = 48;

type Invitation_Token = {
  email: string;
  role: string;
  organizationId: string;
  invitationId: string;
};

export const invitationRouter = router({
  acceptOrganizationInvitation: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { token } = input;

      if (!!ctx.session) {
        throw new TRPCError({
          message:
            "You are logged in with another account, try logging out first",
          code: "FORBIDDEN",
        });
      }

      if (!token) {
        throw new TRPCError({
          message: "You don't have token",
          code: "FORBIDDEN",
        });
      }

      const { data } = verifyInvitationToken<{ invitationId: string }>(token);

      const invitationId = data?.invitationId;

      if (!invitationId || !data || !data.email) {
        console.error("Got token without invitation id or no data", data);
        throw new TRPCError({
          message: "Oppsy Something went wrong",
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      if (data.type !== "MANAGEMENT") {
        throw new TRPCError({
          message: "You can't access this endpoint",
          code: "FORBIDDEN",
        });
      }

      const userExist = await prisma.user.count({
        where: { email: data.email },
      });

      if (userExist > 0) {
        throw new TRPCError({
          message: "There is already an account with this email.",
          code: "BAD_REQUEST",
        });
      }

      console.log(data)
      const invitation = await prisma.organizationInvitation.findFirst({
        where: {
          id: data.invitationId,
          status: "PENDING",
        },
      });
      console.log({ invitation });
      if (!invitation || !invitation.encryptedPassword) {
        throw new TRPCError({
          message:
            "The invitation is not present. try asking new invitation from admin",
          code: "BAD_REQUEST",
        });
      }

      const password = decrypt(invitation.encryptedPassword);

      await auth.api.signUpEmail({
        body: {
          name: invitation.name,
          email: invitation.email,
          password: password,
          token: token,
          isTempPassword: true
        },
      });

      await prisma.organizationInvitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          status: "ACCEPTED",
        },
      });
    }),
  declineOrganizationInvitation: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { token } = input;

        if (!token) {
          throw new TRPCError({
            message: "You don't have token",
            code: "FORBIDDEN",
          });
        }

        const { data } = verifyInvitationToken<{ invitationId: string }>(token);

        const invitationId = data?.invitationId;

        if (!invitationId || !data) {
          console.error("Got token without invitation id or no data", data);
          throw new TRPCError({
            message: "Oppsy Something went wrong",
            code: "INTERNAL_SERVER_ERROR",
          });
        }

        await prisma.organizationInvitation.update({
          where: {
            id: invitationId,
          },
          data: {
            status: "DECLINED",
          },
        });
      } catch (error) {
        console.error("In the catch", error);
        throw new TRPCError({
          message: "Oppsy Something went wrong",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
  inviteOrganizationMember: withPermissions(
    "CREATE::EMPLOYEES",
    z.object({
      email: z.email(),
      name: z.string().min(1).max(100),
      role: z.enum(OrgRole).exclude([OrgRole.OWNER]),
    })
  ).mutation(async ({ ctx, input }) => {
    const { email, name, role } = input;

    if (!ctx.session.user.organizationId) {
      console.error(
        "THIS SHOULD NOT HAPPEN, User accessed route inviteOrganizationMember without the organization Id",
        ctx.session.user
      );

      throw new TRPCError({
        message: "Oops Something Don't feel right?",
        cause: "User don't have organization",
        code: "FORBIDDEN",
      });
    }

    const usersCount = await prisma.user.count({ where: { email } });
    if (usersCount >= 1) {
      throw new TRPCError({
        message:
          "User with this email already part of the zenapt. try any other email",

        code: "BAD_REQUEST",
      });
    }

    const existingInvitations = await prisma.organizationInvitation.findFirst({
      where: {
        email,
      },
    });

    if (existingInvitations?.status === "ACCEPTED") {
      throw new TRPCError({
        message:
          "User has accepted the invitation. If you need any help you can contact",
        code: "BAD_REQUEST",
      });
    }

    if (
      existingInvitations?.status === "PENDING" &&
      existingInvitations.expAt > new Date()
    ) {
      throw new TRPCError({
        message:
          "User has a pending invitation. Please wait until they accept or deny the invitation.",
        code: "BAD_REQUEST",
      });
    }

    const randomPassword = crypto.randomBytes(14).toString("hex").slice(0, 14);

    const encryptedPassword = encrypt(randomPassword);
    const expAt = new Date(
      Date.now() + INVITATION_EXPIRE_IN_HOURS * 60 * 60 * 1000
    );
    const res = await prisma.organizationInvitation.upsert({
      where: {
        email_status: {
          email,
          status: "PENDING",
        },
      },
      create: {
        email: email,
        name: name,
        role: role,
        encryptedPassword,
        expAt,
        organizationId: ctx.session.user.organizationId,
      },
      update: {
        expAt,
        role,
        encryptedPassword,
      },
      select: {
        id: true,
        organization: { select: { name: true } },
      },
    });
   
    // send email with token, email, and also a one time password and username
    console.log({ email, role, randomPassword });

    // 48 hours from now
    const token = createInvitationToken<{ invitationId: string }>(
      {
        email,
        organizationId: ctx.session.user.organizationId,
        role,
        invitationId: res.id,
        type: INVITATION_TYPE.MANAGEMENT,
        name: ctx.session.user.name,
      },
      toSeconds({ hours: INVITATION_EXPIRE_IN_HOURS })
    );

    const EmailHtml = InvitationEmail({
      inviteLink: `${process.env.DASHBOARD_URL || "http://localhost:3000"}/invitation?token=${token}&email=${email}&org=${res.organization.name}`,
      logoUrl: `${process.env.DASHBOARD_URL || "http://localhost:3000"}/logo`,
      organization: res.organization.name,
      password: randomPassword,
      role: role,
      userEmail: email,
      supportEmail: "support@zenapt.com",
    });

    // Create and activity log the the user was invited

    await resend.emails.send({
      from: process.env.FROM_EMAIL || "support@zenapt.com",
      to:
        process.env.NODE_ENV === "development"
          ? `delivered+${encodeURIComponent(email)}@resend.dev`
          : email,
      subject: "hello world",
      react: EmailHtml,
    });

    after(async () => {
      if (ctx.session.user.organizationId) {
        await prisma.activityLog.create({
          data: {
            action: ACTIVITY_LOG_ACTIONS.INVITE_EMPLOYEE,
            description: `${name} ${maskEmail(
              email
            )} was invited to your organization as an ${role}`,
            userId: ctx.session.user.id,
            organizationId: ctx.session.user.organizationId,
          },
        });
      }
    });

    return "OK";
  }),
  getInvitation: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(({ input }) => {
      try {
        const { token } = input;

        if (!token) {
          throw new TRPCError({
            message: "You don't have token",
            code: "FORBIDDEN",
          });
        }

        const { data, exp } = verifyInvitationToken<{ invitationId: string }>(
          token
        );
        return { data, exp };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          message: "Token is not valid",
          code: "FORBIDDEN",
        });
      }
    }),
});
