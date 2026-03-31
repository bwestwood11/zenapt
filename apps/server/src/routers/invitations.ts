import { InvitationEmail } from "transactional/emails";
import { publicProcedure, router, withPermissions } from "../lib/trpc";
import { organizationEmailService } from "../lib/email/organization-email";
import { after } from "next/server";
import prisma from "../../prisma";
import { maskEmail, toSeconds } from "../lib/helpers/utils";
import { ACTIVITY_LOG_ACTIONS, addActivityLog } from "../lib/activitylogs";
import { decrypt, encrypt } from "../lib/helpers/encyrption";
import { TRPCError } from "@trpc/server";
import z from "zod";
import crypto from "node:crypto";
import { EmployeeRole, OrgRole } from "../../prisma/generated/enums";
import { auth } from "../lib/auth";
import {
  createInvitationToken,
  INVITATION_TYPE,
  verifyInvitationToken,
} from "../lib/invitationToken";
import { render } from '@react-email/render';

const INVITATION_EXPIRE_IN_HOURS = 48;

type Invitation_Token = {
  email: string;
  role: string;
  organizationId: string;
  invitationId: string;
};

const getAppropriateInvitation = async (id: string, type: INVITATION_TYPE) => {
  if (type === INVITATION_TYPE.MANAGEMENT) {
    return await prisma.organizationInvitation.findFirst({
      where: {
        id: id,
        status: "PENDING",
      },
    });
  } else if (type === INVITATION_TYPE.LOCATION) {
    return await prisma.locationInvitation.findFirst({
      where: {
        id: id,
        status: "PENDING",
      },
    });
  }
};

export const invitationRouter = router({
  acceptInvitation: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { token } = input;
      // Check token exist
      // Verify the token and get payload
      // Check if payload is correct
      // Check if the user with same email exist
      // yes: check if the location is same if
      // yes: then throw error
      // no: we will accept invite, create new location Employee or management member based on payload
      // if user not has session in browser or they are logged in with another account give them error
      // no: then sign the user up and accept invite (creating location employee or member will be handled by auth middleware)
      // if they are logged in throw error

      if (!token) {
        throw new TRPCError({
          message: "You don't have token",
          code: "FORBIDDEN",
        });
      }

      const { data } = verifyInvitationToken<{
        invitationId: string;
        organizationName: string;
      }>(token);

      const invitationId = data?.invitationId;

      if (!invitationId || !data || !data.email) {
        console.error("Got token without invitation id or no data", data);
        throw new TRPCError({
          message: "Oppsy Something went wrong",
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
        select: {
          email: true,
          id: true,
          locationEmployees: {
            select: {
              locationId: true,
            },
          },
        },
      });

      // User Exist and has same location as the invitation
      if (
        !!existingUser &&
        data.type === INVITATION_TYPE.LOCATION &&
        existingUser.locationEmployees.some(
          (le) => le.locationId === data.locationId
        )
      ) {
        throw new TRPCError({
          message:
            "There is already an account with this email associated to this specific location.",
          code: "BAD_REQUEST",
        });
      }

      if(!!existingUser && data.type === INVITATION_TYPE.MANAGEMENT){
         throw new TRPCError({
          message:
            "There is already an account with this email.",
          code: "BAD_REQUEST",
        });
      }

      const invitation = await getAppropriateInvitation(
        invitationId,
        data.type
      );
      if (!invitation || !invitation.encryptedPassword) {
        throw new TRPCError({
          message:
            "The invitation is not present. try asking new invitation from admin",
          code: "BAD_REQUEST",
        });
      }
      
      let createdAccount = false

      if (!existingUser) {
        if (!!ctx.session) {
          throw new TRPCError({
            message:
              "You are logged in with another account, try logging out first",
            code: "FORBIDDEN",
          });
        }

        const password = decrypt(invitation.encryptedPassword);

        await auth.api.signUpEmail({
          body: {
            name: invitation.name,
            email: invitation.email,
            password: password,
            token: token,
            isTempPassword: true,
          },
        });

        createdAccount = true    
      } else {
        if (!ctx.session || ctx.session.user.email !== invitation.email) {
          throw new TRPCError({
            message:
              "The Account Does not belongs to you. You cannot accept it. Try logging with same email.",
            code: "FORBIDDEN",
          });
        }

        if (data.type === INVITATION_TYPE.MANAGEMENT) {
          await prisma.managementMembership.create({
            data: {
              userId: existingUser.id,
              role: data.role,
              organizationId: data.organizationId,
            },
          });
        } else {
          await prisma.locationEmployee.create({
            data: {
              userId: existingUser.id,
              role: data.role,
              locationId: data.locationId,
            },
          });
        }
      }

      if (data.type === INVITATION_TYPE.MANAGEMENT) {
        await prisma.organizationInvitation.update({
          where: {
            id: invitation.id,
          },
          data: {
            status: "ACCEPTED",
          },
        });
      } else {
        await prisma.locationInvitation.update({
          where: {
            id: invitation.id,
          },
          data: {
            status: "ACCEPTED",
          },
        });
      }

      return {success: true, createdAccount}
    }),
  declineInvitation: publicProcedure
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

        const { data } = verifyInvitationToken<{
          invitationId: string;
          organizationName: string;
        }>(token);

        const invitationId = data?.invitationId;

        if (!invitationId || !data) {
          console.error("Got token without invitation id or no data", data);
          throw new TRPCError({
            message: "Oppsy Something went wrong",
            code: "INTERNAL_SERVER_ERROR",
          });
        }
        if (data.type === INVITATION_TYPE.MANAGEMENT) {
          await prisma.organizationInvitation.update({
            where: {
              id: invitationId,
            },
            data: {
              status: "DECLINED",
            },
          });
        } else if (data.type === INVITATION_TYPE.LOCATION) {
          await prisma.locationInvitation.update({
            where: {
              id: invitationId,
            },
            data: {
              status: "DECLINED",
            },
          });
        }
      } catch (error) {
        console.error("In the catch", error);
        throw new TRPCError({
          message: "Oppsy Something went wrong",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
  getOrganizationInvitations: withPermissions("READ::MEMBERS")
    .input(
      z.object({
        page: z.number().min(1).optional(),
        limit: z.number().min(1).max(100).optional(),
        sort: z.enum(["asc", "desc"]).optional(),
        email: z.string().optional(),
        status: z.enum(["PENDING", "ACCEPTED", "DECLINED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const sort = (input?.sort as "asc" | "desc") ?? "desc";

      const where: any = {
        organizationId: ctx.orgWithSub.id,
      };

      if (input?.email) {
        where.email = { contains: input.email, mode: "insensitive" };
      }

      if (input?.status) {
        where.status = input.status;
      }

      const [invitations, total] = await Promise.all([
        prisma.organizationInvitation.findMany({
          where,
          orderBy: { createdAt: sort },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.organizationInvitation.count({ where }),
      ]);

      return {
        invitations,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          sort,
        },
      };
    }),
  inviteOrganizationMember: withPermissions(
    "CREATE::MEMBERS",
    z.object({
      email: z.email(),
      name: z.string().min(1).max(100),
      role: z.enum(OrgRole).exclude([OrgRole.OWNER]),
    })
  ).mutation(async ({ ctx, input }) => {
    try {
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
          "User with this email already part of the ZenApt. Try an other email",
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
    const token = createInvitationToken<{
      invitationId: string;
      organizationName: string;
    }>(
      {
        email,
        organizationId: ctx.session.user.organizationId,
        role,
        invitationId: res.id,
        type: INVITATION_TYPE.MANAGEMENT,
        name: ctx.session.user.name,
        organizationName: res.organization.name,
      },
      toSeconds({ hours: INVITATION_EXPIRE_IN_HOURS })
    );

    const EmailHtml = InvitationEmail({
      inviteLink: `${process.env.DASHBOARD_URL || "http://localhost:3000"}/invitation?token=${token}`,
      logoUrl: `${process.env.DASHBOARD_URL || "http://localhost:3000"}/logo`,
      organization: res.organization.name,
      password: randomPassword,
      role: role,
      userEmail: email,
      supportEmail: "support@zenapt.studio",
    });

    // Create and activity log the the user was invited

    const html = await render(EmailHtml)

    await organizationEmailService.send({
      organizationId: ctx.orgWithSub.id,
      to: email,
      subject: "hello world",
      html: html,
    });

    after(async () => {
      if (ctx.session.user.organizationId) {
        await prisma.activityLog.create({
          data: {
            action: ACTIVITY_LOG_ACTIONS.INVITED_EMPLOYEE,
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
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      await prisma.organizationInvitation.deleteMany({
        where: {
          email: input.email,
          organizationId: ctx.session.user.organizationId,
          status: "PENDING",
        },
      });

      console.error("Error in inviteOrganizationMember mutation", error);
      throw new TRPCError({
        message: "Failed to send invitation email. Please try again later.",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
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

        const { data, exp } = verifyInvitationToken<{
          invitationId: string;
          organizationName: string;
        }>(token);
        return { data, exp };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          message: "Token is not valid",
          code: "FORBIDDEN",
        });
      }
    }),

  inviteLocationEmployee: withPermissions(
    "CREATE::EMPLOYEES",
    z.object({
      email: z.email(),
      name: z.string().min(1).max(100),
      role: z
        .enum(EmployeeRole)
        .exclude([EmployeeRole.ORGANIZATION_MANAGEMENT]),
      locationId: z.string(),
    })
  ).mutation(async ({ ctx, input }) => {
    const { email, name, role, locationId } = input;

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

    // would fail if user needs to be invited to work at 2 locations
    const usersCount = await prisma.user.count({
      where: {
        email,
        locationEmployees: {
          some: {
            locationId: locationId,
          },
        },
      },
    });
    if (usersCount >= 1) {
      throw new TRPCError({
        message:
          "User with this email already part of this location. Try any other email",
        code: "BAD_REQUEST",
      });
    }

    const existingInvitations = await prisma.locationInvitation.findFirst({
      where: {
        email,
        locationId: input.locationId,
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
    const res = await prisma.locationInvitation.upsert({
      where: {
        email_status_locationId: {
          email,
          status: "PENDING",
          locationId: input.locationId,
        },
        locationId: input.locationId,
      },
      create: {
        email: email,
        name: name,
        role: role,
        encryptedPassword,
        expAt,
        locationId: input.locationId,
      },
      update: {
        expAt,
        role,
        encryptedPassword,
      },
      select: {
        id: true,
        location: { select: { name: true } },
      },
    });

    // send email with token, email, and also a one time password and username
    console.log({ email, role, randomPassword });

    // 48 hours from now
    const token = createInvitationToken<{
      invitationId: string;
      organizationName: string;
    }>(
      {
        email,
        locationId: input.locationId,
        role,
        invitationId: res.id,
        type: INVITATION_TYPE.LOCATION,
        name: ctx.session.user.name,
        organizationName: res.location.name,
      },
      toSeconds({ hours: INVITATION_EXPIRE_IN_HOURS })
    );


    console.log(`${process.env.DASHBOARD_URL || "http://localhost:3000"}/invitation?token=${token}`)

    const EmailHtml = InvitationEmail({
      inviteLink: `${process.env.DASHBOARD_URL || "http://localhost:3000"}/invitation?token=${token}`,
      logoUrl: `${process.env.DASHBOARD_URL || "http://localhost:3000"}/logo`,
      organization: res.location.name,
      password: randomPassword,
      role: role,
      userEmail: email,
      supportEmail: "support@zenapt.studio",
    });

    // Create and activity log the the user was invited

    const html = await render(EmailHtml)
    await organizationEmailService.send({
      organizationId: ctx.orgWithSub.id,
      to: email,
      subject: "hello world",
      html: html,
    });

    addActivityLog({
      type: ACTIVITY_LOG_ACTIONS.INVITED_EMPLOYEE,
      description: `${name} ${maskEmail(
        email
      )} was invited to your location as an ${role}`,
      userId: ctx.session.user.id,
      organizationId: ctx.session.user.organizationId,
      locationId: input.locationId,
    });

    return "OK";
  }),
});
