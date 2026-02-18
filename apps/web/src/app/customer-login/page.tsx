"use client";

import React, { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { useSearchParams } from "next/navigation";

const CustomerLoginForm = () => {
  const [isLogin, setIsLogin] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);

  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("return") || "/";

  const { mutateAsync: signUp } = useMutation(
    trpc.customerAuth.signUp.mutationOptions(),
  );
  const { mutateAsync: signIn } = useMutation(
    trpc.customerAuth.signIn.mutationOptions(),
  );
  const { mutateAsync: requestOtp } = useMutation(
    trpc.customerAuth.requestSignUpOtp.mutationOptions(),
  );
  const { mutateAsync: resendOtp } = useMutation(
    trpc.customerAuth.resendSignUpOtp.mutationOptions(),
  );
  const isOtpStep = !isLogin && otpSent;

  const getOrgId = () =>
    new URLSearchParams(new URL(returnUrl, window.location.origin).search).get(
      "orgId",
    ) || "default";

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signIn({ email, password });

      // Redirect back to the widget
      window.location.href = returnUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await requestOtp({ email, organizationId: getOrgId() });
      setOtpSent(true);
      setOtpCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!otpCode.trim()) {
        setError("Enter the verification code to continue.");
        return;
      }

      await signUp({
        name,
        email,
        password,
        otp: otpCode,
        organizationId: getOrgId(),
      });

      window.location.href = returnUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-primary rounded-lg">
            <div className="w-6 h-6 bg-white rounded" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Serenity Medspa
          </h1>
          <p className="text-muted-foreground text-sm">Book your appointment</p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-2 mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              {isLogin ? "Sign In" : "Create Account"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isLogin
                ? "Sign in to continue with your booking"
                : "Create an account to complete your booking"}
            </p>
          </div>

          {isLogin && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={8}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>Sign In</>
                )}
              </Button>
            </form>
          )}

          {!isLogin && !isOtpStep && (
            <form onSubmit={handleRequestOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={8}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>Send Code</>
                )}
              </Button>
            </form>
          )}

          {!isLogin && isOtpStep && (
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-6">
              <div className="space-y-3 text-center">
                <h3 className="text-lg font-semibold text-foreground">
                  Verify your email
                </h3>
                <p className="text-sm text-muted-foreground">
                  We've sent a 6-digit code to
                </p>
                <p className="text-sm font-semibold text-foreground break-all">
                  {email}
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="otp" className="text-sm font-medium">
                  Verification Code
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    id="otp"
                    maxLength={6}
                    value={otpCode}
                    onChange={setOtpCode}
                    disabled={isLoading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode("");
                  }}
                  className="text-muted-foreground hover:text-primary transition-colors font-medium"
                  disabled={isLoading}
                >
                  Change email
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={async () => {
                    setIsLoading(true);
                    setError(null);

                    try {
                      await resendOtp({ email, organizationId: getOrgId() });
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Something went wrong.",
                      );
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="text-muted-foreground hover:text-primary transition-colors font-medium"
                  disabled={isLoading}
                >
                  Resend code
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full py-5 text-base font-semibold"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>Verify & Create Account</>
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setEmail("");
                setPassword("");
                setName("");
                setOtpCode("");
                setOtpSent(false);
              }}
              className="text-center w-full text-sm text-muted-foreground hover:text-primary transition-colors"
              disabled={isLoading}
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

const CustomerLoginPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-primary rounded-lg animate-pulse">
              <div className="w-6 h-6 bg-white rounded" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    }>
      <CustomerLoginForm />
    </Suspense>
  );
};

export default CustomerLoginPage;
