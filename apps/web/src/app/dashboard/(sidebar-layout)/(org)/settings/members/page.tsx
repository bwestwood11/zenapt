import OrgInvForm from "@/components/invitations/organization-invite-form";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function InviteMemberPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Page Title */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Invite team member
            </h2>
            <p className="text-muted-foreground">
              Send an invitation to add a new member to your organization.
              They'll receive an email with instructions to join.
            </p>
          </div>

          {/* Form */}
          <OrgInvForm />

          {/* Info Section */}
          <div className="rounded-lg border border-border bg-muted/50 p-6 space-y-4">
            <h3 className="font-medium text-foreground">What happens next?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start space-x-2">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                <span>
                  The invited user will receive an email with a secure
                  invitation link
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                <span>
                  They'll be able to create their account and join your
                  organization
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                <span>You'll be notified once they accept the invitation</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
