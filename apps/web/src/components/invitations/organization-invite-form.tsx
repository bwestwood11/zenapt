"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, User, Shield, GitGraph } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
import { OrgRole } from "../../../../server/prisma/generated/enums";
import { trpc } from "@/utils/trpc";

// 1. Validation schema
const orgInvSchema = z.object({
  email: z.string().email("Enter a valid email"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(OrgRole).exclude([OrgRole.OWNER]),
});

type OrgInvFormValues = z.infer<typeof orgInvSchema>;

const OrgInvForm = () => {
  const form = useForm<OrgInvFormValues>({
    resolver: zodResolver(orgInvSchema),
    defaultValues: {
      email: "",
      name: "",
      role: undefined,
    },
  });

  const mutation = useMutation(
    trpc.invitation.inviteOrganizationMember.mutationOptions({
      onSuccess: () => {
        toast.success("Invitation sent successfully!");
        form.reset();
      },
      onError: () => {
        toast.error("Failed to send invitation. Please try again.");
      },
    })
  );

  const onSubmit = (values: OrgInvFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="colleague@company.com"
                    className="pl-10 h-12 text-base"
                    {...field}
                  />
                </div>
              </FormControl>
              <p className="text-xs text-muted-foreground">
                They&apos;ll receive an invitation email at this address
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Name Field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="John Doe"
                    className="pl-10 h-12 text-base"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Role Field */}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <div className="relative">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className=" h-20 text-base">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={OrgRole.ANALYST}>
                        <div className="flex items-center space-x-2">
                          <GitGraph className="size-4" />
                          <div>
                            <div className="font-medium">Analyst</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value={OrgRole.ADMIN}>
                        <div className="flex items-center space-x-2">
                          <Shield className="size-4" />
                          <div>
                            <div className="font-medium">Admin</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Choose the appropriate access level for this team member
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="h-12 px-8 text-base font-medium flex-1 sm:flex-none"
          >
            {mutation.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sending invitation...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send invitation
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 px-8 text-base bg-transparent"
            onClick={() => form.reset()}
          >
            Clear form
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default OrgInvForm;
