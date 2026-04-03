"use client";

import Link from "next/link";
import {
  ArrowRight,
  CircleHelp,
  Mail,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FeatureShowcaseSection } from "./feature-showcase-section";
import { HeroSection } from "./hero-section";
import {
  contactOptions,
  faqs,
} from "./landing-data";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function MarketingLandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <HeroSection />

      <FeatureShowcaseSection />

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
                    <a href="mailto:brett@zenapt.studio">
                      Email brett@zenapt.studio
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

      <SiteFooter />
    </main>
  );
}
