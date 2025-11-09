"use client";

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
import { Mail, Send, Copy, Loader2 } from "lucide-react";
import { useAdminSession } from "@/hooks/useSession";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "../../utils/trpc";
import { toast } from "sonner";
import { z } from "zod";

export default function InvitePage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { isLoading: sessionIsLoading } = useAdminSession();

  // --- Invitation mutation ---
  const { mutate: sendInvitation, isPending: isSending, isSuccess, isError } = useMutation(
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

  // --- Demo Requests (infinite pagination) ---
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery(
    trpc.admin.getDemosRequest.infiniteQueryOptions(
      { limit: 10 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      }
    )
  );

  const allDemos = data?.pages.flatMap((page) => page.data) ?? [];

  if (sessionIsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!z.string().email().safeParse(email).success) {
      setMessage("Invalid Email Use real email");
      return;
    }

    sendInvitation({ email });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Email copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar with demo requests */}
      <aside className="w-full md:w-80 border-r border-border bg-card/50 overflow-y-auto p-4">
        <h2 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" /> Demo Requests
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {allDemos.map((demo) => (
                <div
                  key={demo.id}
                  className="flex flex-col gap-1 p-3 rounded-lg border border-border hover:bg-muted/30 transition"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {demo.firstName} {demo.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {demo.businessName}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(demo.email)}
                      className="hover:bg-primary/10"
                    >
                      <Copy className="w-4 h-4 text-primary" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{demo.email}</p>
                </div>
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        )}
      </aside>

      {/* Main Invite Form */}
      <main className="flex-1 flex items-center justify-center p-6">
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
                <Input
                  type="email"
                  placeholder="Enter recipient's email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base bg-input border-border focus:ring-2 focus:ring-ring focus:border-transparent"
                  disabled={isSending}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={isSending}
                >
                  {isSending ? (
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

              {(isError || isSuccess) && (
                <div
                  className={`text-center text-sm p-3 rounded-md ${
                    isSuccess
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
      </main>
    </div>
  );
}
