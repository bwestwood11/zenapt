"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useEffect, useState } from "react";
import { LogoDialog } from "./logo-modal";
import { Pencil } from "lucide-react";
import { base64ToFile } from "../manage-account/utils";
import { getFileChecksum } from "../../../../server/src/lib/s3/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const businessSchema = z.object({
  name: z.string().min(2, "Business name is required"),
  companySize: z
    .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
    .optional(),
  description: z.string().nullable(),
  logo: z.string().nullable(),
});

type BusinessFormValues = z.infer<typeof businessSchema>;

type OrganizationDetails = BusinessFormValues & {
  updatedAt: Date;
  stripeAccountId?: string | null;
};

export function BusinessProfile() {
  const { data: businessDetails, isLoading } = useQuery(
    trpc.organization.getOrganizationDetails.queryOptions(),
  );

  if (isLoading) {
    return <p>Loading business profile...</p>;
  }

  if (!businessDetails) {
    return <p>Something went wrong. Please reload the page.</p>;
  }

  return (
    <BusinessForm
      businessDetails={businessDetails as OrganizationDetails}
      businessUpdatedAt={businessDetails.updatedAt}
    />
  );
}

function BusinessForm({
  businessDetails,
  businessUpdatedAt,
}: {
  businessDetails: BusinessFormValues;
  businessUpdatedAt: Date;
}) {
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: businessDetails.name ?? "",
      companySize: businessDetails.companySize ?? "1-10",
      description: businessDetails.description ?? "",
      logo: businessDetails.logo
        ? `${businessDetails.logo}?v=${businessUpdatedAt}`
        : undefined,
    },
  });

  useEffect(() => {
    console.log({ updateCheck: businessDetails });
  }, [businessDetails]);

  const router = useRouter();

  const { mutateAsync: initLogo } = useMutation(
    trpc.organization.initLogoUpload.mutationOptions(),
  );
  const { mutateAsync: updateBusiness } = useMutation(
    trpc.organization.updateOrganizationGeneralInfo.mutationOptions({
      onSuccess: (data) => {
        console.log("Business info updated:", data);
      },
    }),
  );

  const onSubmit = async (values: BusinessFormValues) => {
    let updatedLogo = values.logo;
    try {
      if (values.logo?.startsWith("data:") && values.logo.includes("base64")) {
        const file = await base64ToFile(values.logo);
        const mimeType = file.type;
        const filesize = file.size;
        const checksum = await getFileChecksum(file, "SHA-256");
        const { url, signedUrl } = await initLogo({
          mimeType,
          filesize,
          checksum,
        });
        const response = await fetch(signedUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": mimeType,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to upload logo");
        }

        updatedLogo = url;
      }
      updateBusiness({
        businessName: values.name || "",
        businessDescription: values.description || "",
        companySize: values.companySize ?? "1-10",
        logo: updatedLogo,
      });

      // invalidate and force refetch a query
      await queryClient.refetchQueries({
        queryKey: trpc.organization.getOrganizationDetails.queryKey(),
      });

      router.refresh();

      toast.success("Business profile updated");
    } catch (error) {
      console.error("Logo upload failed:", error);
      return;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Header */}
        <div className="flex w-full justify-between items-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Business Profile
            </h2>
            <p className="text-muted-foreground">
              Update your business profile information, including name,
              description, and logo.
            </p>
          </div>
          <Button
            disabled={!form.formState.isDirty}
            isLoading={form.formState.isSubmitting}
            type="submit"
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Save Changes
          </Button>
        </div>

        {/* Content */}
        <div className="flex gap-8 items-start">
          <FormField
            control={form.control}
            name="logo"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="flex-shrink-0">
                    <Avatar
                      className="h-32 w-32 rounded-full relative border-4 border-muted group cursor-pointer"
                      onClick={() => {
                        setIsDialogOpen(true);
                      }}
                    >
                      <AvatarImage
                        src={
                          field.value
                            ? field.value
                            : "/placeholder.svg?height=128&width=128"
                        }
                      />
                      <AvatarFallback className="bg-foreground text-2xl font-semibold text-background">
                        {businessDetails.name.slice(0, 2).toUpperCase() || "B"}
                      </AvatarFallback>

                      <div className="absolute w-full h-full rounded-full bg-black/20 items-center justify-center hidden group-hover:flex group-hover ">
                        <Pencil className="text-white size-8  stroke-[2.5]" />
                      </div>
                    </Avatar>
                    <LogoDialog
                      open={isDialogOpen}
                      onOpenChange={setIsDialogOpen}
                      addTrigger={false}
                      onLogoSelect={(url) => {
                        field.onChange(url);
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex-1 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Business Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter business name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company Size */}
              <FormField
                control={form.control}
                name="companySize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Size</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">
                            51-200 employees
                          </SelectItem>
                          <SelectItem value="201-500">
                            201-500 employees
                          </SelectItem>
                          <SelectItem value="501+">501+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={8}
                      placeholder="Describe your business..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>
  );
}
