"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
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
  email: z.string().email("Please enter a valid email address"),
  cellPhone: z.string().min(10, "Please enter a valid phone number"),
  numberOfLocations: z.string().min(1, "Please select number of locations"),
  zipCode: z.string().min(5, "Please enter a valid zip code"),
  websiteUrl: z
    .string()
    .url("Please enter a valid website URL")
    .optional()
    .or(z.literal("")),
  demoDate: z.date({
    message: "Please select a demo date",
  }),
  demoTime: z.string().min(1, "Please select a demo time"),
});

type FormData = z.infer<typeof formSchema>;

const locationOptions = ["1", "2-3", "4-5", "6-10", "11-20", "20+"];
export function MedSpaBookingForm() {
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
    },
  });

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
        form.reset();
      },
      onError: () => {
        toast.error("Demo booked unsuccessfully!");
      },
    })
  );

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
    <Card className="w-full shadow max-w-xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-foreground">
          Schedule Your Demo
        </CardTitle>
        <CardDescription className="text-foreground/70">
          Fill out the form below to book a personalized demo of our booking
          management software
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Business Information */}
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your med spa name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="gap-2 grid">
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your@email.com"
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
                  <FormItem>
                    <FormLabel>Cell Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <FormField
                control={form.control}
                name="numberOfLocations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Locations</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            className="w-full"
                            placeholder="Select"
                          />
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
                  <FormItem>
                    <FormLabel>Zip Code</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
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
                <FormItem>
                  <FormLabel>Website URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://yourmedspa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Demo Scheduling */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Schedule Your Demo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="demoDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col w-full">
                      <FormLabel>Demo Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
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
                    <FormItem>
                      <FormLabel>Demo Time</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select time" />
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
                            <p>No Appointments For the day</p>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-white py-3 text-lg font-semibold flex items-center justify-center"
              isLoading={isSubmitting}
            >
              Book My Demo
            </Button>
            {isSuccess && (
              <p className="text-sm text-green-600 text-center">
                Demo booked successfully!
              </p>
            )}
            {isError && (
              <p className="text-sm text-red-600 text-center">
                There was an error booking your demo. Please try again.
              </p>
            )}
            <p className="text-sm text-gray-500 text-center">
              By booking a demo, you agree to our terms of service and privacy
              policy. We&apos;ll contact you to confirm your demo appointment.
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
