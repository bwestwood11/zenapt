"use client";

import { useState, useTransition, useMemo } from "react";
import { useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { CheckCircle, LocationEdit, Mail, Phone } from "lucide-react";
import {
  Country,
  State,
  City,
  type ICity,
  type IState,
} from "country-state-city";

import { VirtualizedCombobox } from "../ui/virtualizedCommand";
import { PhoneInput } from "../ui/phone-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, "Location name must be at least 2 characters"),
  address: z.string().min(5, "Please enter a valid address"),
  city: z.string().min(2, "City name must be at least 2 characters"),
  state: z.string().min(2, "Please select a state"),
  country: z.string().min(2, "Please select a country"),
  zipCode: z.string().min(5, "Please enter a valid zip code"),
  timeZone: z.string().min(1, "Time zone is required"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z
    .string()
    .refine((p) => isValidPhoneNumber(p), { message: "Invalid Phone Number" }),
});

type FormData = z.infer<typeof formSchema>;

/**
 * Subcomponent for Country/State/City fields
 */
function LocationFields() {
  const form = useFormContext<FormData>();
  const [cities, setCities] = useState<ICity[]>([]);
  const [states, setStates] = useState<IState[]>([]);
  const [, startTransition] = useTransition();

  const countries = useMemo(() => Country.getAllCountries(), []);

  const onCountryChange = (country: string) => {
    form.setValue("state", "");
    form.setValue("city", "");

    if (!country) {
      setStates([]);
      setCities([]);
      return;
    }

    startTransition(() => {
      const stateList = State.getStatesOfCountry(country);
      setStates(stateList || []);
    });
  };

  const onStateChange = (state: string) => {
    form.setValue("city", "");
    if (!state) {
      setCities([]);
      return;
    }

    startTransition(() => {
      const cityList = City.getCitiesOfState(form.getValues("country"), state);
      setCities(cityList || []);
    });
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <FormField
        control={form.control}
        name="country"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Country</FormLabel>
            <FormControl>
              <VirtualizedCombobox
                options={countries.map((c) => ({
                  value: c.isoCode,
                  label: c.name,
                }))}
                value={field.value}
                onChange={(val) => {
                  onCountryChange(val);
                  field.onChange(val);
                }}
                height="400px"
                searchPlaceholder="Search countries..."
                placeholder="Select country"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="state"
        render={({ field }) => (
          <FormItem>
            <FormLabel>State/Province</FormLabel>
            <FormControl>
              <VirtualizedCombobox
                options={states.map((s) => ({
                  value: s.isoCode,
                  label: s.name,
                }))}
                value={field.value}
                onChange={(val) => {
                  onStateChange(val);
                  field.onChange(val);
                }}
                height="400px"
                searchPlaceholder="Search states..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel>City</FormLabel>
            <FormControl>
              <VirtualizedCombobox
                options={cities.map((c) => ({
                  value: c.name,
                  label: c.name,
                }))}
                value={field.value}
                onChange={field.onChange}
                height="400px"
                searchPlaceholder="Search cities..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

export default function NewLocationForm() {


  const timezones = useMemo(() => {
    const now = new Date();

    return Intl.supportedValuesOf("timeZone").map((tz) => {
      // Format the current time in that timezone with offset
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "shortOffset",
      });

      // Extract offset string (e.g., "GMT+5:30")
      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find((p) => p.type === "timeZoneName");
      const offset = offsetPart ? offsetPart.value.replace("GMT", "UTC") : "";

      return {
        value: tz,
        label: `${tz.replace(/_/g, " ")} (${offset})`,
        offset,
      };
    });
  }, []);

  const { mutate, isSuccess, isPending: isSubmitting  } = useMutation(
    trpc.location.createLocation.mutationOptions({
      onSuccess: () => {
        form.reset();
        toast.success("Location created successfully!");
      },
      onError: () => {
        toast.error("Failed to create location. Please try again.");
      },
    })
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      country: "",
      zipCode: "",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      email: "",
      phoneNumber: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    console.log("Submitting", data);
    mutate(data);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen container mx-auto p-10 bg-background flex items-center justify-center">
        <div className="w-full max-w-md text-center space-y-4 p-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-semibold text-foreground">
            Location Created!
          </h2>
          <p className="text-muted-foreground">
            Your new med spa location has been successfully added.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Name</FormLabel>
              <FormControl>
                <Input placeholder="Downtown Med Spa" {...field} />
              </FormControl>
              <FormDescription>
                The display name for this location (shown to customers)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Street Address</FormLabel>
              <FormControl>
                <Input {...field} placeholder="123 Main Street, Suite 100" />
              </FormControl>
              <FormDescription>
                Complete street address including suite/unit if applicable
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location Selector */}
        <LocationFields />

        <div className="flex md:items-center items-start gap-4 w-full">
          <FormField
            control={form.control}
            name="zipCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zip/Postal Code</FormLabel>
                <FormControl>
                  <Input placeholder="10001" {...field} />
                </FormControl>
                <FormDescription>Used for location mapping</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="timeZone"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Time Zone</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <VirtualizedCombobox
                      options={timezones}
                      value={field.value}
                      onChange={(val) => field.onChange(val)}
                      searchPlaceholder="Search time zones..."
                      placeholder="Select time zone"
                      classNames={{ popoverTrigger: "flex-1" }}
                    />
                    <Button
                      className="cursor-pointer max-md:hidden"
                      type="button"
                      onClick={() => {
                        const timezone =
                          Intl.DateTimeFormat().resolvedOptions().timeZone;
                        form.setValue("timeZone", timezone);
                      }}
                    >
                      <LocationEdit className="mr-2 h-4 w-4" />
                      Get My TimeZone
                    </Button>
                  </div>
                </FormControl>
                <FormDescription>
                  Will be used for appointment scheduling as we need to know the
                  time of day
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                <Mail className="h-4 w-4 mr-1" /> Email Address
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="downtown@medspa.com"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Used for customer communications and queries related to this
                location
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                <Phone className="h-4 w-4 mr-1" /> Phone Number
              </FormLabel>
              <FormControl>
                <PhoneInput
                  defaultCountry="US"
                  international
                  value={field.value}
                  onChange={(val) => field.onChange(val || "")}
                  placeholder="Enter phone number"
                />
              </FormControl>
              <FormDescription>Primary contact for customers</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Creating Location..." : "Create Location"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isSubmitting}
            className="sm:w-auto"
          >
            Clear Form
          </Button>
        </div>
      </form>
    </Form>
  );
}
