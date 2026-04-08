"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters"),
  email: z.email("Please enter a valid email address"),
  cellPhone: z.string().min(10, "Please enter a valid phone number"),
  numberOfLocations: z.string().min(1, "Please select number of locations"),
  zipCode: z.string().min(5, "Please enter a valid zip code"),
  websiteUrl: z.union([z.url("Please enter a valid website URL"), z.literal("")]).optional(),
  demoDate: z.date({
    message: "Please select a demo date",
  }),
  demoTime: z.string().min(1, "Please select a demo time"),
  smsConsent: z.preprocess((value) => value === true || value === "true" || value === "on", z.boolean()).refine((value) => value, {
    message: "You must explicitly consent to receive SMS messages",
  }),
  emailConsent: z.preprocess((value) => value === true || value === "true" || value === "on", z.boolean()).refine((value) => value, {
    message: "You must explicitly consent to receive emails",
  }),
});

type FormData = z.infer<typeof formSchema>;

const locationOptions = ["1", "2-3", "4-5", "6-10", "11-20", "20+"];
const fieldLabelClassName =
  "text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-foreground/70";
const fieldControlClassName =
  "h-12 rounded-xl border-border bg-background px-4 text-sm shadow-none placeholder:text-muted-foreground/75 focus-visible:ring-1 focus-visible:ring-primary/35 focus-visible:ring-offset-0";

export function MedSpaBookingForm() {
  const searchParams = useSearchParams();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      businessName: "",
      email: "",
      cellPhone: "",
      numberOfLocations: locationOptions[0],
      zipCode: "",
      websiteUrl: "",
      demoDate: new Date(),
      demoTime: "",
      smsConsent: false,
      emailConsent: false,
    },
  });

  useEffect(() => {
    const prefilledEmail = searchParams.get("email");

    if (prefilledEmail && !form.getValues("email")) {
      form.setValue("email", prefilledEmail, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [form, searchParams]);

  const date = useWatch({ name: "demoDate", control: form.control });
  const { data: availableSlotsForDate } = useQuery(
    trpc.marketing.getAvailableSlots.queryOptions(
      {
        date: date,
      },
      {
        enabled: !!date,
      }
    )
  );

  const {
    mutate: createBooking,
    isPending: isSubmitting,
    isSuccess,
    isError,
  } = useMutation(
    trpc.marketing.createBookDemo.mutationOptions({
      onSuccess: () => {
        toast.success("Demo booked successfully!");
        form.reset({
          firstName: "",
          lastName: "",
          businessName: "",
          email: "",
          cellPhone: "",
          numberOfLocations: locationOptions[0],
          zipCode: "",
          websiteUrl: "",
          demoDate: new Date(),
          demoTime: "",
          smsConsent: false,
          emailConsent: false,
        });
      },
      onError: () => {
        toast.error("Demo booked unsuccessfully!");
      },
    })
  );

  const globalErrorMessages = [
    form.formState.errors.root?.message,
    ...Object.entries(form.formState.errors)
      .filter(([fieldName]) => fieldName !== "root")
      .map(([, error]) => error?.message),
  ].filter((message, index, messages): message is string => {
    return typeof message === "string" && messages.indexOf(message) === index;
  });

  const onSubmit = async (data: FormData) => {
    createBooking({
      firstName: data.firstName,
      lastName: data.lastName,
      businessName: data.businessName,
      email: data.email,
      cellPhone: data.cellPhone,
      numberOfLocations: data.numberOfLocations,
      zipCode: data.zipCode,
      websiteUrl: data.websiteUrl,
      demoTime: new Date(data.demoTime),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  return (
    <div className="mx-auto w-full max-w-[29rem] rounded-[2rem] border border-border bg-card/95 p-6 shadow-sm sm:max-w-[46rem] sm:p-8 lg:p-9">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-7">
          {globalErrorMessages.length > 0 && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"
            >
              <p className="font-medium">Please fix the following before submitting:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {globalErrorMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel className={fieldLabelClassName}>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter first name" className={fieldControlClassName} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel className={fieldLabelClassName}>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter last name" className={fieldControlClassName} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="businessName"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel className={fieldLabelClassName}>Business Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Serenity Wellness Spa"
                    className={fieldControlClassName}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel className={fieldLabelClassName}>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@business.com"
                      className={fieldControlClassName}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cellPhone"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel className={fieldLabelClassName}>Cell Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 000-0000" className={fieldControlClassName} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="numberOfLocations"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel className={fieldLabelClassName}>Number of Locations</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className={cn(fieldControlClassName, "w-full justify-between")}>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locationOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel className={fieldLabelClassName}>Zip Code</FormLabel>
                  <FormControl>
                    <Input placeholder="12345" className={fieldControlClassName} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="websiteUrl"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel className={fieldLabelClassName}>Website URL (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://www.yourbusiness.com"
                    className={fieldControlClassName}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-5 border-t border-border/70 pt-5 md:grid-cols-2">
              <FormField
                control={form.control}
              name="demoDate"
                render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel className={fieldLabelClassName}>Demo Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            fieldControlClassName,
                            "h-12 justify-between font-normal text-foreground hover:bg-background",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "MM/dd/yyyy") : <span>mm/dd/yyyy</span>}
                          <CalendarIcon className="h-4 w-4 opacity-60" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(selectedDate) =>
                          selectedDate < new Date() || selectedDate < new Date("1900-01-01")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
              name="demoTime"
                render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel className={fieldLabelClassName}>Preferred Time</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className={cn(fieldControlClassName, "h-12 w-full justify-between")}>
                        <SelectValue placeholder="Select a time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {!!availableSlotsForDate?.length &&
                        availableSlotsForDate.map((time) => (
                          <SelectItem key={time.time} value={time.time}>
                            {new Date(time.time).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </SelectItem>
                        ))}
                      {!availableSlotsForDate?.length && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No times available for this day
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

          <div className="space-y-4 rounded-xl border border-border/70 bg-muted/25 p-4 sm:p-5">
            <div className="space-y-1">
              <p className={fieldLabelClassName}>Communication Preferences</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Please provide explicit consent so we can contact you about your demo,
                account setup, onboarding, and support.
              </p>
            </div>



          <FormField
            control={form.control}
            name="smsConsent"
            render={({ field }) => (
              <FormItem className="rounded-xl border border-border/70 bg-background p-4">
                <div className="flex items-start gap-3">
                  <FormControl>
                    <input
                      ref={field.ref}
                      name={field.name}
                      type="checkbox"
                      checked={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="text-sm font-medium leading-6 text-foreground">
                      Non-marketing text message consent
                    </FormLabel>
                    <FormDescription className="text-sm leading-6 text-muted-foreground">
                      I consent to receive non-marketing text messages from Zenapt
                      LLC about my demo updates, appointment reminders, and related
                      service notifications. Message &amp; data rates may apply.
                    </FormDescription>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emailConsent"
            render={({ field }) => (
              <FormItem className="rounded-xl border border-border/70 bg-background p-4">
                <div className="flex items-start gap-3">
                  <FormControl>
                    <input
                      ref={field.ref}
                      name={field.name}
                      type="checkbox"
                      checked={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="text-sm font-medium leading-6 text-foreground">
                      Email consent
                    </FormLabel>
                    <FormDescription className="text-sm leading-6 text-muted-foreground">
                      I consent to receive emails from Zenapt LLC about my demo,
                      onboarding, account setup, and related support updates.
                    </FormDescription>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4 pt-1">
            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-sm font-semibold uppercase tracking-[0.16em]"
              isLoading={isSubmitting}
            >
              Schedule Your Demo
            </Button>

            <div className="flex items-center justify-center gap-2 text-[0.62rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary/80" />
              <span>Secure encrypted transmission</span>
            </div>

            {isSuccess && (
              <p className="text-center text-sm text-green-600">Demo booked successfully!</p>
            )}
            {isError && (
              <p className="text-center text-sm text-red-600">
                There was an error booking your demo. Please try again.
              </p>
            )}

            <p className="text-center text-xs leading-6 text-muted-foreground">
              By booking a demo, you agree to our{" "}
              <Link href="/terms-of-service" className="text-primary transition hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" className="text-primary transition hover:underline">
                Privacy Policy
              </Link>
              . We&apos;ll contact you to confirm your demo appointment.
            </p>
          </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
