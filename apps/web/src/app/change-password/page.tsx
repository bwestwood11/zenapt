"use client";

import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import ChangePasswordForm from "./form";

export default function ChangePasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
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

        <ChangePasswordForm />
        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground text-pretty">
            For your security, you'll be signed out of all devices after
            changing your password.
          </p>
        </div>
      </div>
    </div>
  );
}
