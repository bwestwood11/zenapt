"use client";

import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  CreditCard,
  History,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, getInitials } from "@/lib/utils";
import type { AppRouter } from "../../../../server/src/routers";
import { trpc } from "@/utils/trpc";

type AppointmentDetailsPageClientProps = {
  slug: string;
  locationId: string;
  appointmentId: string;
};

type AppointmentDetails = inferRouterOutputs<AppRouter>["appointment"]["getAppointmentDetails"];
type PaymentHistoryEntry = AppointmentDetails["paymentHistory"][number];
type TipDetailEntry = AppointmentDetails["tipDetails"][number];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
};

const formatDateTime = (value: Date, timeZone?: string | null) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timeZone ?? "UTC",
  }).format(new Date(value));
};

const formatLongDate = (value: Date, timeZone?: string | null) => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timeZone ?? "UTC",
  }).format(new Date(value));
};

const formatTime = (value: Date, timeZone?: string | null) => {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timeZone ?? "UTC",
  }).format(new Date(value));
};

const formatDuration = (minutes: number) =>
  `${minutes} min${minutes === 1 ? "" : "s"}`;

const formatAppointmentCode = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

const formatPaymentType = (paymentType: string) =>
  paymentType
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());

const formatPaymentMethod = (paymentMethod: string | undefined | null) =>
  !paymentMethod ? "No payment method" :
  paymentMethod
    .replaceAll("_", " ")
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());

const getPaymentEntryLabel = (
  kind: "APPOINTMENT_PAYMENT" | "TIP_CHARGE",
  paymentType: string,
) => {
  if (kind === "TIP_CHARGE") {
    return "Tip Charge";
  }

  if (paymentType === "BALANCE") {
    return "Remaining Balance";
  }

  if (paymentType === "CANCELLATION") {
    return "Cancellation / No-Show Charge";
  }

  return formatPaymentType(paymentType);
};

const formatStatus = (status: string) =>
  status
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());

const getStatusBadgeClassName = (status: string) => {
  switch (status) {
    case "COMPLETED":
    case "PAID":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "CANCELED":
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
    case "RESCHEDULED":
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
    case "NO_SHOW":
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
  }
};

type SummaryMetricProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
};

function SummaryMetric({ icon: Icon, label, value, helper }: Readonly<SummaryMetricProps>) {
  return (
    <div className="rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>
      {helper ? <p className="mt-1 text-sm text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

type DetailCardProps = {
  label: string;
  value: string;
  hint?: string;
};

function DetailCard({ label, value, hint }: Readonly<DetailCardProps>) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground sm:text-base">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

type PaymentHistoryCardProps = {
  paymentHistory: AppointmentDetails["paymentHistory"];
  locationTimeZone: string;
  paymentHistoryTotal: number;
  downpaymentTotal: number;
  balanceTotal: number;
  tipTotal: number;
};

function PaymentHistoryCard({
  paymentHistory,
  locationTimeZone,
  paymentHistoryTotal,
  downpaymentTotal,
  balanceTotal,
  tipTotal,
}: Readonly<PaymentHistoryCardProps>) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Payment History
        </CardTitle>
        <CardDescription>
          Timeline of charges recorded against this appointment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Recorded payments
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {formatCurrency(paymentHistoryTotal)}
              </p>
            </div>
            <Badge variant="outline">{paymentHistory.length} entries</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {downpaymentTotal > 0 ? (
              <Badge variant="secondary">Downpayment {formatCurrency(downpaymentTotal)}</Badge>
            ) : null}
            {balanceTotal > 0 ? (
              <Badge variant="secondary">Balance {formatCurrency(balanceTotal)}</Badge>
            ) : null}
            {tipTotal > 0 ? (
              <Badge variant="secondary">Tips {formatCurrency(tipTotal)}</Badge>
            ) : null}
          </div>
        </div>

        {paymentHistory.length > 0 ? (
          <div className="space-y-3">
            {paymentHistory.map((entry) => (
              <PaymentHistoryEntryCard
                key={`${entry.kind}-${entry.id}`}
                entry={entry}
                locationTimeZone={locationTimeZone}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-muted/10 p-6 text-sm text-muted-foreground">
            No payment activity has been recorded for this appointment yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentHistoryEntryCard({
  entry,
  locationTimeZone,
}: Readonly<{
  entry: PaymentHistoryEntry;
  locationTimeZone: string;
}>) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">
              {getPaymentEntryLabel(entry.kind, entry.paymentType)}
            </p>
            {entry.kind === "APPOINTMENT_PAYMENT" && entry.paymentType === "DOWNPAYMENT" ? (
              <Badge variant="secondary">Deposit</Badge>
            ) : null}
            <Badge
              variant="outline"
              className={cn("border", getStatusBadgeClassName(entry.status))}
            >
              {formatStatus(entry.status)}
            </Badge>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{formatDateTime(entry.createdAt, locationTimeZone)}</p>
            <p>Method: {formatPaymentMethod(entry.paymentMethod)}</p>
            {entry.transactionId ? (
              <p className="break-all text-xs">Transaction: {entry.transactionId}</p>
            ) : (
              <p className="text-xs">Transaction pending</p>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold text-foreground">{formatCurrency(entry.amount)}</p>
          <p className="text-xs text-muted-foreground">
            Updated {formatDateTime(entry.updatedAt, locationTimeZone)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({
  appointment,
  locationTimeZone,
  totalDuration,
}: Readonly<{
  appointment: AppointmentDetails;
  locationTimeZone: string;
  totalDuration: number;
}>) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Schedule
        </CardTitle>
        <CardDescription>
          Timing, preparation, and activity metadata for this appointment.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DetailCard
          label="Start"
          value={formatDateTime(appointment.startTime, locationTimeZone)}
          hint={formatLongDate(appointment.startTime, locationTimeZone)}
        />
        <DetailCard
          label="End"
          value={formatDateTime(appointment.endTime, locationTimeZone)}
          hint={`${formatTime(appointment.startTime, locationTimeZone)} - ${formatTime(appointment.endTime, locationTimeZone)}`}
        />
        <DetailCard label="Timezone" value={locationTimeZone} hint={appointment.location.name} />
        <DetailCard
          label="Buffer time"
          value={formatDuration(appointment.bufferTime)}
          hint="Extra time after the booked service"
        />
        <DetailCard
          label="Prep time"
          value={formatDuration(appointment.prepTime)}
          hint="Time reserved before the appointment"
        />
        <DetailCard
          label="Booked duration"
          value={formatDuration(totalDuration)}
          hint={`${appointment.service.length} service${appointment.service.length === 1 ? "" : "s"}`}
        />
      </CardContent>
    </Card>
  );
}

function ServicesAndAddOnsCard({
  appointment,
}: Readonly<{
  appointment: AppointmentDetails;
}>) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          Services & Add-ons
        </CardTitle>
        <CardDescription>
          Everything included in this appointment booking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {appointment.service.map((service, index) => (
            <div
              key={service.id}
              className="rounded-2xl border bg-background/70 p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
                      Service {index + 1}
                    </Badge>
                    <p className="text-base font-semibold text-foreground">
                      {service.serviceTerms.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span>{formatDuration(service.duration)}</span>
                    <span>•</span>
                    <span>{service.locationEmployee?.user?.name ?? "No staff assigned"}</span>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 px-3 py-2 text-right">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Price
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {formatCurrency(service.price)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Add-ons
            </h3>
            <Badge variant="outline">{appointment.addOns.length}</Badge>
          </div>

          {appointment.addOns.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {appointment.addOns.map((addOn) => (
                <div
                  key={addOn.id}
                  className="flex items-center justify-between rounded-2xl border bg-muted/20 p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{addOn.name}</p>
                    <p className="text-sm text-muted-foreground">Attached to this booking</p>
                  </div>
                  <Badge variant="outline">{formatCurrency(addOn.basePrice)}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed bg-muted/10 p-6 text-sm text-muted-foreground">
              No add-ons were selected for this appointment.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BillingSummaryCard({
  appointment,
  finalAmount,
  discountAmount,
  hasDiscount,
  downpaymentTotal,
  balanceTotal,
  tipTotal,
  paymentHistoryTotal,
}: Readonly<{
  appointment: AppointmentDetails;
  finalAmount: number;
  discountAmount: number;
  hasDiscount: boolean;
  downpaymentTotal: number;
  balanceTotal: number;
  tipTotal: number;
  paymentHistoryTotal: number;
}>) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          Billing Summary
        </CardTitle>
        <CardDescription>Payment breakdown and card details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl border bg-muted/20 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Final Amount
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {formatCurrency(finalAmount)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("border", getStatusBadgeClassName(appointment.paymentStatus))}
            >
              {formatStatus(appointment.paymentStatus)}
            </Badge>
            {hasDiscount ? (
              <Badge variant="secondary">
                {appointment.discountPercentageApplied
                  ? `${appointment.discountPercentageApplied}% off`
                  : `Saved ${formatCurrency(discountAmount)}`}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground">{formatCurrency(appointment.price)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-medium text-foreground">-{formatCurrency(discountAmount)}</span>
          </div>
          {downpaymentTotal > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Downpayment collected</span>
              <span className="font-medium text-foreground">{formatCurrency(downpaymentTotal)}</span>
            </div>
          ) : null}
          {balanceTotal > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Balance collected</span>
              <span className="font-medium text-foreground">{formatCurrency(balanceTotal)}</span>
            </div>
          ) : null}
          {tipTotal > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Tips collected</span>
              <span className="font-medium text-foreground">{formatCurrency(tipTotal)}</span>
            </div>
          ) : null}
          <Separator />
          <div className="flex items-center justify-between gap-3 text-base">
            <span className="font-semibold text-foreground">Recorded total</span>
            <span className="font-semibold text-foreground">{formatCurrency(paymentHistoryTotal)}</span>
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Card on file
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {appointment.paymentMethodLast4
              ? `•••• ${appointment.paymentMethodLast4}`
              : "No card on file"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function TipDetailsCard({
  tipDetails,
  locationTimeZone,
}: Readonly<{
  tipDetails: AppointmentDetails["tipDetails"];
  locationTimeZone: string;
}>) {
  const totalTips = tipDetails.reduce((sum, tip) => sum + tip.amount, 0);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          Tips
        </CardTitle>
        <CardDescription>
          Tip details, recipients, and payment status for this appointment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Total tips
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {formatCurrency(totalTips)}
              </p>
            </div>
            <Badge variant="outline">{tipDetails.length} tip entries</Badge>
          </div>
        </div>

        {tipDetails.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {tipDetails.map((tip) => (
              <TipDetailsEntryCard
                key={tip.id}
                tip={tip}
                locationTimeZone={locationTimeZone}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-muted/10 p-6 text-sm text-muted-foreground">
            No tips have been recorded for this appointment.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TipDetailsEntryCard({
  tip,
  locationTimeZone,
}: Readonly<{
  tip: TipDetailEntry;
  locationTimeZone: string;
}>) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-foreground">{formatCurrency(tip.amount)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Added {formatDateTime(tip.createdAt, locationTimeZone)}
          </p>
        </div>
        <Badge variant="outline" className={cn("border", getStatusBadgeClassName(tip.status))}>
          {formatStatus(tip.status)}
        </Badge>
      </div>

      <Separator className="my-4" />

      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Recipient
          </p>
          <p className="mt-1 font-medium text-foreground">
            {tip.recipient?.name ?? "Unassigned recipient"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Method
          </p>
          <p className="mt-1 font-medium text-foreground">
            {formatPaymentMethod(tip.paymentMethod)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Transaction
          </p>
          <p className="mt-1 break-all text-foreground">
            {tip.transactionId ?? "Transaction pending"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ActivityCard({
  appointment,
  locationTimeZone,
}: Readonly<{
  appointment: AppointmentDetails;
  locationTimeZone: string;
}>) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Activity
        </CardTitle>
        <CardDescription>Created and updated timestamps for this booking.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DetailCard label="Created" value={formatDateTime(appointment.createdAt, locationTimeZone)} />
        <DetailCard label="Last updated" value={formatDateTime(appointment.updatedAt, locationTimeZone)} />
        <DetailCard label="Appointment ID" value={appointment.id} />
      </CardContent>
    </Card>
  );
}

function AppointmentDetailsContent({
  appointment,
  slug,
}: Readonly<{
  appointment: AppointmentDetails;
  slug: string;
}>) {
  const discountAmount = Math.max(0, appointment.discountAmountApplied ?? 0);
  const finalAmount = Math.max(0, appointment.price - discountAmount);
  const totalDuration = appointment.service.reduce(
    (sum, service) => sum + service.duration,
    0,
  );
  const assignedStaff = Array.from(
    new Set(
      appointment.service
        .map((service) => service.locationEmployee?.user?.name)
        .filter((name): name is string => Boolean(name)),
    ),
  );
  const customerName = appointment.customer.user?.name ?? "Guest Customer";
  const customerEmail = appointment.customer.user?.email ?? "No email on file";
  const customerPhone = appointment.customer.phoneNumber ?? "No phone number on file";
  const locationTimeZone = appointment.location.timeZone ?? "UTC";
  const hasDiscount = discountAmount > 0;
  const paymentHistoryTotal = appointment.paymentHistory.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );
  const downpaymentTotal = appointment.paymentHistory
    .filter(
      (entry) => entry.kind === "APPOINTMENT_PAYMENT" && entry.paymentType === "DOWNPAYMENT",
    )
    .reduce((sum, entry) => sum + entry.amount, 0);
  const balanceTotal = appointment.paymentHistory
    .filter(
      (entry) => entry.kind === "APPOINTMENT_PAYMENT" && entry.paymentType === "BALANCE",
    )
    .reduce((sum, entry) => sum + entry.amount, 0);
  const tipTotal = appointment.paymentHistory
    .filter((entry) => entry.kind === "TIP_CHARGE")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const customerProfileHref = `/dashboard/l/${slug}/customers/${appointment.customer.id}`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Appointments</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Appointment Details</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A complete view of service timing, customer details, and billing for{" "}
            {formatAppointmentCode(appointment.id)}.
          </p>
        </div>

        <Link href={`/dashboard/l/${slug}/appointments`} className={buttonVariants({variant:"outline"})}>Back to Appointments</Link>
          
      </div>

      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/10 via-background to-background shadow-sm">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("border", getStatusBadgeClassName(appointment.status))}
              >
                {formatStatus(appointment.status)}
              </Badge>
              <Badge
                variant="outline"
                className={cn("border", getStatusBadgeClassName(appointment.paymentStatus))}
              >
                Payment {formatStatus(appointment.paymentStatus)}
              </Badge>
              <Badge variant="outline" className="border-border/70 bg-background/80">
                {appointment.location.name}
              </Badge>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {formatAppointmentCode(appointment.id)}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {formatLongDate(appointment.startTime, locationTimeZone)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatTime(appointment.startTime, locationTimeZone)} -{" "}
                  {formatTime(appointment.endTime, locationTimeZone)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {locationTimeZone}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryMetric
                icon={Receipt}
                label="Final amount"
                value={formatCurrency(finalAmount)}
                helper={hasDiscount ? `Saved ${formatCurrency(discountAmount)}` : "No discount applied"}
              />
              <SummaryMetric
                icon={Sparkles}
                label="Services"
                value={`${appointment.service.length}`}
                helper={`${formatDuration(totalDuration)} total booked`}
              />
              <SummaryMetric
                icon={User}
                label="Assigned staff"
                value={`${assignedStaff.length || 0}`}
                helper={assignedStaff[0] ?? "Unassigned"}
              />
              <SummaryMetric
                icon={Clock}
                label="Add-ons"
                value={`${appointment.addOns.length}`}
                helper={appointment.addOns.length > 0 ? "Additional items attached" : "No add-ons selected"}
              />
            </div>
          </div>

          <div className="rounded-3xl border bg-background/85 p-5 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">Customer snapshot</p>
                <Link href={customerProfileHref} className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 rounded-full px-3" })}>
                  View profile
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Avatar className="size-14 border bg-background shadow-sm">
                <AvatarFallback className="text-sm font-semibold">
                  {customerName === "Guest Customer" ? "GC" : getInitials(customerName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-foreground">{customerName}</p>
                <p className="text-sm text-muted-foreground">Customer ID: {appointment.customer.id}</p>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Email
                  </p>
                  <p className="truncate font-medium text-foreground">{customerEmail}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Phone
                  </p>
                  <p className="font-medium text-foreground">{customerPhone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Location
                  </p>
                  <p className="font-medium text-foreground">{appointment.location.name}</p>
                  <p className="text-xs text-muted-foreground">Timezone: {locationTimeZone}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto min-w-max gap-1 rounded-2xl p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="services">
              Services
              <Badge variant="secondary" className="ml-1">
                {appointment.service.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="tips">
              Tips
              <Badge variant="secondary" className="ml-1">
                {appointment.tipDetails.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <ScheduleCard
            appointment={appointment}
            locationTimeZone={locationTimeZone}
            totalDuration={totalDuration}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <BillingSummaryCard
              appointment={appointment}
              finalAmount={finalAmount}
              discountAmount={discountAmount}
              hasDiscount={hasDiscount}
              downpaymentTotal={downpaymentTotal}
              balanceTotal={balanceTotal}
              tipTotal={tipTotal}
              paymentHistoryTotal={paymentHistoryTotal}
            />
            <ActivityCard appointment={appointment} locationTimeZone={locationTimeZone} />
          </div>
        </TabsContent>

        <TabsContent value="services">
          <ServicesAndAddOnsCard appointment={appointment} />
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <BillingSummaryCard
              appointment={appointment}
              finalAmount={finalAmount}
              discountAmount={discountAmount}
              hasDiscount={hasDiscount}
              downpaymentTotal={downpaymentTotal}
              balanceTotal={balanceTotal}
              tipTotal={tipTotal}
              paymentHistoryTotal={paymentHistoryTotal}
            />
            <PaymentHistoryCard
              paymentHistory={appointment.paymentHistory}
              locationTimeZone={locationTimeZone}
              paymentHistoryTotal={paymentHistoryTotal}
              downpaymentTotal={downpaymentTotal}
              balanceTotal={balanceTotal}
              tipTotal={tipTotal}
            />
          </div>
        </TabsContent>

        <TabsContent value="tips">
          <TipDetailsCard
            tipDetails={appointment.tipDetails}
            locationTimeZone={locationTimeZone}
          />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityCard appointment={appointment} locationTimeZone={locationTimeZone} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AppointmentDetailsPageClient({
  slug,
  locationId,
  appointmentId,
}: Readonly<AppointmentDetailsPageClientProps>) {
  const {
    data: appointment,
    error,
    isError,
    isLoading,
  } = useQuery(
    trpc.appointment.getAppointmentDetails.queryOptions({
      locationId,
      appointmentId,
    }),
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-44" />
        </div>

        <Card className="overflow-hidden border-none shadow-sm">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.7fr_1fr]">
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-12 w-80" />
              <Skeleton className="h-5 w-full max-w-2xl" />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={`hero-stat-${index}`} className="h-28 w-full rounded-2xl" />
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border p-5">
              <Skeleton className="h-5 w-32" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <Skeleton className="h-px w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="space-y-6">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <Card className="border-red-200 shadow-sm dark:border-red-900">
          <CardHeader>
            <CardTitle>Unable to load appointment</CardTitle>
            <CardDescription>
              {error?.message ?? "Something went wrong while loading appointment details."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
               <Link href={`/dashboard/l/${slug}/appointments`} className={buttonVariants({variant:"outline"})}>Back to Appointments</Link>
          
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Appointment not found</CardTitle>
            <CardDescription>
              The requested appointment is unavailable for this location.
            </CardDescription>
          </CardHeader>
          <CardContent>
              <Link href={`/dashboard/l/${slug}/appointments`} className={buttonVariants({variant:"outline"})}>Back to Appointments</Link>
          
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AppointmentDetailsContent appointment={appointment} slug={slug} />;
}
