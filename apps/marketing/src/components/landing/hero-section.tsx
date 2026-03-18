"use client";

import type React from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { navItems } from "./landing-data";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
};

type HeroEmailFormProps = Readonly<{
  email: string;
  isValidEmail: boolean;
  showEmailHint: boolean;
  onEmailChange: (value: string) => void;
  onSubmit: NonNullable<React.ComponentProps<"form">["onSubmit"]>;
}>;

function HeroEmailForm({
  email,
  isValidEmail,
  showEmailHint,
  onEmailChange,
  onSubmit,
}: HeroEmailFormProps) {
  return (
    <motion.form
      onSubmit={onSubmit}
      className="overflow-hidden rounded-[1.75rem]  p-3 shadow-[0_18px_40px_-28px_hsl(var(--primary)/0.55)] backdrop-blur"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <Input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="Enter your business email"
            aria-invalid={showEmailHint}
            className="h-14 rounded-[1.2rem] border border-white/40 bg-background/95 px-5 text-base text-foreground shadow-none placeholder:text-muted-foreground/80 focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/15"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={!isValidEmail}
          className="h-14 rounded-full bg-primary pl-6 pr-2 text-primary-foreground shadow-none hover:bg-primary/90"
        >
          <span>Book a Demo</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background/95 text-primary shadow-sm">
            <ArrowRight className="h-4 w-4" />
          </span>
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-2 px-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground/90">Share your email and continue into the demo flow.</p>
      </div>
    </motion.form>
  );
}

function HeroPreviewCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div className="relative mx-auto max-w-[34rem] rounded-[2rem] bg-background p-4 shadow-sm ring-1 ring-border md:p-5">
        <div className="overflow-hidden rounded-[1.5rem] bg-muted">
          <div
            role="img"
            aria-label="Wellness consultation"
            className="h-[26rem] w-full bg-cover bg-center lg:h-[32rem]"
            style={{
              backgroundImage:
                'url("https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1200&q=80")',
            }}
          />
        </div>

        <div className="absolute bottom-8 right-8 rounded-[1.25rem] bg-card px-6 py-5 shadow-md ring-1 ring-border">
          <div className="flex items-center gap-1 text-primary">
            {Array.from({ length: 4 }).map((_, index) => (
              <Star key={`filled-star-${index + 1}`} className="h-5 w-5 fill-current" />
            ))}
            <Star className="h-5 w-5 fill-card stroke-primary" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-foreground">4.9 Stars</p>
          <p className="mt-1 text-sm text-muted-foreground">Average Rating</p>
        </div>
      </div>
    </motion.div>
  );
}

export function HeroSection() {
  const router = useRouter();
  const prefersReducedMotion = !!useReducedMotion();
  const [email, setEmail] = useState("");

  const isValidEmail = useMemo(() => {
    if (!email) {
      return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email]);

  const showEmailHint = email.length > 0 && !isValidEmail;

  const handleDemoRequest: NonNullable<
    React.ComponentProps<"form">["onSubmit"]
  > = (event) => {
    event.preventDefault();

    if (!isValidEmail) {
      return;
    }

    router.push(`/get-demo?email=${encodeURIComponent(email)}`);
  };

  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <header className="relative z-10">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3 text-primary transition-opacity hover:opacity-90">
            <Image
              src="/logo.svg"
              alt="Zenapt logo"
              width={40}
              height={40}
              priority
              className="h-10 w-10"
            />
            <Image
              src="/logo-text.svg"
              alt="Zenapt"
              width={132}
              height={20}
              priority
              className="h-auto w-[7.75rem] sm:w-[8.5rem]"
            />
          </Link>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 transition hover:text-primary"
              >
                {item.label}
              </a>
            ))}

            <Button asChild size="sm" className="rounded-full px-5">
              <Link href="/get-demo">Contact us</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container relative z-10 mx-auto px-4 pb-20 pt-6 lg:pb-24 lg:pt-8">
        <div className="rounded-[2.25rem] bg-card px-6 py-8 shadow-sm ring-1 ring-border md:px-10 md:py-12 lg:px-14 lg:py-14">
          <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <motion.div
              initial={prefersReducedMotion ? false : "hidden"}
              animate={prefersReducedMotion ? undefined : "visible"}
              variants={prefersReducedMotion ? undefined : staggerContainer}
              className="space-y-8"
            >
              <div className="space-y-4">
                <motion.h1
                  variants={prefersReducedMotion ? undefined : fadeInUp}
                  className="max-w-xl text-4xl font-medium leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-[4.25rem]"
                >
                 The Luxury Standard in Med Spa Management
                </motion.h1>
              </div>

              <motion.div
                variants={prefersReducedMotion ? undefined : fadeInUp}
                className="max-w-xl space-y-5"
              >
                <HeroEmailForm
                  email={email}
                  isValidEmail={isValidEmail}
                  showEmailHint={showEmailHint}
                  onEmailChange={setEmail}
                  onSubmit={handleDemoRequest}
                />
              </motion.div>

              {/* <motion.div variants={prefersReducedMotion ? undefined : fadeInUp} className="space-y-4 pt-4">
                <p className="text-lg font-medium text-foreground">
                  Whole-team clarity for a balanced clinic day
                </p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "Gain clarity", className: "bg-secondary/35 text-primary" },
                    { label: "Manage schedules", className: "bg-primary/10 text-foreground" },
                    { label: "Delight clients", className: "bg-muted text-foreground" },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className={`rounded-full px-4 py-2 text-sm font-medium ${item.className}`}
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </motion.div> */}
            </motion.div>

            <HeroPreviewCard />
          </div>
        </div>
      </div>
    </section>
  );
}
