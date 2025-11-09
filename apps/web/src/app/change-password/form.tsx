"use client";

import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Eye, EyeOff, Lock, CheckCircle2, Shield } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const formSchema = z
  .object({
    temporaryPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/\d/, "Password must contain at least one number")
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        "Password must contain at least one special character"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.temporaryPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

type FormData = z.infer<typeof formSchema>;

const ChangePasswordForm = () => {
  const router = useRouter();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      temporaryPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  });

  const {
    mutate: changePassword,
    isPending: isSubmitting,
    isSuccess,
  } = useMutation(
    trpc.auth.changePassword.mutationOptions({
      onSuccess: () => {
        form.reset();
        toast.success("Password changed successfully!");
      },
      onError: (error) => {
        toast.error(error.message || "Something went wrong. Please try again.");
      },
    })
  );
  const onSubmit = async (data: FormData) => {
    changePassword(data);
  };

  const togglePasswordVisibility = (field: "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Password Updated Successfully
            </h1>
            <p className="text-muted-foreground">
              Your password has been changed. You can now use your new password
              to sign in.
            </p>
          </div>
          <Button
            onClick={() => router.replace("/dashboard")}
            className="w-full"
          >
            Continue to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground text-balance">
            Change Your Password
          </h1>
          <p className="text-muted-foreground text-pretty">
            You're using a temporary password. Please create a new secure
            password to continue.
          </p>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Current Password - no toggle */}
          <FormField
            control={form.control}
            name="temporaryPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Temporary Password</FormLabel>
                <Input
                  type="text"
                  placeholder="Enter your temporary password"
                  {...field}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* New Password - with toggle */}
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <div className="relative">
                  <Input
                    type={showPasswords.new ? "text" : "password"}
                    placeholder="Create a strong password"
                    className="pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("new")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    <span className="sr-only">
                      {showPasswords.new ? "Hide password" : "Show password"}
                    </span>
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirm Password - with toggle */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <div className="relative">
                  <Input
                    type={showPasswords.confirm ? "text" : "password"}
                    placeholder="Confirm your new password"
                    className="pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("confirm")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    <span className="sr-only">
                      {showPasswords.confirm
                        ? "Hide password"
                        : "Show password"}
                    </span>
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Requirements */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Password Requirements
              </span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              <li>• At least 8 characters long</li>
              <li>• Contains uppercase and lowercase letters</li>
              <li>• Includes at least one number</li>
              <li>• Has at least one special character</li>
            </ul>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Updating Password..." : "Update Password"}
          </Button>
        </form>
      </Form>
    </>
  );
};

export default ChangePasswordForm;
