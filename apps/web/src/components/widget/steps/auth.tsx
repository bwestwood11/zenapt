"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { useCheckoutStore } from "../hooks/useStore";
import { Loader2 } from "lucide-react";
import { useOrgId } from "../hooks/useOrgId";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { useCustomerSession } from "../hooks/useCustomerSession";

const AuthPage = () => {
  const [isLogin, setIsLogin] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);

  const { handleNext } = useCheckoutStore();
  const orgId = useOrgId();
  const session = useCustomerSession();
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
  React.useEffect(() => {
    if (session.data?.customer) {
      handleNext(true);
    }
  }, [session.data?.customer, handleNext]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signIn({ email, password });
      await session.refetch();
      handleNext(true);
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
      await requestOtp({ email, organizationId: orgId });
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
        organizationId: orgId,
      });

      await session.refetch();
      handleNext(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
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

          <Button type="submit" className="w-full" disabled={isLoading}>
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

          <Button type="submit" className="w-full" disabled={isLoading}>
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
         
            <div className="flex justify-center">
              <InputOTP
                id="otp"
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                disabled={isLoading}
                className="w-full gap-8 justify-between"
              >
                <InputOTPGroup className="justify-between">
                  <InputOTPSlot className="w-12 h-12" index={0} />
                  <InputOTPSlot className="w-12 h-12" index={1} />
                  <InputOTPSlot className="w-12 h-12" index={2} />
                </InputOTPGroup>

                  <InputOTPSeparator />
                   <InputOTPGroup className="justify-between">
                  <InputOTPSlot className="w-12 h-12" index={3} />
                  <InputOTPSlot className="w-12  h-12" index={4} />
                  <InputOTPSlot className="w-12 h-12" index={5} />
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
                  await resendOtp({ email, organizationId: orgId });
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

          <Button type="submit" className="w-full py-5 text-base font-semibold" size="lg" disabled={isLoading}>
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

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
            setOtpCode("");
            setOtpSent(false);
          }}
          className="text-sm text-primary hover:underline"
          disabled={isLoading}
        >
          {isLogin
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>

      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground text-center">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
