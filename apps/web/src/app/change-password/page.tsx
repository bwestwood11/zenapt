import { Shield } from "lucide-react";
import ChangePasswordForm from "./form";
import { requireAuth } from "@/lib/permissions/permission";

export default async function ChangePasswordPage() {
  await requireAuth()
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
      
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
