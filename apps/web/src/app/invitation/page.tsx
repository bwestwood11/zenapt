import { Mail, Users } from "lucide-react";
import React from "react";
import ActionButtons from "./buttons";
import { serverTRPC } from "@/utils/server-trpc";
import Forbidden from "../forbidden";

const validateToken = async ({ token }: { token: string }) => {
  try {
    return await serverTRPC.invitation.getInvitation.fetch({ token });
  } catch (error) {
    console.error(error);
    return undefined;
  }
};

type Params = Promise<{ token?: string; email?: string; org?: string }>;
const InvitationPage = async ({ searchParams }: { searchParams: Params }) => {
  const { email, token, org } = await searchParams;

  if (!token) throw Forbidden();

  const res = await validateToken({ token });
  if (!res) throw Forbidden();

  const { data, exp } = res;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground text-balance">
              You've been invited!
            </h1>
            <p className="text-xl text-muted-foreground text-pretty max-w-xl mx-auto leading-relaxed">
              You have been invited to join{" "}
              <span className="font-semibold text-foreground">{org}</span> as a{" "}
              <span className="font-semibold text-foreground">
                {data?.role}
              </span>
              .
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-6 max-w-md mx-auto space-y-2">
            
            <div className="text-left text-sm text-muted-foreground space-y-1 mt-4">
              <div>
                <span className="font-semibold text-foreground">Email:</span>{" "}
                {data?.email || email}
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  Organization:
                </span>{" "}
                {org}
              </div>
              <div>
                <span className="font-semibold text-foreground">Role:</span>{" "}
                {data?.role}
              </div>
              <div>
                <span className="font-semibold text-foreground">Expires:</span>{" "}
                {exp ? new Date(exp * 1000).toLocaleString() : "Unknown"}
              </div>
            </div>
          </div>
        </div>

        <ActionButtons token={token} />
        <div className="pt-8 text-sm text-muted-foreground">
          <p>
            By accepting this invitation, you agree to our{" "}
            <a href="#" className="text-primary hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-primary hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </main>
  );
};

export default InvitationPage;
