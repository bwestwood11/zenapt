import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail, Scale } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { navItems } from "@/components/landing/landing-data";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Terms of Service | Zenapt",
  description:
    "Review the Zenapt Terms of Service governing access to the Zenapt platform, products, messaging services, and associated websites.",
};

const summaryHighlights = [
  "Applies to platform access and SMS messaging services",
  "Explicit opt-in requirements for customers and med spa clients",
  "Clear usage rules, privacy terms, and account responsibilities",
];

const accountTypes = [
  {
    title: "Med spa clients",
    description:
      "To access the Services, businesses must create an account using accurate contact information and maintain the security of their login credentials.",
  },
  {
    title: "End users",
    description:
      "Customers of med spas may access messaging services only after providing consent through booking forms or other approved opt-in mechanisms.",
  },
];

const smsPurposes = [
  "For end users: appointment reminders, scheduling updates, promotions, and support notifications.",
  "For med spa clients: account notifications, onboarding messages, and support updates.",
  "Consent is not a condition of purchase or service and must be actively provided.",
];

const prohibitedUses = [
  "Send unauthorized or unsolicited messages.",
  "Use the Services to harass, threaten, or defraud others.",
  "Circumvent security, authentication, or consent mechanisms.",
];

type TermsSectionProps = Readonly<{
  index: string;
  title: string;
  children: React.ReactNode;
}>;

function TermsSection({ index, title, children }: TermsSectionProps) {
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

export default function TermsOfServicePage() {
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
              Zenapt Terms of Service
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
              These Terms govern access to and use of the Zenapt platform,
              products, services, messaging features, and associated websites.
              By using the Services, you agree to these Terms.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3 text-sm text-muted-foreground shadow-sm">
                <Scale className="h-4 w-4 text-primary" />
                Effective date: March 24, 2026
              </div>
              <Link
                href="mailto:brett@zenapt.studio"
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
              {summaryHighlights.map((item) => (
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
            <TermsSection index="01" title="Eligibility">
              <p>
                You must be at least 18 years old and capable of entering into
                a binding contract to use Zenapt. By using the Services, you
                represent and warrant that you meet these requirements.
              </p>
            </TermsSection>

            <TermsSection index="02" title="Account registration">
              <p>
                Accounts must not be shared. You are responsible for
                maintaining the confidentiality of your login credentials and
                for activity that occurs under your account.
              </p>
              <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                {accountTypes.map((card) => (
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
            </TermsSection>

            <TermsSection index="03" title="SMS / Text messaging">
              <p>
                Zenapt provides SMS and text messaging services through a
                toll-free number for two main purposes.
              </p>
              <div className="rounded-[1.75rem] border border-border bg-background p-6 shadow-sm sm:p-7">
                <ul className="space-y-4">
                  {smsPurposes.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p>
                End users must explicitly opt in via an unchecked checkbox with
                clear language about the messages they will receive, and med spa
                clients must explicitly opt in during account creation.
              </p>
            </TermsSection>

            <TermsSection index="04" title="Opt-in, opt-out, and help">
              <p>
                End users and clients must actively provide consent via forms
                or checkboxes before receiving SMS messages.
              </p>
              <div className="rounded-[1.75rem] border border-primary/15 bg-gradient-to-br from-primary/8 to-background p-6 shadow-sm sm:p-7">
                <p className="font-serif text-xl italic leading-9 text-foreground/85 sm:text-2xl">
                  “You have successfully opted in to receive SMS messages from
                  [Business Name]. Message frequency varies. Msg & data rates
                  may apply. Reply STOP to opt out or HELP for help.”
                </p>
              </div>
              <p>
                Recipients may reply STOP at any time to unsubscribe. They may
                reply HELP for assistance or contact brett@zenapt.studio for
                clients, or the relevant med spa directly for end users.
                Standard carrier message and data rates may apply.
              </p>
            </TermsSection>

            <TermsSection index="05" title="Use of the Services">
              <p>
                You agree to use the Services only for lawful purposes and in
                compliance with all applicable laws, including anti-spam
                regulations.
              </p>
              <p>You may not:</p>
              <div className="rounded-[1.75rem] border border-border bg-background p-6 shadow-sm sm:p-7">
                <ul className="space-y-4">
                  {prohibitedUses.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p>
                Zenapt reserves the right to suspend or terminate accounts for
                violations of these rules.
              </p>
            </TermsSection>

            <TermsSection index="06" title="Data collection and privacy">
              <p>
                Zenapt collects and processes phone numbers and related
                information to deliver SMS messages, account updates, and
                support notifications.
              </p>
              <p>
                We retain messaging data and opt-in consent for audit and
                compliance purposes. Zenapt does not share end-user phone
                numbers with third parties except for message processing or when
                required by law.
              </p>
              <div className="rounded-2xl border border-primary/15 bg-primary/8 px-5 py-4 text-sm leading-7 text-foreground/85">
                For more details, review our <Link href="/privacy-policy" className="font-medium text-primary underline underline-offset-4">Privacy Policy</Link>.
              </div>
            </TermsSection>

            <TermsSection index="07" title="Intellectual property">
              <p>
                All content, logos, and software on Zenapt’s platform are the
                property of Zenapt or its licensors. You may not reproduce,
                distribute, or create derivative works without permission.
              </p>
            </TermsSection>

            <TermsSection index="08" title="Disclaimer of warranties">
              <p>
                The Services are provided “as is” without warranties of any
                kind, either express or implied. Zenapt does not guarantee
                message delivery or uninterrupted access to the Services.
              </p>
            </TermsSection>

            <TermsSection index="09" title="Limitation of liability">
              <p>
                To the maximum extent permitted by law, Zenapt shall not be
                liable for any indirect, incidental, special, or consequential
                damages arising out of the use or inability to use the Services,
                including SMS delivery issues.
              </p>
            </TermsSection>

            <TermsSection index="10" title="Termination">
              <p>
                Zenapt may suspend or terminate access to the Services at any
                time for violations of these Terms, inactivity, or legal
                compliance reasons. Users may terminate their own accounts at
                any time.
              </p>
            </TermsSection>

            <TermsSection index="11" title="Changes to Terms">
              <p>
                Zenapt may update these Terms from time to time. Updates will
                be posted on this page with a revised effective date. Continued
                use of the Services after updates constitutes acceptance of the
                new Terms.
              </p>
            </TermsSection>

            <TermsSection index="12" title="Governing law">
              <p>
                These Terms are governed by the laws of the state in which
                Zenapt is incorporated, without regard to conflict of law
                principles.
              </p>
            </TermsSection>

            <TermsSection index="13" title="Contact">
              <p>
                For questions about these Terms or the Services, contact
                Zenapt using the information below.
              </p>
              <div className="max-w-xl rounded-[1.75rem] border border-border bg-background px-6 py-6 shadow-sm sm:px-7 sm:py-7">
                <p className="font-serif text-2xl font-medium text-foreground">Zenapt</p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Legal Support
                </p>
                <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                  <a
                    href="mailto:brett@zenapt.studio"
                    className="flex items-center gap-3 transition hover:text-foreground"
                  >
                    <Mail className="h-4 w-4 text-primary" />
                    brett@zenapt.studio
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
            </TermsSection>
          </div>
        </div>
      </section>

      <SiteFooter className="bg-card/50" />
    </main>
  );
}