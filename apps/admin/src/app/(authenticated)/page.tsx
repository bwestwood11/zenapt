"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Send } from "lucide-react";
import { useAdminSession } from "@/hooks/useSession";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "../../utils/trpc";
import { toast } from "sonner";
import { z } from "zod";

export default function InvitePage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { isLoading: sessionIsLoading } = useAdminSession();

  const { mutate: sendInvitation, isPending: isLoading } = useMutation(
    trpc.admin.inviteUser.mutationOptions({
      onSuccess() {
        setMessage("Sent Successfully");
        toast.success("Invitation Sent Successfully");
      },
      onError() {
        setMessage("Something went wrong");
        toast.error("An Error Occurred");
      },
    })
  );

  if (sessionIsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!z.email().safeParse(email).success) {
      setMessage("Invalid Email Use real email");
      return;
    }

    sendInvitation({ email });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-0 bg-card">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Send Your Invite
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Invite someone to join our software platform
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Enter recipient's email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base bg-input border-border focus:ring-2 focus:ring-ring focus:border-transparent"
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Send Invite
                  </div>
                )}
              </Button>
            </form>

            {message && (
              <div
                className={`text-center text-sm p-3 rounded-md ${
                  message.includes("success")
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
