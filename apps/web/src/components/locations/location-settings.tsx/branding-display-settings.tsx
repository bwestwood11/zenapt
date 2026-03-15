"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Car, Info, MapPin, Palette, Upload, Wifi } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

import { LogoDialog } from "@/components/business-settings/logo-modal";
import { base64ToFile } from "@/components/manage-account/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/utils/trpc";
import { getFileChecksum } from "../../../../../server/src/lib/s3/utils";

const logoSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value.length === 0 || value.startsWith("data:") || /^https?:\/\//.test(value),
    { message: "Enter a valid image URL" },
  )
  .optional()
  .nullable();

const brandingSchema = z.object({
  logo: logoSchema,
  wifiNetworkName: z.string().trim().max(100).optional(),
  wifiPassword: z.string().trim().max(100).optional(),
  parkingInstructions: z.string().trim().max(500).optional(),
  arrivalNotes: z.string().trim().max(500).optional(),
  mapLink: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value.length === 0 || /^https?:\/\//.test(value), {
      message: "Enter a valid URL",
    }),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

export function BrandingDisplaySettings({
  locationId,
}: Readonly<{
  locationId: string;
}>) {
  const queryClient = useQueryClient();
  const [isLogoDialogOpen, setIsLogoDialogOpen] = useState(false);

  const { data, isLoading } = useQuery(
    trpc.location.getLocationBrandingSettings.queryOptions({ locationId }),
  );

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      logo: null,
      wifiNetworkName: "",
      wifiPassword: "",
      parkingInstructions: "",
      arrivalNotes: "",
      mapLink: "",
    },
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    form.reset({
      logo: data.logo ?? null,
      wifiNetworkName: data.wifiNetworkName ?? "",
      wifiPassword: data.wifiPassword ?? "",
      parkingInstructions: data.parkingInstructions ?? "",
      arrivalNotes: data.arrivalNotes ?? "",
      mapLink: data.mapLink ?? "",
    });
  }, [data, form]);

  const { mutateAsync: initLogoUpload } = useMutation(
    trpc.location.initLocationLogoUpload.mutationOptions(),
  );

  const { mutateAsync: updateBrandingSettings, isPending } = useMutation(
    trpc.location.updateLocationBrandingSettings.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.location.getLocationBrandingSettings.queryKey({ locationId }),
        });
        toast.success("Branding settings saved");
      },
    }),
  );

  const previewLogoValue = form.watch("logo");
  const arrivalNotes = form.watch("arrivalNotes");
  const parkingInstructions = form.watch("parkingInstructions");
  const wifiNetworkName = form.watch("wifiNetworkName");
  const wifiPassword = form.watch("wifiPassword");
  const mapLink = form.watch("mapLink");

  const previewLogoUrl = useMemo(() => {
    if (!previewLogoValue) {
      return null;
    }

    if (previewLogoValue.startsWith("data:")) {
      return previewLogoValue;
    }

    return data?.updatedAt ? `${previewLogoValue}?v=${data.updatedAt}` : previewLogoValue;
  }, [data?.updatedAt, previewLogoValue]);

  const onSubmit = async (values: BrandingFormValues) => {
    try {
      let logo = values.logo ?? null;

      if (logo?.startsWith("data:") && logo.includes("base64")) {
        const file = await base64ToFile(logo);
        const checksum = await getFileChecksum(file, "SHA-256");
        const uploadData = await initLogoUpload({
          locationId,
          mimeType: file.type,
          filesize: file.size,
          checksum,
        });

        const uploadResponse = await fetch(uploadData.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload location logo");
        }

        logo = uploadData.url;
      }

      await updateBrandingSettings({
        locationId,
        logo,
        wifiNetworkName: values.wifiNetworkName || null,
        wifiPassword: values.wifiPassword || null,
        parkingInstructions: values.parkingInstructions || null,
        arrivalNotes: values.arrivalNotes || null,
        mapLink: values.mapLink || null,
      });
    } catch (error) {
      console.error("Failed to save branding settings", error);
      toast.error("Failed to save branding settings");
    }
  };

  if (isLoading) {
    return <p>Loading branding settings...</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="size-5 text-primary" />
              <CardTitle>Branding & Display Settings</CardTitle>
            </div>
            <CardDescription>
              Manage the logo and customer arrival details for this location.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Logo</FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className="flex size-24 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                            {previewLogoUrl ? (
                              <img
                                src={previewLogoUrl}
                                alt={`${data?.name ?? "Location"} logo`}
                                className="size-full object-cover"
                              />
                            ) : (
                              <Upload className="size-8 text-muted-foreground" />
                            )}
                          </div>

                          <div className="space-y-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsLogoDialogOpen(true)}
                            >
                              <Upload className="mr-2 size-4" />
                              {previewLogoUrl ? "Change Logo" : "Upload Logo"}
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              JPG, PNG, GIF, or WebP up to 5MB.
                            </p>
                          </div>

                          <LogoDialog
                            open={isLogoDialogOpen}
                            onOpenChange={setIsLogoDialogOpen}
                            addTrigger={false}
                            onLogoSelect={(url) => field.onChange(url)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="wifiNetworkName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WiFi Network Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Guest WiFi" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="wifiPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WiFi Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="Enter guest WiFi password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="parkingInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parking Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={4}
                          placeholder="Parking is available behind the building or in the visitor lot next to the entrance."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="arrivalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={4}
                          placeholder="Ask customers to arrive 10 minutes early and check in at the front desk."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mapLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Map / Directions Link</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          type="url"
                          placeholder="https://maps.google.com/..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border bg-muted/30 shadow-sm">
                  <div className="space-y-4 bg-background/85 p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl border bg-white">
                        {previewLogoUrl ? (
                          <img
                            src={previewLogoUrl}
                            alt={`${data?.name ?? "Location"} logo preview`}
                            className="size-full object-cover"
                          />
                        ) : (
                          <Palette className="size-8 text-muted-foreground" />
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold">{data?.name ?? "Location"}</h3>
                        <p className="text-sm text-muted-foreground">
                          Preview how this information can be presented to customers.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-xl border bg-card p-4">
                      <div className="flex items-start gap-3 text-sm">
                        <Wifi className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Guest WiFi</p>
                          <p className="text-muted-foreground">
                            {wifiNetworkName || "No guest WiFi details added yet"}
                            {wifiPassword ? ` • ${wifiPassword}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 text-sm">
                        <Car className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Parking</p>
                          <p className="text-muted-foreground">
                            {parkingInstructions || "Add parking instructions for customers."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 text-sm">
                        <Info className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Arrival</p>
                          <p className="text-muted-foreground">
                            {arrivalNotes || "Add arrival notes to help customers prepare."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Directions</p>
                          <p className="break-all text-muted-foreground">
                            {mapLink || "Add a directions link for booking and reminder experiences."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Branding Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
