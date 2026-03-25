import prisma from "../../../prisma";
import {
  AppointmentBookedEmail,
  AppointmentRescheduledEmail,
} from "transactional/emails";
import { organizationEmailService } from "./organization-email";
import { render } from "@react-email/render";

const getAppointmentEmailContext = async (appointmentId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      customer: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      location: {
        select: {
          name: true,
          timeZone: true,
          email: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      service: {
        select: {
          serviceTerms: {
            select: {
              name: true,
            },
          },
        },
      },
      addOns: {
        select: {
          name: true,
        },
      },
    },
  });

  const customerEmail = appointment?.customer?.user?.email;
  if (!appointment || !customerEmail) {
    return null;
  }

  const timeZone = appointment.location.timeZone ?? "UTC";
  const startTime = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  }).format(appointment.startTime);
  const endTime = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  }).format(appointment.endTime);

  return {
    appointment,
    customerEmail,
    startTime,
    endTime,
    supportEmail:
      appointment.location.email ||
      process.env.FROM_EMAIL ||
      "support@zenapt.studio",
  };
};

export const sendAppointmentBookedEmail = async (appointmentId: string) => {
  const context = await getAppointmentEmailContext(appointmentId);
  if (!context) {
    return;
  }

  const { appointment, customerEmail, startTime, endTime, supportEmail } =
    context;

  const EmailHtml = AppointmentBookedEmail({
    customerName: appointment.customer.user.name,
    organizationName: appointment.location.organization.name,
    locationName: appointment.location.name,
    serviceNames: appointment.service.map((item) => item.serviceTerms.name),
    addOnNames: appointment.addOns.map((item) => item.name),
    startTime,
    endTime,
    timeZone: appointment.location.timeZone ?? undefined,
    supportEmail,
  });

  const html = await render(EmailHtml)

  await organizationEmailService.send({
    organizationId: appointment.location.organization.id,
    to: customerEmail,
    subject: `Appointment booked at ${appointment.location.name}`,
    html: html,
  });
};

export const sendAppointmentRescheduledEmail = async (
  appointmentId: string,
) => {
  const context = await getAppointmentEmailContext(appointmentId);
  if (!context) {
    return;
  }

  const { appointment, customerEmail, startTime, endTime, supportEmail } =
    context;

  const EmailHtml = AppointmentRescheduledEmail({
    customerName: appointment.customer.user.name,
    organizationName: appointment.location.organization.name,
    locationName: appointment.location.name,
    serviceNames: appointment.service.map((item) => item.serviceTerms.name),
    addOnNames: appointment.addOns.map((item) => item.name),
    startTime,
    endTime,
    timeZone: appointment.location.timeZone ?? undefined,
    supportEmail,
  });

  await organizationEmailService.send({
    organizationId: appointment.location.organization.id,
    to: customerEmail,
    subject: `Appointment rescheduled at ${appointment.location.name}`,
    react: EmailHtml,
  });
};
