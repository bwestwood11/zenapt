"use client";

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Upload, Building2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import {
  getFileChecksum,
  IMAGE_UPLOAD_ENDPOINTS,
} from "../../../../server/src/lib/s3/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const companySizeOptions = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-25", label: "11-25 employees" },
  { value: "26-50", label: "26-50 employees" },
  { value: "51-100", label: "51-100 employees" },
  { value: "101-250", label: "101-250 employees" },
  { value: "250+", label: "250+ employees" },
];

const OnboardingForm = () => {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formSchema = z.object({
    businessName: z.string().min(2, {
      message: "Business name must be at least 2 characters.",
    }),
    logo: z.instanceof(File).optional(),
    businessDescription: z.string().optional(),
    companySize: z
      .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
      .optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: "",
      businessDescription: "",
      companySize: "1-10",
      logo: undefined,
    },
  });
  const router = useRouter();
  const { mutate: createOrganization, error: OrganizationError } = useMutation(
    trpc.organization.createOrganization.mutationOptions({
      onError() {
        setIsSubmitting(false);
      },
      onSuccess() {
        setIsSubmitting(false);
        router.replace("/payment/init");
      },
    })
  );

  const { mutateAsync: initUpload, error } = useMutation(
    trpc.organization.initLogoUpload.mutationOptions({
      onError(error) {
        toast.error(error.message);
        setIsSubmitting(false);
      },
    })
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      !IMAGE_UPLOAD_ENDPOINTS["logos"].ALLOWED_FILE_TYPES.includes(file.type)
    ) {
      toast.error("File Type Not Allowed");
      return;
    }

    form.setValue("logo", file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const logoFile = values.logo;
    const fileName = logoFile?.name;
    let fileUrl = undefined;
    if (fileName) {
      try {
        const checksum = await getFileChecksum(logoFile, "SHA-256");
        console.log(checksum);

        const response = await initUpload({
          mimeType: logoFile.type,
          filesize: logoFile.size,
          checksum: checksum,
        });

        if (!response) {
          return;
        }

        const res = await fetch(response.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": logoFile.type },
          body: logoFile,
        });

        fileUrl = response.url;
      } catch (err) {
        console.error(err);
        setIsSubmitting(false);
      }
    }

    createOrganization({ ...values, logo: fileUrl });
  }
  return (
    <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-8">
        <div className="flex items-center justify-center mb-4">
          <Building2 className="h-6 w-6 text-primary mr-2" />
          <CardTitle className="text-2xl font-semibold">
            Create Your Organization
          </CardTitle>
        </div>
        <CardDescription className="text-base">
          Tell us about your medical spa so we can customize your experience
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex gap-3 ">
              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <label
                            htmlFor="logo-upload"
                            className="cursor-pointer"
                          >
                            <div className="border-2 border-dashed size-20 bg-input border-border hover:border-primary/50 rounded-full overflow-hidden text-center transition-colors duration-200">
                              {logoPreview ? (
                                <div className="space-y-2">
                                  <img
                                    src={logoPreview || "/placeholder.svg"}
                                    alt="Logo preview"
                                    className="w-full h-full object-cover object-center mx-auto rounded"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-2 p-2 w-full h-full flex justify-center items-center flex-col">
                                  <Upload className="size-6 text-muted-foreground mx-auto" />
                                </div>
                              )}
                            </div>
                          </label>

                          <input
                            id="logo-upload"
                            type="file"
                            accept={`${IMAGE_UPLOAD_ENDPOINTS[
                              "logos"
                            ].ALLOWED_FILE_TYPES.join(",")}`}
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Business Name */}
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-base font-medium">
                      Business Name *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your medical spa name"
                        className="h-12 text-base border-border focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* Logo Upload */}

            {/* Business Description */}
            <FormField
              control={form.control}
              name="businessDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Business Description
                  </FormLabel>
                  <FormDescription>
                    Briefly describe your medical spa and services (optional)
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about your medical spa, the services you offer, and what makes you unique..."
                      className="min-h-[100px] text-base border-border focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-none"
                      {...field}
                    />
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
                  <FormLabel className="text-base font-medium">
                    Company Size *
                  </FormLabel>
                  <FormDescription>
                    How many people work at your medical spa?
                  </FormDescription>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12 text-base w-full border-border focus:ring-2 focus:ring-primary/20 transition-all duration-200">
                        <SelectValue placeholder="Select your company size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companySizeOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-base"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="pt-6">
              <Button
                isLoading={isSubmitting}
                type="submit"
                className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
              >
                Create Organization
              </Button>

              {error ? (
                <div className="mt-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2 flex items-center gap-2">
                  <span className="font-semibold">Error:</span>
                  <span>{error.message}</span>
                </div>
              ) : null}
              {OrganizationError ? (
                <div className="mt-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2 flex items-center gap-2">
                  <span className="font-semibold">Error:</span>
                  <span>{OrganizationError.message}</span>
                </div>
              ) : null}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default OnboardingForm;
