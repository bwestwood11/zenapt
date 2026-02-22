import prisma from "../../../prisma";
import { AppointmentBookedEmail } from "transactional/emails";
import { resend } from "../resend";

const resolveRecipient = (email: string) => {
  return process.env.NODE_ENV === "development"
    ? `delivered+${encodeURIComponent(email)}@resend.dev`
    : email;
};

export const sendAppointmentBookedEmail = async (appointmentId: string) => {
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
    return;
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

  const EmailHtml = AppointmentBookedEmail({
    customerName: appointment.customer.user.name,
    organizationName: appointment.location.organization.name,
    locationName: appointment.location.name,
    serviceNames: appointment.service.map((item) => item.serviceTerms.name),
    addOnNames: appointment.addOns.map((item) => item.name),
    startTime,
    endTime,
    timeZone: appointment.location.timeZone ?? undefined,
    supportEmail:
      appointment.location.email ||
      process.env.FROM_EMAIL ||
      "support@zenapt.com",
  });

  await resend.emails.send({
    from: process.env.FROM_EMAIL || "support@zenapt.com",
    to: resolveRecipient(customerEmail),
    subject: `Appointment booked at ${appointment.location.name}`,
    react: EmailHtml,
  });
};
