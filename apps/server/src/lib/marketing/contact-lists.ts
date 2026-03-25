import prisma from "../../../prisma";

export const APPOINTMENT_STATUS_VALUES = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELED",
  "NO_SHOW",
  "RESCHEDULED",
] as const;

export type AppointmentStatusValue = (typeof APPOINTMENT_STATUS_VALUES)[number];
export type ContactListFilterMode = "ALL" | "ANY";

export type ContactListFilter =
  | {
      type: "SERVICE_USED";
      serviceId: string;
    }
  | {
      type: "NO_SERVICES_USED";
    }
  | {
      type: "NO_APPOINTMENT_IN_DAYS";
      days: number;
    }
  | {
      type: "APPOINTMENT_STATUS";
      status: AppointmentStatusValue;
    };

export type ContactListAudienceRecipient = {
  customerId: string;
  email: string;
  name: string | null;
};

export const toContactListFilterMode = (value?: string): ContactListFilterMode => {
  return value === "ANY" ? "ANY" : "ALL";
};

export const parseContactListFilters = (value?: string | null): ContactListFilter[] => {
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

export const normalizeContactListFilters = (filters: unknown[]): ContactListFilter[] => {
  const normalized = filters
    .map(parseContactListFilter)
    .filter((filter): filter is ContactListFilter => Boolean(filter));

  if (normalized.length === 0) {
    throw new Error("Add at least one valid filter to create a contact list.");
  }

  return normalized;
};

export const countContactListRecipients = async (
  organizationId: string,
  input: {
    filterMode: ContactListFilterMode;
    filters: ContactListFilter[];
  },
) => {
  if (input.filters.length === 0) {
    return 0;
  }

  return prisma.customer.count({
    where: buildContactListCustomerWhere(organizationId, input),
  });
};

export const getContactListAudienceRecipients = async (
  organizationId: string,
  input: {
    filterMode: ContactListFilterMode;
    filters: ContactListFilter[];
    take?: number;
  },
) => {
  if (input.filters.length === 0) {
    return [] satisfies ContactListAudienceRecipient[];
  }

  const customers = await prisma.customer.findMany({
    where: {
      ...buildContactListCustomerWhere(organizationId, input),
      user: {
        email: {
          not: "",
        },
      },
    },
    select: {
      id: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "asc",
      },
    ],
    ...(typeof input.take === "number" ? { take: input.take } : {}),
  });

  return customers.map((customer) => ({
    customerId: customer.id,
    email: customer.user.email,
    name: customer.user.name,
  }));
};

export const buildContactListCustomerWhere = (
  organizationId: string,
  input: {
    filterMode: ContactListFilterMode;
    filters: ContactListFilter[];
  },
) => {
  const conditions = input.filters.map(buildContactListCustomerCondition);

  return {
    orgId: organizationId,
    ...(input.filterMode === "ANY"
      ? { OR: conditions }
      : { AND: conditions }),
  };
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
    case "NO_SERVICES_USED":
      return {
        appointments: {
          none: {},
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
    case "NO_SERVICES_USED":
      return { type: "NO_SERVICES_USED" };
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

const isAppointmentStatus = (value: string): value is AppointmentStatusValue => {
  return APPOINTMENT_STATUS_VALUES.includes(value as AppointmentStatusValue);
};