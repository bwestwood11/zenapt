"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CircleHelp,
  Mail,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroSection } from "./hero-section";
import {
  contactOptions,
  faqs,
  operatingRhythm,
  platformHighlights,
  platformPillars,
  workflowItems,
} from "./landing-data";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function MarketingLandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <HeroSection />

      <section id="what-we-do" className="py-20 lg:py-24">
        <div className="container mx-auto px-4">
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="What we do"
              title="One operating system for your schedule, team, and client experience."
              description="Zenapt gives med spas a calmer way to manage appointments, specialists, locations, payments, and follow-up without stitching together disconnected tools."
            />
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-6 md:grid-cols-3">
              {platformHighlights.map(({ title, description, icon: Icon }, index) => (
                <Reveal key={title} delay={index * 0.08}>
                  <Card className="h-full rounded-[24px] border-border bg-card shadow-sm">
                    <CardHeader>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl text-foreground">
                        {title}
                      </CardTitle>
                      <CardDescription className="text-base leading-7 text-muted-foreground">
                        {description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.18}>
              <Card className="h-full rounded-[24px] border-border bg-muted/35 shadow-sm">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-background text-primary shadow-sm">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl text-foreground">
                    From inquiry to collected payment
                  </CardTitle>
                  <CardDescription className="text-base leading-7 text-muted-foreground">
                    Keep the booking lifecycle visible for your operators,
                    providers, and leadership team.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {platformPillars.map(({ title, description, icon: Icon }) => (
                    <div
                      key={title}
                      className="rounded-[20px] border border-border bg-background p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{title}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      <section
        id="platform"
        className="border-y border-border bg-muted/25 py-20 lg:py-24"
      >
        <div className="container mx-auto px-4">
          <Reveal>
            <SectionHeading
              eyebrow="Platform"
              title="Designed around the rhythm of a busy med spa day."
              description="Make it easy for your team to coordinate bookings, specialists, services, and revenue operations inside a workflow that feels premium and dependable."
            />
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
            <div className="grid gap-6 md:grid-cols-2">
              {workflowItems.map(({ title, description, icon: Icon }, index) => (
                <Reveal key={title} delay={index * 0.08}>
                  <Card className="h-full rounded-[24px] border-border bg-card shadow-sm">
                    <CardHeader>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl text-foreground">{title}</CardTitle>
                      <CardDescription className="text-base leading-7 text-muted-foreground">
                        {description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.14}>
              <div className="rounded-[24px] border border-border bg-card p-6 shadow-sm">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                    Daily operating rhythm
                  </p>
                  <h3 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                    Keep the entire clinic team aligned without extra overhead.
                  </h3>
                  <p className="mt-4 text-base leading-8 text-muted-foreground">
                    Give staff a shared source of truth for every appointment,
                    handoff, and payment moment.
                  </p>

                  <div className="mt-8 space-y-4">
                    {operatingRhythm.map((item, index) => (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, x: 12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.45, delay: index * 0.1 }}
                        className="rounded-[20px] border border-border bg-muted/35 p-5"
                      >
                        <div className="flex gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background text-sm font-semibold text-primary">
                            0{index + 1}
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-foreground">
                              {item.title}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="faq" className="py-20 lg:py-24">
        <div className="container mx-auto px-4">
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="FAQ"
              title="Common questions from med spa teams evaluating Zenapt."
              description="A quick overview of how the platform fits clinics with growing operational complexity."
            />
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {faqs.map(({ question, answer }, index) => (
              <Reveal key={question} delay={index * 0.06}>
                <Card className="h-full rounded-[24px] border-border bg-card shadow-sm">
                  <CardHeader>
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-primary">
                      <CircleHelp className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-xl text-foreground">
                      {question}
                    </CardTitle>
                    <CardDescription className="text-base leading-7 text-muted-foreground">
                      {answer}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="border-t border-border bg-background py-20 lg:py-24"
      >
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <Reveal>
              <div className="space-y-6">
                <SectionHeading
                  eyebrow="Contact"
                  title="Ready to modernize your med spa workflow?"
                  description="Tell us about your clinic, locations, and scheduling needs. We will walk you through the platform and show how Zenapt supports your team."
                />

                <div className="flex flex-wrap gap-4">
                  <Button
                    asChild
                    size="lg"
                    className="rounded-full px-6"
                  >
                    <Link href="/get-demo">
                      Request your demo
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="rounded-full border-border bg-background px-6 text-foreground hover:bg-accent"
                  >
                    <a href="mailto:support@zenapt.studio">
                      Email support@zenapt.studio
                    </a>
                  </Button>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <Card className="rounded-[24px] border-border bg-muted/35 shadow-sm">
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-primary">
                    <Mail className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl text-foreground">
                    Choose the path that fits your team best.
                  </CardTitle>
                  <CardDescription className="text-base leading-7 text-muted-foreground">
                    Whether you are exploring the platform or preparing for
                    rollout, we can guide the next step.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contactOptions.map(({ title, description, icon: Icon }) => (
                    <div
                      key={title}
                      className="rounded-[20px] border border-border bg-background p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-primary shadow-sm">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{title}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Zenapt. Booking management software for med spas.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacy-policy" className="transition hover:text-primary">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="transition hover:text-primary">
              Terms of Service
            </Link>
            <a
              href="mailto:support@zenapt.studio"
              className="transition hover:text-primary"
            >
              support@zenapt.studio
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
