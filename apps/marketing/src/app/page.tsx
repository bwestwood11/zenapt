"use client";

import type React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  CircleHelp,
  ClipboardList,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

const platformHighlights = [
  {
    title: "Built for med spa operations",
    description:
      "Manage bookings, staff availability, services, pricing, and client activity from one modern workspace.",
    icon: Stethoscope,
  },
  {
    title: "Multi-location ready",
    description:
      "Coordinate schedules, teams, and service menus across every clinic without juggling disconnected tools.",
    icon: MapPin,
  },
  {
    title: "Payments and retention built in",
    description:
      "Track appointment payments, promo codes, add-ons, and client follow-ups that help revenue grow.",
    icon: Wallet,
  },
];

const services = [
  {
    title: "Appointment scheduling",
    description:
      "Keep calendars organized with service durations, prep time, buffer time, reschedules, and no-show tracking.",
    icon: CalendarClock,
  },
  {
    title: "Client management",
    description:
      "Store customer details, notes, booking history, and communications so every visit feels personal.",
    icon: Users,
  },
  {
    title: "Service and staff setup",
    description:
      "Organize service groups, assign specialists, manage locations, and keep availability aligned with daily operations.",
    icon: ClipboardList,
  },
  {
    title: "Revenue operations",
    description:
      "Support deposits, balance collection, promo codes, and performance visibility in one booking workflow.",
    icon: TrendingUp,
  },
];

const faqs = [
  {
    question: "Who is Zenapt built for?",
    answer:
      "Zenapt is designed for med spas and aesthetic clinics that need a better way to manage bookings, staff schedules, locations, and client experiences.",
  },
  {
    question: "Can Zenapt support multiple locations?",
    answer:
      "Yes. The platform is structured for organizations that run one or many locations, with staff, services, and appointments managed in a shared system.",
  },
  {
    question: "Does it cover payments and promotions?",
    answer:
      "Yes. Zenapt supports payment tracking, deposits, balances, refunds, add-ons, and promo code workflows tied to appointments.",
  },
  {
    question: "How do we get in touch or book a demo?",
    answer:
      "Use the demo request flow to share your business details and preferred time, or email support@zenapt.studio for direct help from the team.",
  },
];

export default function MarketingLandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isValidEmail, setIsValidEmail] = useState(false);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    setEmail(value);
    setIsValidEmail(validateEmail(value));
  };

  const handleDemoRequest: NonNullable<
    React.ComponentProps<"form">["onSubmit"]
  > = (event) => {
    event.preventDefault();

    if (isValidEmail) {
      router.push(`/get-demo?email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-violet-50/40 to-white text-slate-900">
      <section className="border-b border-violet-100/80 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold tracking-tight text-violet-700">
              Zenapt
            </p>
            <p className="text-sm text-slate-600">
              Booking management software for modern med spas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <a href="#what-we-do" className="transition hover:text-violet-700">
              What we do
            </a>
            <a href="#services" className="transition hover:text-violet-700">
              Services
            </a>
            <a href="#faq" className="transition hover:text-violet-700">
              FAQ
            </a>
            <a href="#contact" className="transition hover:text-violet-700">
              Contact
            </a>
            <Button
              asChild
              size="sm"
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              <Link href="/get-demo">Book a demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700">
              <Sparkles className="h-4 w-4" />
              Built for med spas that need better scheduling and client operations
            </div>

            <div className="space-y-6">
              <h1 className="max-w-4xl text-5xl font-bold leading-tight tracking-tight lg:text-6xl">
                The booking management solution for med spas
              </h1>

              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Zenapt helps med spa teams manage appointments, clients,
                services, staff, locations, and payments in one place. It is
                built to reduce operational friction while helping clinics stay
                organized as they grow.
              </p>
            </div>

            <form onSubmit={handleDemoRequest} className="space-y-4">
              <div className="flex max-w-xl flex-col gap-3 sm:flex-row">
                <Input
                  type="email"
                  placeholder="Enter your business email"
                  value={email}
                  onChange={handleEmailChange}
                  className="h-12 border-slate-300 text-base focus:border-violet-500 focus:ring-violet-500"
                />
                <Button
                  type="submit"
                  disabled={!isValidEmail}
                  className="h-12 bg-violet-600 px-6 font-medium text-white hover:bg-violet-700 disabled:bg-slate-300 disabled:text-slate-500"
                >
                  Request a demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <span>Keep the existing booking flow and launch faster.</span>
                <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
                <span>Designed for single and multi-location clinics.</span>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Calendar className="h-5 w-5 text-violet-600" />
                Smart scheduling
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Users className="h-5 w-5 text-violet-600" />
                Client management
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <TrendingUp className="h-5 w-5 text-violet-600" />
                Revenue visibility
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -rotate-3 rounded-[2rem] bg-gradient-to-br from-violet-200 via-fuchsia-100 to-white" />
            <Card className="relative overflow-hidden border-violet-100 bg-white/95 shadow-2xl">
              <CardHeader className="border-b border-violet-100 bg-violet-50/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Operations snapshot</CardTitle>
                    <CardDescription>
                      A single view of today&apos;s med spa activity
                    </CardDescription>
                  </div>
                  <div className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
                    Live
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Appointments today</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">18</p>
                    <p className="mt-1 text-sm text-emerald-600">
                      3 pending confirmations
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Collections</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">$6.4k</p>
                    <p className="mt-1 text-sm text-violet-700">
                      Deposits and balances tracked
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        Botox consultation
                      </p>
                      <p className="text-sm text-slate-600">
                        Sarah Johnson • 10:00 AM • Confirmed
                      </p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">Laser session</p>
                      <p className="text-sm text-slate-600">
                        Emma Davis • 2:30 PM • Deposit captured
                      </p>
                    </div>
                    <Wallet className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        Team coverage
                      </p>
                      <p className="text-sm text-slate-600">
                        4 specialists active across 2 locations
                      </p>
                    </div>
                    <Users className="h-5 w-5 text-slate-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="what-we-do" className="container mx-auto px-4 py-8 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-600">
            What we do
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
            Zenapt gives med spas one platform to run bookings, staff, and
            client operations.
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Instead of managing appointments, services, specialists, locations,
            and payments in separate systems, your team gets a single workflow
            designed for the realities of aesthetic care.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {platformHighlights.map(({ title, description, icon: Icon }) => (
            <Card key={title} className="border-violet-100 shadow-sm">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="text-base leading-7 text-slate-600">
                  {description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section id="services" className="bg-slate-950 py-20 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-300">
              Our services
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
              Everything your front desk and operations team need to keep the
              schedule full and the day under control.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              From booking workflows to client follow-up, Zenapt is designed to
              help med spas operate with more consistency and less manual work.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {services.map(({ title, description, icon: Icon }) => (
              <Card
                key={title}
                className="border-white/10 bg-white/5 text-white shadow-none"
              >
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription className="text-base leading-7 text-slate-300">
                    {description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-600">
            FAQ
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
            Common questions from med spa teams evaluating Zenapt.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {faqs.map(({ question, answer }) => (
            <Card key={question} className="border-violet-100 shadow-sm">
              <CardHeader>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <CircleHelp className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">{question}</CardTitle>
                <CardDescription className="text-base leading-7 text-slate-600">
                  {answer}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section
        id="contact"
        className="border-t border-violet-100 bg-violet-50/70 py-20"
      >
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-600">
                Contact us
              </p>
              <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
                Ready to talk through your med spa workflow?
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Tell us about your clinic, locations, and scheduling needs. We
                will walk you through the platform and help you understand how
                Zenapt fits your booking operations.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  asChild
                  className="bg-violet-600 text-white hover:bg-violet-700"
                >
                  <Link href="/get-demo">Request your demo</Link>
                </Button>
                <Button asChild variant="outline">
                  <a href="mailto:support@zenapt.studio">Email support@zenapt.studio</a>
                </Button>
              </div>
            </div>

            <Card className="border-violet-100 bg-white shadow-sm">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Mail className="h-6 w-6" />
                </div>
                <CardTitle>How to contact us</CardTitle>
                <CardDescription className="text-base leading-7 text-slate-600">
                  Choose the path that fits your team best.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Book a walkthrough</p>
                  <p className="mt-1 leading-6">
                    Use the existing demo flow to share your business details
                    and select a time that works for your team.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Send us an email</p>
                  <p className="mt-1 leading-6">
                    Reach the team directly at support@zenapt.studio for product,
                    onboarding, or partnership questions.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">
                    Get implementation guidance
                  </p>
                  <p className="mt-1 leading-6">
                    We can review locations, services, staff setup, and booking
                    workflows during your intro call.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
