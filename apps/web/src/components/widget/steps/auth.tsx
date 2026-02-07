"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useCheckoutStore } from "../hooks/useStore";
import { Loader2 } from "lucide-react";

const AuthPage = () => {
  const [isLogin, setIsLogin] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showVerificationMessage, setShowVerificationMessage] =
    React.useState(false);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");

  const { handleNext } = useCheckoutStore();

  // Use built-in session hook with automatic revalidation
  const session = authClient.useSession();
  React.useEffect(() => {
    console.log("Session data:", session);
    const isAuthenticated =
      session.data?.user?.customer !== null &&
      session.data?.user?.customer !== undefined &&
      session.data?.user?.emailVerified === true;

    if (isAuthenticated) {
      handleNext(true);
    }
  }, [session]);

  // Check if user is authenticated and verified after showing verification message
  React.useEffect(() => {
    if (!showVerificationMessage) return;

    const checkSession = async () => {
      // Refetch session from server
      await session.refetch();
    };

    // Check immediately
    checkSession();

    // Then poll every 2 seconds
    const interval = setInterval(checkSession, 2000);

    return () => clearInterval(interval);
  }, [showVerificationMessage, handleNext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Login
        const result = await authClient.signIn.email({
          email,
          password,
        });

        if (result.error) {
          setError(result.error.message || "Login failed");
          return;
        }
      } else {
        // Register
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        });
        console.log("Signup result:", result);
        if (result.error) {
          setError(result.error.message || "Registration failed");
          return;
        }

        // Show verification message after signup
        setShowVerificationMessage(true);
        return; // Don't proceed to next step yet
      }

      // Login successful, check if user is authenticated as customer
      const session = await authClient.getSession();
      const isAuthenticated =
        session?.data?.user?.customer !== null &&
        session?.data?.user?.customer !== undefined;

      handleNext(isAuthenticated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Show verification message
  if (showVerificationMessage) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-semibold text-foreground">
            Verify Your Email
          </h2>

          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              We've sent a verification link to:
            </p>
            <p className="text-foreground font-medium">{email}</p>
            <p className="text-muted-foreground text-sm">
              Please check your inbox and click the verification link to
              continue with your booking.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Waiting for verification...
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                You'll be automatically redirected once your email is verified.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">Already verified?</p>
          <button
            type="button"
            onClick={() => {
              setShowVerificationMessage(false);
              setIsLogin(true);
            }}
            className="text-sm text-primary hover:underline"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

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

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
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
        )}

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
              {isLogin ? "Signing in..." : "Creating account..."}
            </>
          ) : (
            <>{isLogin ? "Sign In" : "Create Account"}</>
          )}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
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
