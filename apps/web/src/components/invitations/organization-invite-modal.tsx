import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import OrgInvForm from "./organization-invite-form";

type OrganizationInvitationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void; 
};

const OrganizationInvitationModal: React.FC<
  OrganizationInvitationModalProps
> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            Send an invitation to add a new member to your organization. They'll
            receive an email with instructions to join.
          </DialogDescription>
        </DialogHeader>
        <OrgInvForm />
            <div className="rounded-lg border border-border bg-muted/50 p-6 space-y-4">
                  <h3 className="font-medium text-foreground">
                    What happens next?
                  </h3>
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
                      <span>
                        You'll be notified once they accept the invitation
                      </span>
                    </li>
                  </ul>
                </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrganizationInvitationModal;
