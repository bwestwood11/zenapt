import prisma from "../../../prisma";
import {
  OrganizationEmailVerificationStatus,
  type OrganizationEmailDomain,
  type OrganizationSenderEmail,
} from "../../../prisma/generated/client";
import { sesEmailService, SesApiError, type SendSesEmailInput } from "./ses";

const marketingContactListDelegate = (prisma as unknown as {
  marketingContactList: {
    findMany: (args: unknown) => Promise<any[]>;
    create: (args: unknown) => Promise<any>;
    findFirst: (args: unknown) => Promise<any>;
    delete: (args: unknown) => Promise<any>;
  };
}).marketingContactList;

const VERIFIED_STATUS = OrganizationEmailVerificationStatus.SUCCESS;
const DOMAIN_MAIL_FROM_LABEL = "mail";

export type ContactListFilterMode = "ALL" | "ANY";

export type ContactListFilter =
  | {
      type: "SERVICE_USED";
      serviceId: string;
    }
  | {
      type: "NO_APPOINTMENT_IN_DAYS";
      days: number;
    }
  | {
      type: "APPOINTMENT_STATUS";
      status: "SCHEDULED" | "COMPLETED" | "CANCELED" | "NO_SHOW" | "RESCHEDULED";
    };

export type SendOrganizationEmailInput = Omit<SendSesEmailInput, "from"> & {
  organizationId: string;
  from?: string;
};

export class OrganizationEmailService {
  async getSettings(organizationId: string) {
    const [domains, senderEmails, rawContactLists, serviceOptions] = await Promise.all([
      prisma.organizationEmailDomain.findMany({
        where: { organizationId },
        orderBy: [{ verifiedForSendingStatus: "desc" }, { createdAt: "asc" }],
        include: {
          senderEmails: {
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          },
        },
      }),
      prisma.organizationSenderEmail.findMany({
        where: { organizationId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        include: {
          domain: true,
        },
      }),
      marketingContactListDelegate.findMany({
        where: { organizationId },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.serviceTerms.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    const contactLists = await Promise.all(
      rawContactLists.map(async (contactList) => {
        const filters = parseContactListFilters(contactList.filtersJson);
        return {
          ...contactList,
          filterMode: toContactListFilterMode(contactList.filterMode),
          filters,
          recipientCount: await this.countContactListRecipients(organizationId, {
            filterMode: toContactListFilterMode(contactList.filterMode),
            filters,
          }),
        };
      }),
    );

    return {
      domains,
      senderEmails,
      contactLists,
      serviceOptions,
    };
  }

  async createContactList(input: {
    organizationId: string;
    name: string;
    description?: string;
    filterMode: ContactListFilterMode;
    filters: ContactListFilter[];
  }) {
    const filters = normalizeContactListFilters(input.filters);

    try {
      return await marketingContactListDelegate.create({
        data: {
          organizationId: input.organizationId,
          name: input.name.trim(),
          description: normalizeOptionalText(input.description),
          filterMode: input.filterMode,
          filtersJson: JSON.stringify(filters),
        },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new Error("A contact list with this name already exists.");
      }

      throw error;
    }
  }

  async deleteContactList(input: { organizationId: string; contactListId: string }) {
    const contactList = await marketingContactListDelegate.findFirst({
      where: {
        id: input.contactListId,
        organizationId: input.organizationId,
      },
      select: { id: true },
    });

    if (!contactList) {
      throw new Error("Contact list not found.");
    }

    await marketingContactListDelegate.delete({
      where: { id: contactList.id },
    });

    return { success: true };
  }

  private async countContactListRecipients(
    organizationId: string,
    input: {
      filterMode: ContactListFilterMode;
      filters: ContactListFilter[];
    },
  ) {
    if (input.filters.length === 0) {
      return 0;
    }

    const conditions = input.filters.map(buildContactListCustomerCondition);

    return prisma.customer.count({
      where: {
        orgId: organizationId,
        ...(input.filterMode === "ANY"
          ? { OR: conditions }
          : { AND: conditions }),
      },
    });
  }

  async createDomain(input: { organizationId: string; domain: string }) {
    const domain = normalizeDomain(input.domain);

    await this.assertDomainAvailability(domain, input.organizationId);

    const createdIdentity = await this.ensureIdentityExists(domain);
    const mailFromDomain = buildMailFromDomain(domain);

    await sesEmailService.putIdentityMailFromAttributes({
      emailIdentity: domain,
      mailFromDomain,
      behaviorOnMxFailure: "REJECT_MESSAGE",
    });

    const identity =
      createdIdentity.IdentityType === "DOMAIN"
        ? await sesEmailService.getIdentity(domain)
        : createdIdentity;

    const existing = await prisma.organizationEmailDomain.findUnique({
      where: { domain },
    });

    const persisted = await prisma.organizationEmailDomain.upsert({
      where: { domain },
      create: {
        organizationId: input.organizationId,
        domain,
        ...mapDomainIdentity(identity, existing ?? null, mailFromDomain),
      },
      update: {
        organizationId: input.organizationId,
        ...mapDomainIdentity(identity, existing ?? null, mailFromDomain),
      },
    });

    await this.syncDomainBackedSenders(persisted.id, persisted.organizationId);

    return prisma.organizationEmailDomain.findUniqueOrThrow({
      where: { id: persisted.id },
      include: {
        senderEmails: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        },
      },
    });
  }

  async refreshDomain(input: { organizationId: string; domainId: string }) {
    const domainRecord = await prisma.organizationEmailDomain.findFirst({
      where: {
        id: input.domainId,
        organizationId: input.organizationId,
      },
    });

    if (!domainRecord) {
      throw new Error("Organization domain not found.");
    }

    const identity = await sesEmailService.getIdentity(domainRecord.domain);

    const updated = await prisma.organizationEmailDomain.update({
      where: { id: domainRecord.id },
      data: mapDomainIdentity(identity, domainRecord, domainRecord.mailFromDomain),
    });

    await this.syncDomainBackedSenders(updated.id, updated.organizationId);

    return prisma.organizationEmailDomain.findUniqueOrThrow({
      where: { id: updated.id },
      include: {
        senderEmails: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        },
      },
    });
  }

  async deleteDomain(input: { organizationId: string; domainId: string }) {
    const domainRecord = await prisma.organizationEmailDomain.findFirst({
      where: {
        id: input.domainId,
        organizationId: input.organizationId,
      },
    });

    if (!domainRecord) {
      throw new Error("Organization domain not found.");
    }

    try {
      await sesEmailService.deleteIdentity(domainRecord.domain);
    } catch (error) {
      if (!(error instanceof SesApiError)) {
        throw error;
      }

      if (getSesErrorCode(error) !== "NotFoundException") {
        throw error;
      }
    }

    await prisma.organizationEmailDomain.delete({
      where: { id: domainRecord.id },
    });

    await this.ensureDefaultSender(input.organizationId);

    return { success: true };
  }

  async createSenderEmail(input: {
    organizationId: string;
    email: string;
    displayName?: string;
  }) {
    const email = normalizeEmail(input.email);
    const domain = extractDomain(email);
    const existingSender = await prisma.organizationSenderEmail.findUnique({
      where: { email },
      include: { domain: true },
    });

    if (existingSender && existingSender.organizationId !== input.organizationId) {
      throw new Error("This sender email is already claimed by another organization.");
    }

    const ownedDomain = await prisma.organizationEmailDomain.findUnique({
      where: { domain },
    });

    if (ownedDomain && ownedDomain.organizationId !== input.organizationId) {
      throw new Error("This sender email uses a domain owned by another organization.");
    }

    if (ownedDomain) {
      const refreshedDomain = await this.refreshDomain({
        organizationId: input.organizationId,
        domainId: ownedDomain.id,
      });

      if (!refreshedDomain.verifiedForSendingStatus) {
        throw new Error("Verify the domain before adding sender emails to it.");
      }

      const sender = await prisma.organizationSenderEmail.upsert({
        where: { email },
        create: {
          organizationId: input.organizationId,
          domainId: ownedDomain.id,
          email,
          displayName: normalizeOptionalText(input.displayName),
          verificationStatus: VERIFIED_STATUS,
          verifiedForSendingStatus: true,
          lastCheckedAt: new Date(),
          lastVerifiedAt: new Date(),
        },
        update: {
          domainId: ownedDomain.id,
          displayName: normalizeOptionalText(input.displayName),
          verificationStatus: VERIFIED_STATUS,
          verifiedForSendingStatus: true,
          lastCheckedAt: new Date(),
          lastVerifiedAt: new Date(),
        },
        include: {
          domain: true,
        },
      });

      await this.ensureDefaultSender(input.organizationId, sender.id);

      return prisma.organizationSenderEmail.findUniqueOrThrow({
        where: { id: sender.id },
        include: { domain: true },
      });
    }

    await this.assertExactEmailAvailability(email, input.organizationId);

    await this.ensureIdentityExists(email);
    const identity = await sesEmailService.getIdentity(email);

    const sender = await prisma.organizationSenderEmail.upsert({
      where: { email },
      create: {
        organizationId: input.organizationId,
        email,
        displayName: normalizeOptionalText(input.displayName),
        ...mapSenderIdentity(identity, null),
      },
      update: {
        displayName: normalizeOptionalText(input.displayName),
        ...mapSenderIdentity(identity, existingSender ?? null),
      },
      include: {
        domain: true,
      },
    });

    await this.ensureDefaultSender(
      input.organizationId,
      sender.verifiedForSendingStatus ? sender.id : undefined,
    );

    return prisma.organizationSenderEmail.findUniqueOrThrow({
      where: { id: sender.id },
      include: { domain: true },
    });
  }

  async refreshSenderEmail(input: { organizationId: string; senderEmailId: string }) {
    const sender = await prisma.organizationSenderEmail.findFirst({
      where: {
        id: input.senderEmailId,
        organizationId: input.organizationId,
      },
      include: { domain: true },
    });

    if (!sender) {
      throw new Error("Organization sender email not found.");
    }

    if (sender.domainId) {
      await this.refreshDomain({
        organizationId: input.organizationId,
        domainId: sender.domainId,
      });

      return prisma.organizationSenderEmail.findUniqueOrThrow({
        where: { id: sender.id },
        include: { domain: true },
      });
    }

    const identity = await sesEmailService.getIdentity(sender.email);
    const updated = await prisma.organizationSenderEmail.update({
      where: { id: sender.id },
      data: mapSenderIdentity(identity, sender),
      include: { domain: true },
    });

    await this.ensureDefaultSender(
      input.organizationId,
      updated.verifiedForSendingStatus ? updated.id : undefined,
    );

    return updated;
  }

  async deleteSenderEmail(input: { organizationId: string; senderEmailId: string }) {
    const sender = await prisma.organizationSenderEmail.findFirst({
      where: {
        id: input.senderEmailId,
        organizationId: input.organizationId,
      },
    });

    if (!sender) {
      throw new Error("Organization sender email not found.");
    }

    if (!sender.domainId) {
      try {
        await sesEmailService.deleteIdentity(sender.email);
      } catch (error) {
        if (!(error instanceof SesApiError)) {
          throw error;
        }

        if (getSesErrorCode(error) !== "NotFoundException") {
          throw error;
        }
      }
    }

    await prisma.organizationSenderEmail.delete({
      where: { id: sender.id },
    });

    await this.ensureDefaultSender(input.organizationId);

    return { success: true };
  }

  async setDefaultSenderEmail(input: { organizationId: string; senderEmailId: string }) {
    const sender = await prisma.organizationSenderEmail.findFirst({
      where: {
        id: input.senderEmailId,
        organizationId: input.organizationId,
      },
    });

    if (!sender) {
      throw new Error("Organization sender email not found.");
    }

    if (!sender.verifiedForSendingStatus) {
      throw new Error("Only verified sender emails can be marked as default.");
    }

    await this.setDefaultSender(input.organizationId, sender.id);

    return prisma.organizationSenderEmail.findUniqueOrThrow({
      where: { id: sender.id },
      include: { domain: true },
    });
  }

  async send(input: SendOrganizationEmailInput) {
    const sender = await this.resolveVerifiedSender(input.organizationId, input.from);

    return sesEmailService.send({
      ...input,
      from: formatFromAddress(sender.displayName, sender.email),
    });
  }

  async sendTestEmail(input: {
    organizationId: string;
    senderEmailId: string;
    to: string;
    organizationName?: string | null;
    requestedByName?: string | null;
  }) {
    const sender = await prisma.organizationSenderEmail.findFirst({
      where: {
        id: input.senderEmailId,
        organizationId: input.organizationId,
      },
    });

    if (!sender) {
      throw new Error("Organization sender email not found.");
    }

    if (!sender.verifiedForSendingStatus) {
      throw new Error("Only verified sender emails can send a test email.");
    }

    const previewLabel = input.organizationName?.trim() || "your organization";
    const requesterLabel = input.requestedByName?.trim() || "A team member";

    return this.send({
      organizationId: input.organizationId,
      from: sender.email,
      to: normalizeEmail(input.to),
      subject: `ZenApt test email from ${previewLabel}`,
      text: [
        `This is a test email from ${previewLabel}.`,
        "",
        `Sender identity: ${formatFromAddress(sender.displayName, sender.email)}`,
        `Requested by: ${requesterLabel}`,
        "",
        "If you received this email, the sender is configured correctly.",
      ].join("\n"),
      html: [
        `<p>This is a test email from <strong>${escapeHtml(previewLabel)}</strong>.</p>`,
        "<p>If you received this email, the sender is configured correctly.</p>",
        "<hr />",
        `<p><strong>Sender identity:</strong> ${escapeHtml(
          formatFromAddress(sender.displayName, sender.email),
        )}</p>`,
        `<p><strong>Requested by:</strong> ${escapeHtml(requesterLabel)}</p>`,
      ].join(""),
    });
  }

  private async resolveVerifiedSender(organizationId: string, requestedFrom?: string) {
    if (requestedFrom) {
      const email = normalizeEmail(extractEmailAddress(requestedFrom));
      const sender = await prisma.organizationSenderEmail.findFirst({
        where: {
          organizationId,
          email,
        },
      });

      if (!sender?.verifiedForSendingStatus) {
        throw new Error("The sender email is not verified for this organization.");
      }

      return sender;
    }

    const defaultSender = await prisma.organizationSenderEmail.findFirst({
      where: {
        organizationId,
        isDefault: true,
        verifiedForSendingStatus: true,
      },
    });

    if (!defaultSender) {
      throw new Error("No verified default sender is configured for this organization.");
    }

    return defaultSender;
  }

  private async ensureIdentityExists(emailIdentity: string) {
    try {
      return await sesEmailService.createIdentity({
        emailIdentity,
        tags: {
          app: "zenapt",
        },
      });
    } catch (error) {
      if (error instanceof SesApiError) {
        if (getSesErrorCode(error) === "AlreadyExistsException") {
          return await sesEmailService.getIdentity(emailIdentity);
        }
      }

      throw error;
    }
  }

  private async assertDomainAvailability(domain: string, organizationId: string) {
    const existingDomain = await prisma.organizationEmailDomain.findUnique({
      where: { domain },
    });

    if (existingDomain && existingDomain.organizationId !== organizationId) {
      throw new Error("This domain is already claimed by another organization.");
    }

    const overlappingEmail = await prisma.organizationSenderEmail.findFirst({
      where: {
        organizationId: { not: organizationId },
        email: {
          endsWith: `@${domain}`,
        },
      },
    });

    if (overlappingEmail) {
      throw new Error(
        "This domain cannot be claimed because one of its sender emails is already used by another organization.",
      );
    }
  }

  private async assertExactEmailAvailability(email: string, organizationId: string) {
    const existingSender = await prisma.organizationSenderEmail.findUnique({
      where: { email },
    });

    if (existingSender && existingSender.organizationId !== organizationId) {
      throw new Error("This sender email is already claimed by another organization.");
    }

    const emailDomain = extractDomain(email);
    const claimedDomain = await prisma.organizationEmailDomain.findUnique({
      where: { domain: emailDomain },
    });

    if (claimedDomain && claimedDomain.organizationId !== organizationId) {
      throw new Error("This sender email uses a domain owned by another organization.");
    }
  }

  private async syncDomainBackedSenders(domainId: string, organizationId: string) {
    const domainRecord = await prisma.organizationEmailDomain.findUnique({
      where: { id: domainId },
    });

    if (!domainRecord) {
      return;
    }

    const now = new Date();

    await prisma.organizationSenderEmail.updateMany({
      where: {
        domainId,
      },
      data: {
        verificationStatus: domainRecord.verifiedForSendingStatus
          ? VERIFIED_STATUS
          : domainRecord.verificationStatus,
        verifiedForSendingStatus: domainRecord.verifiedForSendingStatus,
        lastCheckedAt: now,
        ...(domainRecord.verifiedForSendingStatus ? { lastVerifiedAt: now } : {}),
      },
    });

    await this.ensureDefaultSender(organizationId);
  }

  private async ensureDefaultSender(organizationId: string, preferredSenderId?: string) {
    const existingDefault = await prisma.organizationSenderEmail.findFirst({
      where: {
        organizationId,
        isDefault: true,
      },
    });

    if (existingDefault) {
      return;
    }

    const nextDefaultId =
      preferredSenderId ??
      (
        await prisma.organizationSenderEmail.findFirst({
          where: {
            organizationId,
            verifiedForSendingStatus: true,
          },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        })
      )?.id;

    if (!nextDefaultId) {
      return;
    }

    await this.setDefaultSender(organizationId, nextDefaultId);
  }

  private async setDefaultSender(organizationId: string, senderEmailId: string) {
    await prisma.$transaction([
      prisma.organizationSenderEmail.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      }),
      prisma.organizationSenderEmail.update({
        where: { id: senderEmailId },
        data: { isDefault: true },
      }),
    ]);
  }
}

export const organizationEmailService = new OrganizationEmailService();

const mapDomainIdentity = (
  identity: Awaited<ReturnType<typeof sesEmailService.getIdentity>>,
  existing: OrganizationEmailDomain | null,
  fallbackMailFromDomain: string | null,
) => {
  const now = new Date();
  const verifiedForSendingStatus = identity.VerifiedForSendingStatus ?? false;
  const verificationStatus =
    toVerificationStatus(identity.VerificationStatus) ??
    (verifiedForSendingStatus
      ? VERIFIED_STATUS
      : existing?.verificationStatus ?? OrganizationEmailVerificationStatus.PENDING);

  return {
    mailFromDomain:
      identity.MailFromAttributes?.MailFromDomain ??
      existing?.mailFromDomain ??
      fallbackMailFromDomain,
    mailFromBehavior:
      identity.MailFromAttributes?.BehaviorOnMxFailure ??
      existing?.mailFromBehavior ??
      "REJECT_MESSAGE",
    verificationStatus,
    verifiedForSendingStatus,
    dkimStatus:
      toVerificationStatus(identity.DkimAttributes?.Status) ??
      existing?.dkimStatus ??
      OrganizationEmailVerificationStatus.NOT_STARTED,
    dkimTokens: identity.DkimAttributes?.Tokens ?? existing?.dkimTokens ?? [],
    mailFromStatus:
      toVerificationStatus(identity.MailFromAttributes?.MailFromDomainStatus) ??
      existing?.mailFromStatus ??
      OrganizationEmailVerificationStatus.NOT_STARTED,
    verificationErrorType:
      verifiedForSendingStatus || verificationStatus === VERIFIED_STATUS
        ? null
        : identity.VerificationInfo?.ErrorType ?? existing?.verificationErrorType ?? null,
    lastCheckedAt: now,
    ...(verifiedForSendingStatus ? { lastVerifiedAt: now } : {}),
  };
};

const mapSenderIdentity = (
  identity: Awaited<ReturnType<typeof sesEmailService.getIdentity>>,
  existing: OrganizationSenderEmail | null,
) => {
  const now = new Date();
  const verifiedForSendingStatus = identity.VerifiedForSendingStatus ?? false;

  return {
    verificationStatus:
      toVerificationStatus(identity.VerificationStatus) ??
      (verifiedForSendingStatus
        ? VERIFIED_STATUS
        : existing?.verificationStatus ?? OrganizationEmailVerificationStatus.PENDING),
    verifiedForSendingStatus,
    lastCheckedAt: now,
    ...(verifiedForSendingStatus ? { lastVerifiedAt: now } : {}),
  };
};

const toVerificationStatus = (status?: string) => {
  switch (status) {
    case "NOT_STARTED":
      return OrganizationEmailVerificationStatus.NOT_STARTED;
    case "PENDING":
      return OrganizationEmailVerificationStatus.PENDING;
    case "SUCCESS":
      return OrganizationEmailVerificationStatus.SUCCESS;
    case "FAILED":
      return OrganizationEmailVerificationStatus.FAILED;
    case "TEMPORARY_FAILURE":
      return OrganizationEmailVerificationStatus.TEMPORARY_FAILURE;
    default:
      return undefined;
  }
};

const normalizeDomain = (domain: string) => domain.trim().toLowerCase();

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const normalizeOptionalText = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || null;
};

const extractDomain = (email: string) => {
  const [, domain = ""] = normalizeEmail(email).split("@");
  return domain;
};

const extractEmailAddress = (from: string) => {
  const match = /<([^>]+)>/.exec(from);
  return match?.[1] ?? from;
};

const buildMailFromDomain = (domain: string) => `${DOMAIN_MAIL_FROM_LABEL}.${domain}`;

const formatFromAddress = (
  displayName: string | null | undefined,
  email: string,
) => {
  return displayName ? `${displayName} <${email}>` : email;
};

const escapeHtml = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const getSesErrorCode = (error: unknown) => {
  return error instanceof Error && "code" in error
    ? (error as { code?: string }).code
    : undefined;
};

const toContactListFilterMode = (value?: string): ContactListFilterMode => {
  return value === "ANY" ? "ANY" : "ALL";
};

const parseContactListFilters = (value?: string | null): ContactListFilter[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeContactListFilters(parsed);
  } catch {
    return [];
  }
};

const normalizeContactListFilters = (filters: unknown[]): ContactListFilter[] => {
  const normalized = filters
    .map(parseContactListFilter)
    .filter((filter): filter is ContactListFilter => Boolean(filter));

  if (normalized.length === 0) {
    throw new Error("Add at least one valid filter to create a contact list.");
  }

  return normalized;
};

const buildContactListCustomerCondition = (filter: ContactListFilter) => {
  switch (filter.type) {
    case "SERVICE_USED":
      return {
        appointments: {
          some: {
            service: {
              some: {
                serviceTerms: {
                  id: filter.serviceId,
                },
              },
            },
          },
        },
      };
    case "NO_APPOINTMENT_IN_DAYS": {
      const cutoff = new Date(Date.now() - filter.days * 24 * 60 * 60 * 1000);
      return {
        AND: [
          {
            appointments: {
              some: {
                startTime: {
                  lt: cutoff,
                },
              },
            },
          },
          {
            appointments: {
              none: {
                startTime: {
                  gte: cutoff,
                },
              },
            },
          },
        ],
      };
    }
    case "APPOINTMENT_STATUS":
      return {
        appointments: {
          some: {
            status: filter.status,
          },
        },
      };
  }
};

const parseContactListFilter = (filter: unknown): ContactListFilter | null => {
  if (!filter || typeof filter !== "object" || !("type" in filter)) {
    return null;
  }

  const candidate = filter as Record<string, unknown>;

  switch (candidate.type) {
    case "SERVICE_USED":
      return parseServiceUsedFilter(candidate);
    case "NO_APPOINTMENT_IN_DAYS":
      return parseNoAppointmentInDaysFilter(candidate);
    case "APPOINTMENT_STATUS":
      return parseAppointmentStatusFilter(candidate);
    default:
      return null;
  }
};

const parseServiceUsedFilter = (
  candidate: Record<string, unknown>,
): ContactListFilter | null => {
  const serviceId = typeof candidate.serviceId === "string"
    ? candidate.serviceId.trim()
    : "";

  return serviceId ? { type: "SERVICE_USED", serviceId } : null;
};

const parseNoAppointmentInDaysFilter = (
  candidate: Record<string, unknown>,
): ContactListFilter | null => {
  const days = Number(candidate.days);

  return Number.isFinite(days) && days > 0
    ? { type: "NO_APPOINTMENT_IN_DAYS", days: Math.floor(days) }
    : null;
};

const parseAppointmentStatusFilter = (
  candidate: Record<string, unknown>,
): ContactListFilter | null => {
  const status = typeof candidate.status === "string" ? candidate.status : "";

  return isAppointmentStatus(status)
    ? { type: "APPOINTMENT_STATUS", status }
    : null;
};

const isAppointmentStatus = (
  value: string,
): value is ContactListFilter extends { type: "APPOINTMENT_STATUS"; status: infer T }
  ? T
  : never => {
  return ["SCHEDULED", "COMPLETED", "CANCELED", "NO_SHOW", "RESCHEDULED"].includes(value);
};

const isPrismaUniqueConstraintError = (error: unknown) => {
  return error instanceof Error && "code" in error
    ? (error as { code?: string }).code === "P2002"
    : false;
};
