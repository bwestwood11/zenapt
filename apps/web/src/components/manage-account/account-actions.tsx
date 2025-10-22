"use client";

import { authClient } from "@/lib/auth-client";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { LogOut } from "lucide-react";

export const AccountActions = () => {
  const handleSignOut = () => {
    authClient.signOut(); // if available
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Account Actions</h2>
          <p className="text-sm text-muted-foreground">
            Manage your account session
          </p>
        </div>
        <Button variant="destructive" onClick={handleSignOut} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </Card>
  );
};