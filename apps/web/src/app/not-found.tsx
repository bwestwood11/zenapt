"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-muted rounded-full opacity-20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/20 rounded-full opacity-30 blur-2xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Large 404 text */}
        <div className="mb-8">
          <h1 className="text-8xl md:text-9xl font-bold text-primary mb-4 font-mono tracking-tight">
            404
          </h1>
          <div className="w-24 h-1 bg-accent mx-auto mb-6" />
        </div>

        {/* Error message */}
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 text-balance">
            Oops! Page Not Found
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto text-pretty">
            The page you're looking for doesn't exist. It might have been moved,
            deleted, or you entered the wrong URL.
          </p>
        </div>
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link
            href="/"
            className={buttonVariants({
              size: "lg",
              className:
                "",
            })}
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Homepage
          </Link>

          <Button
            variant="outline"
            size="lg"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>

        {/* Suggested links */}
        <div className="border-t border-border pt-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Popular Pages
          </h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/"
              className="text-foreground hover:text-primary transition-colors"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="text-foreground hover:text-primary transition-colors"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-foreground hover:text-primary transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/blog"
              className="text-foreground hover:text-primary transition-colors"
            >
              Blog
            </Link>
          </div>
        </div>
      </div>

      {/* Footer text */}
      <div className="absolute bottom-4 text-xs text-muted-foreground">
        Error Code: 404 • Page Not Found
      </div>
    </div>
  );
}
