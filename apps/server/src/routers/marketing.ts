import z from "zod";
import { publicProcedure, router, withPermissions } from "../lib/trpc";
import { TRPCError } from "@trpc/server";
import { Cal_API_Version } from "../lib/cal";
import prisma from "../../prisma";
import { organizationEmailService } from "../lib/email/organization-email";
import {
  countContactListRecipients,
  getContactListAudienceRecipients,
  normalizeContactListFilters,
  parseContactListFilters,
  toContactListFilterMode,
} from "../lib/marketing/contact-lists";

const marketingDelegates = prisma as unknown as {
  marketingContactList: {
    findMany: (args: unknown) => Promise<any[]>;
    create: (args: unknown) => Promise<any>;
    findFirst: (args: unknown) => Promise<any>;
    delete: (args: unknown) => Promise<any>;
  };
  marketingCampaign: {
    findMany: (args: unknown) => Promise<any[]>;
    create: (args: unknown) => Promise<any>;
    findFirst: (args: unknown) => Promise<any>;
    update: (args: unknown) => Promise<any>;
  };
  marketingCampaignAudience: {
    createMany: (args: unknown) => Promise<any>;
  };
};

const marketingContactListDelegate = marketingDelegates.marketingContactList;
const marketingCampaignDelegate = marketingDelegates.marketingCampaign;

type CampaignAudienceRecipient = {
  customerId: string;
  email: string;
  name: string | null;
};

const marketingTemplateInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(""),
  designJson: z.string().trim().min(2, "Design JSON is required"),
  html: z.string().optional(),
});

const marketingTemplateIdSchema = z.object({
  id: z.string().min(1, "Template id is required."),
});

const organizationContactListSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(""),
  filterMode: z.enum(["ALL", "ANY"]).default("ALL"),
  filters: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("SERVICE_USED"),
          serviceId: z.string().trim().min(1),
        }),
        z.object({
          type: z.literal("NO_SERVICES_USED"),
        }),
        z.object({
          type: z.literal("NO_APPOINTMENT_IN_DAYS"),
          days: z.number().int().positive().max(3650),
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
    .min(1),
});

const marketingContactListIdSchema = z.object({
  id: z.string().min(1, "Contact list id is required."),
});

const createMarketingCampaignSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(""),
  templateId: z.string().min(1, "Template is required."),
  contactListId: z.string().min(1, "Contact list is required."),
  selectedCustomerIds: z.array(z.string().min(1)).min(1, "Select at least one customer."),
});

const marketingCampaignIdSchema = z.object({
  id: z.string().min(1, "Campaign id is required."),
});

const buildUntitledTemplateName = (count: number) => {
  return count === 0 ? "Untitled template" : `Untitled template ${count + 1}`;
};

const BookDemo = publicProcedure
  .input(
    z.object({
      firstName: z.string().min(2, "First name must be at least 2 characters"),
      lastName: z.string().min(2, "Last name must be at least 2 characters"),
      businessName: z
        .string()
        .min(2, "Business name must be at least 2 characters"),
      email: z.email({ message: "Please enter a valid email address" }),
      cellPhone: z.string().min(10, "Please enter a valid phone number"),
      numberOfLocations: z.string().min(1, "Please select number of locations"),
      zipCode: z.string().min(5, "Please enter a valid zip code"),
      websiteUrl: z.union([
        z.url({ message: "Please enter a valid website URL" }),
        z.literal("").optional(),
      ]),
      demoTime: z
        .date({
          message: "Please select a demo date",
        })
        .min(new Date()),
      timeZone: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const {
      demoTime,
      firstName,
      lastName,
      email,
      timeZone,
      cellPhone,
      numberOfLocations,
      websiteUrl,
      businessName,
      zipCode,
    } = input;
    const response = await fetch(`https://api.cal.com/v2/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CAL_API_KEY}`,
        "cal-api-version": Cal_API_Version,
      },
      body: JSON.stringify({
        start: demoTime,
        eventTypeId: Number.parseInt(process.env.EVENT_TYPE_ID ?? "", 10),
        attendee: {
          name: `${firstName} ${lastName}`,
          email: email,
          timeZone: timeZone,
          phoneNumber: cellPhone,
        },
        metadata: {
          numberOfLocations,
          websiteUrl,
          businessName,
          zipCode,
        },
      }),
    });

    if (!response.ok) {
      console.error("Error While Booking", response);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong while booking",
      });
    }

    await prisma.demoRequest.create({
      data: {
        firstName,
        lastName,
        email,
        cellPhone,
        numberOfLocations,
        websiteUrl: websiteUrl || "",
        businessName,
        zipCode,
        demoTime: demoTime.toISOString(),
      },
    });

    return "OK";
  });

function getDayRangeISO(date: Date) {
  const start = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0
    )
  );
  const end = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59
    )
  );
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

const GetBookingSlots = publicProcedure
  .input(z.object({ date: z.date() }))
  .query(async ({ input: { date } }) => {
    try {
      const { start, end } = getDayRangeISO(date);

      const url = new URL("https://api.cal.com/v2/slots/available");
      url.searchParams.set("startTime", start);
      url.searchParams.set("endTime", end);
      url.searchParams.set("eventTypeId", process.env.EVENT_TYPE_ID ?? "");

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CAL_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new TRPCError({
          message: `Cal.com API error: ${response.statusText}`,
          code: "BAD_GATEWAY",
        });
      }

      type CalSlotsResponse = {
        status: "success" | "error";
        error?: string;
        data?: { slots: Record<string, { time: string }[]> };
      };

      const data: CalSlotsResponse = await response.json();

      if (data.status !== "success" || !data.data?.slots) {
        throw new TRPCError({
          message: data.error || "Invalid response from Cal.com",
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      // Flatten & normalize times into local timezone display
      const firstDateKey = Object.keys(data.data.slots)[0];
      const slots = data.data.slots[firstDateKey] || [];

      return slots;
    } catch (err) {
      console.error("GetBookingSlots error:", err);
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        message: "Something went wrong fetching booking slots",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  });

const listEmailTemplates = withPermissions("READ::ORGANIZATION").query(
  async ({ ctx }) => {
    return prisma.marketingEmailTemplate.findMany({
      where: {
        organizationId: ctx.orgWithSub.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },
);

const getLatestEmailTemplate = withPermissions("READ::ORGANIZATION").query(
  async ({ ctx }) => {
    return prisma.marketingEmailTemplate.findFirst({
      where: {
        organizationId: ctx.orgWithSub.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        designJson: true,
        html: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },
);

const getEmailTemplateById = withPermissions(
  "READ::ORGANIZATION",
  marketingTemplateIdSchema,
).query(async ({ ctx, input }) => {
  const template = await prisma.marketingEmailTemplate.findFirst({
    where: {
      id: input.id,
      organizationId: ctx.orgWithSub.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      designJson: true,
      html: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!template) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Marketing email template not found.",
    });
  }

  return template;
});

const createEmailTemplate = withPermissions("UPDATE::ORGANIZATION").mutation(
  async ({ ctx }) => {
    const existingUntitledCount = await prisma.marketingEmailTemplate.count({
      where: {
        organizationId: ctx.orgWithSub.id,
        title: {
          startsWith: "Untitled template",
        },
      },
    });

    return prisma.marketingEmailTemplate.create({
      data: {
        organizationId: ctx.orgWithSub.id,
        title: buildUntitledTemplateName(existingUntitledCount),
        description: undefined,
        designJson: "{}",
        html: undefined,
      },
      select: {
        id: true,
        title: true,
        description: true,
        designJson: true,
        html: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },
);

const saveEmailTemplate = withPermissions(
  "UPDATE::ORGANIZATION",
  marketingTemplateInputSchema,
).mutation(async ({ ctx, input }) => {
  const normalizedDescription = input.description || undefined;

  try {
    if (input.id) {
      const existingTemplate = await prisma.marketingEmailTemplate.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgWithSub.id,
        },
        select: {
          id: true,
        },
      });

      if (!existingTemplate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Marketing email template not found.",
        });
      }

      return prisma.marketingEmailTemplate.update({
        where: {
          id: existingTemplate.id,
        },
        data: {
          title: input.title,
          description: normalizedDescription,
          designJson: input.designJson,
          html: input.html,
        },
        select: {
          id: true,
          title: true,
          description: true,
          designJson: true,
          html: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    return prisma.marketingEmailTemplate.upsert({
      where: {
        organizationId_title: {
          organizationId: ctx.orgWithSub.id,
          title: input.title,
        },
      },
      update: {
        description: normalizedDescription,
        designJson: input.designJson,
        html: input.html,
      },
      create: {
        organizationId: ctx.orgWithSub.id,
        title: input.title,
        description: normalizedDescription,
        designJson: input.designJson,
        html: input.html,
      },
      select: {
        id: true,
        title: true,
        description: true,
        designJson: true,
        html: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A template with this title already exists.",
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save marketing email template.",
      cause: error,
    });
  }
});

const getContactListFilterOptions = withPermissions("READ::ORGANIZATION").query(
  async ({ ctx }) => {
    const serviceOptions = await prisma.serviceTerms.findMany({
      where: { organizationId: ctx.orgWithSub.id },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      serviceOptions,
    };
  },
);

const listContactLists = withPermissions("READ::ORGANIZATION").query(async ({ ctx }) => {
  const rawContactLists = await marketingContactListDelegate.findMany({
    where: { organizationId: ctx.orgWithSub.id },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return Promise.all(
    rawContactLists.map(async (contactList) => {
      const filterMode = toContactListFilterMode(contactList.filterMode);
      const filters = parseContactListFilters(contactList.filtersJson);

      return {
        ...contactList,
        filterMode,
        filters,
        recipientCount: await countContactListRecipients(ctx.orgWithSub.id, {
          filterMode,
          filters,
        }),
      };
    }),
  );
});

const createContactList = withPermissions(
  "UPDATE::ORGANIZATION",
  organizationContactListSchema,
).mutation(async ({ ctx, input }) => {
  const filters = normalizeContactListFilters(input.filters as unknown[]);

  try {
    return await marketingContactListDelegate.create({
      data: {
        organizationId: ctx.orgWithSub.id,
        name: input.name.trim(),
        description: input.description.trim() || null,
        filterMode: input.filterMode,
        filtersJson: JSON.stringify(filters),
      },
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A contact list with this name already exists.",
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create contact list.",
      cause: error,
    });
  }
});

const deleteContactList = withPermissions(
  "UPDATE::ORGANIZATION",
  marketingContactListIdSchema,
).mutation(async ({ ctx, input }) => {
  const contactList = await marketingContactListDelegate.findFirst({
    where: {
      id: input.id,
      organizationId: ctx.orgWithSub.id,
    },
    select: {
      id: true,
    },
  });

  if (!contactList) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Contact list not found.",
    });
  }

  await marketingContactListDelegate.delete({
    where: {
      id: contactList.id,
    },
  });

  return {
    success: true,
  };
});

const getCampaignBuilderData = withPermissions("READ::ORGANIZATION").query(
  async ({ ctx }) => {
    const [templates, rawContactLists] = await Promise.all([
      prisma.marketingEmailTemplate.findMany({
        where: {
          organizationId: ctx.orgWithSub.id,
        },
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          title: true,
          description: true,
          updatedAt: true,
        },
      }),
      marketingContactListDelegate.findMany({
        where: {
          organizationId: ctx.orgWithSub.id,
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    const contactLists = await Promise.all(
      rawContactLists.map(async (contactList) => {
        const filterMode = toContactListFilterMode(contactList.filterMode);
        const filters = parseContactListFilters(contactList.filtersJson);

        return {
          id: contactList.id,
          name: contactList.name,
          description: contactList.description,
          filterMode,
          filters,
          recipientCount: await countContactListRecipients(ctx.orgWithSub.id, {
            filterMode,
            filters,
          }),
        };
      }),
    );

    return {
      templates,
      contactLists,
    };
  },
);

const createCampaignAudiencePreview = withPermissions(
  "READ::ORGANIZATION",
  z.object({
    contactListId: z.string().min(1, "Contact list is required."),
  }),
).mutation(async ({ ctx, input }) => {
  const contactList = await marketingContactListDelegate.findFirst({
    where: {
      id: input.contactListId,
      organizationId: ctx.orgWithSub.id,
    },
  });

  if (!contactList) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Contact list not found.",
    });
  }

  const filterMode = toContactListFilterMode(contactList.filterMode);
  const filters = parseContactListFilters(contactList.filtersJson);

  const [recipientCount, previewRecipients] = await Promise.all([
    countContactListRecipients(ctx.orgWithSub.id, {
      filterMode,
      filters,
    }),
    getContactListAudienceRecipients(ctx.orgWithSub.id, {
      filterMode,
      filters,
    }),
  ]);

  return {
    contactListId: contactList.id,
    contactListName: contactList.name,
    filterMode,
    filters,
    recipientCount,
    previewRecipients,
    generatedAt: new Date(),
  };
});

const listCampaigns = withPermissions("READ::ORGANIZATION").query(async ({ ctx }) => {
  return marketingCampaignDelegate.findMany({
    where: {
      organizationId: ctx.orgWithSub.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      sentAt: true,
      deliveryError: true,
      audienceCount: true,
      audienceSnapshotAt: true,
      createdAt: true,
      updatedAt: true,
      template: {
        select: {
          id: true,
          title: true,
        },
      },
      contactList: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
});

const createCampaign = withPermissions(
  "UPDATE::ORGANIZATION",
  createMarketingCampaignSchema,
).mutation(async ({ ctx, input }) => {
  const [template, contactList] = await Promise.all([
    prisma.marketingEmailTemplate.findFirst({
      where: {
        id: input.templateId,
        organizationId: ctx.orgWithSub.id,
      },
      select: {
        id: true,
        title: true,
      },
    }),
    marketingContactListDelegate.findFirst({
      where: {
        id: input.contactListId,
        organizationId: ctx.orgWithSub.id,
      },
      select: {
        id: true,
        name: true,
        filterMode: true,
        filtersJson: true,
      },
    }),
  ]);

  if (!template) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Marketing email template not found.",
    });
  }

  if (!contactList) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Contact list not found.",
    });
  }

  const filterMode = toContactListFilterMode(contactList.filterMode);
  const filters = parseContactListFilters(contactList.filtersJson);
  const recipients = await getContactListAudienceRecipients(ctx.orgWithSub.id, {
    filterMode,
    filters,
  });

  const recipientsByCustomerId = new Map(
    recipients.map((recipient) => [recipient.customerId, recipient]),
  );
  const selectedRecipients = input.selectedCustomerIds
    .map((customerId) => recipientsByCustomerId.get(customerId))
    .filter((recipient): recipient is NonNullable<typeof recipient> => Boolean(recipient));

  if (recipients.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The selected contact list does not contain any recipients.",
    });
  }

  if (selectedRecipients.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select at least one customer for this campaign snapshot.",
    });
  }

  if (selectedRecipients.length !== input.selectedCustomerIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Some selected customers no longer match this contact list. Generate a fresh snapshot and try again.",
    });
  }

  const audienceSnapshotAt = new Date();

  const createdCampaign = await prisma.$transaction(async (tx) => {
    const delegates = tx as typeof marketingDelegates;
    const campaign = await delegates.marketingCampaign.create({
      data: {
        organizationId: ctx.orgWithSub.id,
        templateId: template.id,
        contactListId: contactList.id,
        title: input.title.trim(),
        description: input.description.trim() || null,
        audienceSnapshotAt,
        audienceCount: selectedRecipients.length,
      },
      select: {
        id: true,
      },
    });

    for (const chunk of chunkArray(selectedRecipients, 500)) {
      await delegates.marketingCampaignAudience.createMany({
        data: chunk.map((recipient) => ({
          campaignId: campaign.id,
          customerId: recipient.customerId,
          email: recipient.email,
          name: recipient.name,
        })),
        skipDuplicates: true,
      });
    }

    return delegates.marketingCampaign.findFirst({
      where: {
        id: campaign.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        sentAt: true,
        deliveryError: true,
        audienceCount: true,
        audienceSnapshotAt: true,
        createdAt: true,
        updatedAt: true,
        template: {
          select: {
            id: true,
            title: true,
          },
        },
        contactList: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  });

  return createdCampaign;
});

const sendCampaign = withPermissions(
  "UPDATE::ORGANIZATION",
  marketingCampaignIdSchema,
).mutation(async ({ ctx, input }) => {
  const campaign = await marketingCampaignDelegate.findFirst({
    where: {
      id: input.id,
      organizationId: ctx.orgWithSub.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      audienceCount: true,
      template: {
        select: {
          id: true,
          title: true,
          html: true,
        },
      },
      audience: {
        select: {
          customerId: true,
          email: true,
          name: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!campaign) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Campaign not found.",
    });
  }

  if (campaign.status === "SENT") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This campaign has already been sent.",
    });
  }

  if (!campaign.template?.html?.trim()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The selected template does not have published HTML to send.",
    });
  }

  if (!campaign.audience.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This campaign does not have any audience recipients.",
    });
  }

  await marketingCampaignDelegate.update({
    where: { id: campaign.id },
    data: {
      status: "SENDING",
      deliveryError: null,
    },
  });

  try {
    const subject = campaign.title.trim();
    const html = campaign.template.html.trim();
    const text = campaign.description?.trim() || undefined;
    const audience = campaign.audience as CampaignAudienceRecipient[];
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      for (const chunk of chunkArray(audience, 20)) {
        await Promise.all(
          chunk.map((recipient) =>
            organizationEmailService.send({
              organizationId: ctx.orgWithSub.id,
              to: recipient.email,
              subject,
              html,
              text,
              tags: {
                campaignId: campaign.id,
                templateId: campaign.template.id,
              },
            }),
          ),
        );
      }
    } else {
      for (const recipient of audience) {
        console.info("[marketing-campaign:development-send]", {
          campaignId: campaign.id,
          subject,
          to: recipient.email,
          recipientName: recipient.name,
          htmlPreview: html.slice(0, 200),
        });
      }
    }

    const sentAt = new Date();

    await marketingCampaignDelegate.update({
      where: { id: campaign.id },
      data: {
        status: "SENT",
        sentAt,
        deliveryError: null,
      },
    });

    return {
      id: campaign.id,
      status: "SENT",
      sentAt,
      recipientCount: audience.length,
      deliveryMode: isProduction ? "ses" : "console",
    };
  } catch (error) {
    const message = error instanceof Error && error.message.trim()
      ? error.message
      : "Failed to send campaign.";

    await marketingCampaignDelegate.update({
      where: { id: campaign.id },
      data: {
        status: "FAILED",
        deliveryError: message,
      },
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message,
      cause: error,
    });
  }
});

export const marketingRouter = router({
  createBookDemo: BookDemo,
  getAvailableSlots: GetBookingSlots,
  listEmailTemplates,
  getLatestEmailTemplate,
  getEmailTemplateById,
  createEmailTemplate,
  saveEmailTemplate,
  getContactListFilterOptions,
  listContactLists,
  createContactList,
  deleteContactList,
  getCampaignBuilderData,
  createCampaignAudiencePreview,
  listCampaigns,
  createCampaign,
  sendCampaign,
});

const isPrismaUniqueConstraintError = (error: unknown) => {
  return error instanceof Error && "code" in error
    ? (error as { code?: string }).code === "P2002"
    : false;
};

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};
