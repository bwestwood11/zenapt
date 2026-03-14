"use client";

import { trpc } from "@/utils/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import z from "zod";
import { Card } from "../ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";

const profileFormSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters." })
    .max(50, { message: "Name must not exceed 50 characters." }),
  email: z.email(),
  role: z.string(),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const PersonalInfoForm = ({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string;
}) => {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name,
      email,
      role: role
        .split("_")
        .map((m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
        .join(" "),
    },
  });

  const { mutateAsync: updateProfile, isPending } = useMutation(
    trpc.auth.updateProfile.mutationOptions()
  );

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateProfile({ name: data.name });
    } catch (err: any) {}
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Personal Information</h2>
          <p className="text-sm text-muted-foreground">
            Update your personal details
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your name"
                      {...field}
                      className="max-w-md"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled className="max-w-md bg-muted" />
                  </FormControl>
                  <FormDescription>Email cannot be changed</FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input {...field} disabled className="max-w-md bg-muted" />
                  </FormControl>
                  <FormDescription>
                    Role is managed by your organization
                  </FormDescription>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </div>
    </Card>
  );
};