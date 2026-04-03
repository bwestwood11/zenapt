"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

type CustomerPortalLoginFormProps = Readonly<{
  organizationId: string;
  organizationName: string;
  organizationDescription?: string | null;
  defaultReturnUrl?: string;
}>;

const getSafeReturnUrl = (value: string | undefined, organizationId: string) => {
  const fallback = `/c/${organizationId}/dashboard`;
  const win = globalThis.window;

  if (!value) {
    return fallback;
  }

  if (!win) {
    return fallback;
  }

  try {
    const parsed = new URL(value, win.location.origin);

    if (parsed.origin !== win.location.origin) {
      return fallback;
    }

    return parsed.toString();
  } catch {
    return fallback;
  }
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

function PortalBranding({
  organizationName,
  organizationDescription,
}: Readonly<{
  organizationName: string;
  organizationDescription?: string | null;
}>) {
  return (
    <div className="space-y-4 text-center md:text-left">
      <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        Secure customer access
      </div>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm md:mx-0">
        <span className="text-lg font-semibold">
          {organizationName.slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="space-y-2.5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {organizationName}
        </h1>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          {organizationDescription?.trim() ||
            "Access your customer portal, manage bookings, and keep your details up to date."}
        </p>
      </div>
    </div>
  );
}

function ErrorMessage({ message }: Readonly<{ message: string | null }>) {
  if (!message) {
    return null;
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}

function LoginSection({
  email,
  password,
  isLoading,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: Readonly<{
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: NonNullable<React.ComponentProps<"form">["onSubmit"]>;
}>) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer-email">Email</Label>
        <Input
          id="customer-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-password">Password</Label>
        <Input
          id="customer-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          required
          minLength={8}
          disabled={isLoading}
        />
      </div>

      <ErrorMessage message={error} />

      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}

function VerifyOtpSection({
  otpCode,
  isLoading,
  error,
  onOtpChange,
  onSubmit,
  onResend,
}: Readonly<{
  otpCode: string;
  isLoading: boolean;
  error: string | null;
  onOtpChange: (value: string) => void;
  onSubmit: NonNullable<React.ComponentProps<"form">["onSubmit"]>;
  onResend: () => void;
}>) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="space-y-3">
        <Label htmlFor="customer-otp">Verification Code</Label>
        <div className="flex justify-center">
          <InputOTP
            id="customer-otp"
            maxLength={6}
            value={otpCode}
            onChange={onOtpChange}
            disabled={isLoading}
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        </div>
      </div>

      <ErrorMessage message={error} />

      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          "Verify and Continue"
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={isLoading}
        onClick={onResend}
      >
        Resend code
      </Button>
    </form>
  );
}

function SignupSection({
  name,
  email,
  password,
  phoneNumber,
  consent,
  isLoading,
  error,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onPhoneChange,
  onConsentChange,
  onSubmit,
}: Readonly<{
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  consent: boolean;
  isLoading: boolean;
  error: string | null;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onConsentChange: (value: boolean) => void;
  onSubmit: NonNullable<React.ComponentProps<"form">["onSubmit"]>;
}>) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer-name">Full Name</Label>
        <Input
          id="customer-name"
          type="text"
          placeholder="John Doe"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-email-signup">Email</Label>
        <Input
          id="customer-email-signup"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-password-signup">Password</Label>
        <Input
          id="customer-password-signup"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          required
          minLength={8}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-phone">Phone Number</Label>
        <PhoneInput
          id="customer-phone"
          placeholder="Enter your phone number"
          value={phoneNumber}
          onChange={(value) => onPhoneChange(value ?? "")}
          defaultCountry="US"
          required
          disabled={isLoading}
        />
      </div>

      <div className="rounded-xl border border-border bg-muted/35 p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="customer-consent"
            checked={consent}
            onCheckedChange={(checked) => onConsentChange(checked === true)}
            disabled={isLoading}
            className="mt-1"
          />
          <div className="space-y-1.5">
            <Label
              htmlFor="customer-consent"
              className="text-sm font-medium leading-6 text-foreground"
            >
              Consent to SMS and email communications
            </Label>
            <p className="text-sm leading-6 text-muted-foreground">
              I agree to receive SMS text messages and emails regarding my
              bookings, account, onboarding, and support.
            </p>
          </div>
        </div>
      </div>

      <ErrorMessage message={error} />

      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending code...
          </>
        ) : (
          "Send Verification Code"
        )}
      </Button>
    </form>
  );
}

export function CustomerPortalLoginForm({
  organizationId,
  organizationName,
  organizationDescription,
  defaultReturnUrl,
}: CustomerPortalLoginFormProps) {
  const [isLogin, setIsLogin] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);

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
  const showModeSwitcher = isOtpStep === false;
  const isCreateMode = isLogin === false;
  let formTitle = "Create Account";
  let formDescription = `Create your ${organizationName} customer account.`;
  let modeLabel = "New customer";

  if (isLogin) {
    formTitle = "Sign In";
    formDescription = `Sign in to continue with ${organizationName}.`;
    modeLabel = "Returning customer";
  } else if (isOtpStep) {
    formTitle = "Verify your email";
    formDescription = `Enter the verification code sent to ${email}.`;
    modeLabel = "Verification step";
  }

  const redirectToReturnUrl = React.useCallback(() => {
    globalThis.window.location.assign(
      getSafeReturnUrl(defaultReturnUrl, organizationId),
    );
  }, [defaultReturnUrl, organizationId]);

  const handleLoginSubmit: NonNullable<
    React.ComponentProps<"form">["onSubmit"]
  > = (event) => {
    event.preventDefault();

    void (async () => {
      setIsLoading(true);
      setError(null);

      try {
        await signIn({
          email,
          password,
          organizationId,
        });
        redirectToReturnUrl();
      } catch (submitError) {
        setError(getErrorMessage(submitError));
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const handleRequestOtpSubmit: NonNullable<
    React.ComponentProps<"form">["onSubmit"]
  > = (event) => {
    event.preventDefault();

    void (async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!phoneNumber.trim()) {
          setError("Enter your phone number to continue.");
          return;
        }

        if (!consent) {
          setError("Consent is required before creating an account.");
          return;
        }

        await requestOtp({ email, organizationId });
        setOtpSent(true);
        setOtpCode("");
      } catch (submitError) {
        setError(getErrorMessage(submitError));
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const handleVerifyOtpSubmit: NonNullable<
    React.ComponentProps<"form">["onSubmit"]
  > = (event) => {
    event.preventDefault();

    void (async () => {
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
          phoneNumber,
          consentToSmsAndEmail: true,
          otp: otpCode,
          organizationId,
        });
        redirectToReturnUrl();
      } catch (submitError) {
        setError(getErrorMessage(submitError));
      } finally {
        setIsLoading(false);
      }
    })();
  };

  let content: React.ReactNode;

  if (isLogin) {
    content = (
      <LoginSection
        email={email}
        password={password}
        isLoading={isLoading}
        error={error}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleLoginSubmit}
      />
    );
  } else if (isOtpStep) {
    content = (
      <VerifyOtpSection
        otpCode={otpCode}
        isLoading={isLoading}
        error={error}
        onOtpChange={setOtpCode}
        onSubmit={handleVerifyOtpSubmit}
        onResend={() => {
          void resendOtp({ email, organizationId }).catch((submitError) => {
            setError(getErrorMessage(submitError));
          });
        }}
      />
    );
  } else {
    content = (
      <SignupSection
        name={name}
        email={email}
        password={password}
        phoneNumber={phoneNumber}
        consent={consent}
        isLoading={isLoading}
        error={error}
        onNameChange={setName}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onPhoneChange={setPhoneNumber}
        onConsentChange={setConsent}
        onSubmit={handleRequestOtpSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 rounded-3xl border border-border/70 bg-background/95 p-5 shadow-xl backdrop-blur md:grid-cols-[1.05fr_0.95fr] md:p-10">
          <div className="flex flex-col justify-between rounded-2xl bg-muted/30 p-6">
            <div className="space-y-6">
              <Link
                href={`/widget/${organizationId}/book`}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "w-fit px-0 text-muted-foreground",
                )}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to booking
              </Link>
              <PortalBranding
                organizationName={organizationName}
                organizationDescription={organizationDescription}
              />
            </div>

            <div className="mt-8 rounded-2xl border border-border/60 bg-background/80 p-5">
              <p className="text-sm font-medium text-foreground">
                Customer portal access
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to review your appointments, see what is coming up next,
                and jump back into booking for {organizationName}.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            {showModeSwitcher ? (
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/30 p-1">
                <Button
                  type="button"
                  variant={isLogin ? "default" : "ghost"}
                  size="sm"
                  className="h-9"
                  disabled={isLoading}
                  onClick={() => {
                    setIsLogin(true);
                    setOtpSent(false);
                    setOtpCode("");
                    setError(null);
                  }}
                >
                  Sign In
                </Button>
                <Button
                  type="button"
                  variant={isCreateMode ? "default" : "ghost"}
                  size="sm"
                  className="h-9"
                  disabled={isLoading}
                  onClick={() => {
                    setIsLogin(false);
                    setOtpSent(false);
                    setOtpCode("");
                    setError(null);
                  }}
                >
                  Create Account
                </Button>
              </div>
            ) : null}

            <div className="mb-6 space-y-2.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {modeLabel}
              </p>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">{formTitle}</h2>
              <p className="text-sm text-muted-foreground">{formDescription}</p>
            </div>

            {content}

            <div className="mt-6 border-t border-border/60 pt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Need an account?" : "Already have an account?"}
              </p>
              <Button
                type="button"
                variant="link"
                className="mt-1 h-auto p-0"
                disabled={isLoading}
                onClick={() => {
                  setIsLogin((current) => !current);
                  setOtpSent(false);
                  setOtpCode("");
                  setError(null);
                }}
              >
                {isLogin ? "Create account" : "Sign in instead"}
              </Button>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
              By continuing, you agree to receive account and booking-related
              communication from {organizationName}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
