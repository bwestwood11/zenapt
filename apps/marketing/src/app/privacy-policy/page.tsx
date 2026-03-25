import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navItems } from "@/components/landing/landing-data";

export const metadata: Metadata = {
  title: "SMS & Messaging Privacy Policy | Zenapt",
  description:
    "Review how Zenapt collects, uses, and protects information for SMS and text messaging sent through Zenapt toll-free numbers.",
};

const messagePurposes = [
  "For med spa customers (end users): appointment reminders, scheduling updates, promotions, and support notifications.",
  "For med spa clients using Zenapt: account updates, onboarding messages, and support notifications.",
  "All messaging is sent only to recipients who have explicitly opted in.",
];

const consentCards = [
  {
    title: "End users",
    description:
      "Consent is collected through booking forms on our clients’ websites using an unchecked checkbox with clear language about SMS messages, frequency, and the ability to opt out.",
  },
  {
    title: "Med spa clients",
    description:
      "Consent is collected during Zenapt account creation through an unchecked checkbox covering SMS account notifications.",
  },
];

const heroHighlights = [
  "Explicit opt-in only",
  "STOP and HELP support flows",
  "Built for compliant toll-free messaging",
];

type PrivacySectionProps = Readonly<{
  index: string;
  title: string;
  children: React.ReactNode;
}>;

function PrivacySection({ index, title, children }: PrivacySectionProps) {
  return (
    <section className="grid gap-6 border-t border-border/80 pt-10 md:grid-cols-[104px_minmax(0,1fr)] md:gap-10 md:pt-14">
      <div className="flex items-start md:justify-center">
        <div className="flex h-14 min-w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/8 px-4 font-serif text-xl tracking-[0.28em] text-primary md:sticky md:top-24 md:h-16 md:min-w-16 md:text-2xl">
          {index}
        </div>
      </div>
      <div className="space-y-5 md:space-y-6">
        <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-[2.4rem]">
          {title}
        </h2>
        <div className="space-y-4 text-base leading-8 text-muted-foreground sm:text-[1.05rem]">
          {children}
        </div>
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-background">
        <header className="relative z-10">
          <div className="container mx-auto flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 text-primary transition-opacity hover:opacity-90"
            >
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
                <Link
                  key={item.href}
                  href={`/${item.href}`}
                  className="rounded-full px-3 py-2 transition hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}

              <Button asChild size="sm" className="rounded-full px-5">
                <Link href="/get-demo">Contact us</Link>
              </Button>
            </div>
          </div>
        </header>
      </div>

      <section className="relative overflow-hidden border-b border-border/70 bg-gradient-to-b from-background via-card to-muted/20">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />

        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end lg:gap-14">
          <div className="relative z-10">
            <div className="inline-flex items-center rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-xs font-medium uppercase tracking-[0.28em] text-primary">
              Legal & Compliance
            </div>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[0.98] tracking-tight text-foreground sm:text-6xl lg:text-[4.5rem]">
              SMS & Messaging Privacy Policy
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
              This policy explains how Zenapt collects, uses, and protects
              information for SMS and text messaging sent through our toll-free
              numbers for both med spa clients and their customers.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3 text-sm text-muted-foreground shadow-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Effective date: March 24, 2026
              </div>
              <Link
                href="mailto:support@zenapt.studio"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition hover:border-primary/30 hover:text-primary"
              >
                Contact support
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative z-10 rounded-[2rem] border border-border bg-card p-6 shadow-lg sm:p-7">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">
              Quick summary
            </p>
            <div className="mt-5 space-y-3">
              {heroHighlights.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-border/80 bg-background px-4 py-4"
                >
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="text-sm leading-7 text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:px-8 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-border bg-card/90 p-6 shadow-xl sm:p-8 lg:p-10">
          <div className="mx-auto max-w-5xl space-y-10 sm:space-y-12">
            <PrivacySection index="01" title="Messaging purpose">
              <p>
                Zenapt uses its toll-free number to send messaging for both end
                users receiving communications from med spas and for business
                clients using Zenapt.
              </p>
              <div className="rounded-[1.75rem] border border-border bg-background p-6 shadow-sm sm:p-7">
                <ul className="space-y-4">
                  {messagePurposes.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </PrivacySection>

            <PrivacySection index="02" title="How consent is collected">
              <p>
                Consent is collected separately for end users and for Zenapt’s
                business clients. In each case, consent is obtained through a
                clear, unchecked checkbox flow.
              </p>
              <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                {consentCards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-[1.6rem] border border-border bg-background px-5 py-5 shadow-sm sm:px-6 sm:py-6"
                  >
                    <h3 className="font-serif text-xl font-medium text-foreground">
                      {card.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
                      {card.description}
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-primary/15 bg-primary/8 px-5 py-4 text-sm leading-7 text-foreground/85">
                Consent is not a condition of purchase or service.
              </div>
            </PrivacySection>

            <PrivacySection index="03" title="Opt-in and confirmation">
              <p>
                Once a user or client opts in, they receive a confirmation SMS
                with standard disclosure language about frequency, rates, and
                opt-out instructions.
              </p>
              <div className="rounded-[1.75rem] border border-primary/15 bg-gradient-to-br from-primary/8 to-background p-6 shadow-sm sm:p-7">
                <p className="font-serif text-xl italic leading-9 text-foreground/85 sm:text-2xl">
                  “You have successfully opted in to receive SMS messages from
                  [Business Name]. Message frequency varies. Msg & data rates
                  may apply. Reply STOP to opt out or HELP for help.”
                </p>
              </div>
            </PrivacySection>

            <PrivacySection index="04" title="Opt-out">
              <p>
                Recipients may opt out of SMS messages at any time by replying
                STOP to any SMS message.
              </p>
              <p>
                Recipients can get help by replying HELP or by contacting
                support@zenapt.studio for Zenapt clients, or the relevant med
                spa directly for end users.
              </p>
              <p>
                Once a user opts out, no further SMS messages will be sent
                unless they explicitly re-subscribe.
              </p>
            </PrivacySection>

            <PrivacySection index="05" title="Message & data rates">
              <p>
                Standard message and data rates may apply depending on a
                recipient’s carrier and plan. Carriers are not responsible for
                delayed or undelivered messages.
              </p>
            </PrivacySection>

            <PrivacySection index="06" title="Data collection & use">
              <p>
                Zenapt collects phone numbers and any information required to
                send SMS messages.
              </p>
              <p>We use this information only to:</p>
              <div className="rounded-[1.75rem] border border-border bg-background p-6 shadow-sm sm:p-7">
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>Deliver SMS messages as described above.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>Provide service and support notifications.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>Maintain account and messaging records for compliance.</span>
                  </li>
                </ul>
              </div>
              <p>
                We do not share end-user phone numbers with third parties except
                as required to process messages or as required by law.
              </p>
            </PrivacySection>

            <PrivacySection index="07" title="Security & retention">
              <p>
                Zenapt uses administrative, technical, and organizational
                safeguards to protect phone numbers and messaging data.
              </p>
              <p>
                We retain SMS opt-in consent and messaging records for as long
                as necessary to provide services, comply with legal obligations,
                and support audit requirements.
              </p>
            </PrivacySection>

            <PrivacySection index="08" title="Updates to this policy">
              <p>
                We may update this policy from time to time. Changes will be
                posted on this page with the updated effective date.
              </p>
            </PrivacySection>

            <PrivacySection index="09" title="Contact us">
              <p>
                For questions about SMS messages, consent, or this policy,
                contact Zenapt using the information below.
              </p>
              <div className="max-w-xl rounded-[1.75rem] border border-border bg-background px-6 py-6 shadow-sm sm:px-7 sm:py-7">
                <p className="font-serif text-2xl font-medium text-foreground">Zenapt</p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Messaging Privacy Support
                </p>
                <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                  <a
                    href="mailto:support@zenapt.studio"
                    className="flex items-center gap-3 transition hover:text-foreground"
                  >
                    <Mail className="h-4 w-4 text-primary" />
                    support@zenapt.studio
                  </a>
                  <Link
                    href="/get-demo"
                    className="inline-flex items-center gap-2 font-medium text-foreground transition hover:text-primary"
                  >
                    Contact the team
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </PrivacySection>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card/50 px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Zenapt. Privacy-forward booking operations for med spas.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacy-policy" className="transition hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="transition hover:text-foreground">
              Terms of Service
            </Link>
            <a
              href="mailto:support@zenapt.studio"
              className="transition hover:text-foreground"
            >
              support@zenapt.studio
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}