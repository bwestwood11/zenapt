"use client";

import type React from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeroCarousel } from "./hero-carousel";

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

const heroHeaderItems = [
  { label: "Features", href: "#what-we-do" },
  { label: "Solutions", href: "#platform" },
  { label: "Testimonials", href: "#faq" },
  { label: "Pricing", href: "#contact" },
];

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
      className="mx-auto w-full max-w-[38rem] rounded-[2rem] border border-primary/15 bg-background/90 p-3 shadow-[0_24px_70px_-42px_hsl(var(--primary)/0.3)] backdrop-blur sm:p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="Enter your business email"
            aria-invalid={showEmailHint}
            className="h-14 rounded-[1.15rem] border border-transparent bg-[rgba(248,240,220,0.72)] px-5 text-base text-foreground shadow-none placeholder:text-muted-foreground/80 focus-visible:border-primary/20 focus-visible:bg-[rgba(248,240,220,0.9)] focus-visible:ring-2 focus-visible:ring-primary/15"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={!isValidEmail}
          className="h-14 rounded-[1.15rem] bg-primary px-6 text-base text-primary-foreground shadow-none hover:bg-primary/90 sm:min-w-[12rem] sm:px-7"
        >
          <span>Request Demo</span>
          <ArrowRight className="ml-2.5 h-4 w-4" />
        </Button>
      </div>

      {showEmailHint ? (
        <div className="mt-2 flex min-h-6 items-center px-1 text-left text-sm text-destructive">
          Enter a valid business email to continue.
        </div>
      ) : null}
    </motion.form>
  );
}

export function HeroSection() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
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

  const activeHeaderItem = heroHeaderItems[0]?.label;

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,165,93,0.16),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(251,247,240,0.98)_72%,rgba(244,237,226,0.78)_100%)]" />
      <div className="absolute left-1/2 top-0 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
      <div className="absolute right-[-8rem] top-[18rem] h-[18rem] w-[18rem] rounded-full bg-primary/6 blur-3xl" />

      <header className="relative z-10">
        <div className="mx-auto flex w-full max-w-[78rem] flex-col gap-5 px-4 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <Link href="/" className="flex items-center gap-3 text-primary transition-opacity hover:opacity-90">
            <Image
              src="/logo.svg"
              alt="Zenapt logo"
              width={40}
              height={40}
              priority
              className="h-8 w-8 sm:h-10 sm:w-10"
            />
            <Image
              src="/logo-text.svg"
              alt="Zenapt"
              width={132}
              height={20}
              priority
              className="h-auto w-[7.2rem] sm:w-[8.25rem]"
            />
          </Link>

          <div className="hidden items-center justify-center gap-8 lg:flex">
            {heroHeaderItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition ${
                  item.label === activeHeaderItem
                    ? "font-medium text-foreground underline decoration-primary decoration-2 underline-offset-[10px]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 self-end lg:self-auto">
            <Link
              href="/get-demo"
              className="px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              Login
            </Link>
            <Button asChild size="sm" className="h-11 rounded-[0.95rem] px-5 shadow-none">
              <Link href="/get-demo">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[78rem] px-4 pb-16 pt-6 sm:pb-20 lg:px-6 lg:pb-24 lg:pt-10">
        <div className="mx-auto max-w-[56rem] text-center">
          <motion.div
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={prefersReducedMotion ? undefined : staggerContainer}
            className="space-y-6"
          >
            <motion.div
              variants={prefersReducedMotion ? undefined : fadeInUp}
              className="space-y-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80 sm:text-sm">
                Redefining Excellence
              </p>
              <motion.h1
                variants={prefersReducedMotion ? undefined : fadeInUp}
                className="mx-auto  text-balance text-[3rem] leading-[0.95] font-medium tracking-tight text-foreground sm:text-[4rem] lg:text-[5.3rem]"
              >
                The Luxury Standard in   <br />
                Med Spa <span className="font-serif italic">Management</span>
              </motion.h1>
              <motion.p
                variants={prefersReducedMotion ? undefined : fadeInUp}
                className="mx-auto max-w-[45rem] text-lg leading-8 text-muted-foreground sm:text-xl text-pretty"
              >
                All-in-one Med Spa management platform built to streamline bookings, simplify operations and drive growth with powerful tools for scheduling, POS, marketing and analytics.
              </motion.p>
            </motion.div>

            <motion.div
              variants={prefersReducedMotion ? undefined : fadeInUp}
              className="space-y-4"
            >
              <HeroEmailForm
                email={email}
                isValidEmail={isValidEmail}
                showEmailHint={showEmailHint}
                onEmailChange={setEmail}
                onSubmit={handleDemoRequest}
              />

              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Concierge Onboarding</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>Enterprise Security</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div className="mt-12 flex justify-center lg:mt-14">
          <HeroCarousel prefersReducedMotion={!!prefersReducedMotion} />
        </div>
      </div>
    </section>
  );
}
