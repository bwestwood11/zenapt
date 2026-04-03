import Image from "next/image";
import {
  BadgeCheck,
  BellRing,
  CalendarCheck2,
  CalendarSync,
  CalendarRange,
  Clock3,
  Globe,
  Hourglass,
  MessageSquareText,
  Move,
  Repeat2,
  Send,
  Settings2,
  Sparkles,
  Smartphone,
  Target,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "./reveal";

const showcaseFrameClass =
  "relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,236,225,0.88)_100%)] p-4 shadow-[0_30px_80px_-45px_rgba(79,54,20,0.28)] lg:p-5";

const showcasePanelClass =
  "rounded-[22px] border border-white/60 bg-background/55 p-5 sm:p-6";

const featureCardClass =
  "rounded-[20px] border border-border/70 bg-card/90 p-5 shadow-[0_18px_40px_-36px_rgba(73,49,17,0.28)]";

const statCardClass =
  "rounded-[20px] border border-border/70 bg-card/90 p-5 shadow-[0_18px_40px_-36px_rgba(73,49,17,0.2)]";

const iconShellClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary";

const schedulingHighlights = [
  {
    icon: CalendarCheck2,
    text: "Schedule and check out directly within the calendar view",
  },
  {
    icon: BellRing,
    text: "Automate confirmations and reminders via SMS or email",
  },
  {
    icon: Repeat2,
    text: "Effortlessly create repeating appointments",
  },
  {
    icon: CalendarRange,
    text: "Block one-time or recurring time on your calendar",
  },
  {
    icon: Move,
    text: "Drag and drop rescheduling across slots and providers",
  },
  {
    icon: Hourglass,
    text: "Add service-specific buffers and prep times",
  },
];

const bookingHighlights = [
  {
    icon: Globe,
    title: "Native Website Integration",
    description:
      "Embed our sleek booking interface directly on your existing website.",
  },
  {
    icon: Settings2,
    title: "Full Customization",
    description:
      "Choose which services and providers are available for online booking.",
  },
  {
    icon: Wallet,
    title: "Payment & Policy Protection",
    description:
      "Require deposits or hold cards for your custom no-show and cancellation policies.",
  },
  {
    icon: Zap,
    title: "Instant Notifications",
    description:
      "Stay updated with real-time alerts for every new online booking.",
  },
];

const marketingHighlights = [
  {
    icon: Sparkles,
    title: "Drag & Drop Email Templates",
    description:
      "Create polished campaigns without relying on outside design support.",
  },
  {
    icon: Target,
    title: "Targeted Audience Filtering",
    description:
      "Segment by visit history, provider, service, and engagement signals.",
  },
];

const marketingStats = [
  {
    value: "45%",
    label: "re-booking lift",
  },
  {
    value: "12x",
    label: "audience targeting",
  },
];

const smsHighlights = [
  {
    icon: Send,
    title: "SMS Marketing Campaigns",
    description: "Send timed promotions and flash sales directly to patient phones.",
  },
  {
    icon: BadgeCheck,
    title: "Appointment Reminders",
    description: "Reduce no-shows with automatic reminders before every visit.",
  },
  {
    icon: CalendarSync,
    title: "Real-time Schedule Updates",
    description: "Instantly communicate changes in provider availability or timing.",
  },
  {
    icon: MessageSquareText,
    title: "Two-Way Messaging",
    description: "Let patients confirm or reschedule appointments with a quick reply.",
  },
];

type SectionCopyProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
}>;

type FeatureTextCardProps = Readonly<{
  icon: LucideIcon;
  text: string;
}>;

type FeatureDetailCardProps = Readonly<{
  icon: LucideIcon;
  title: string;
  description: string;
}>;

function SectionCopy({ eyebrow, title, description }: SectionCopyProps) {
  return (
    <div className="max-w-[34rem] space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">
        {eyebrow}
      </p>
      <h2 className="text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
        {title}
      </h2>
      <p className="text-lg leading-8 text-muted-foreground">{description}</p>
    </div>
  );
}

function FeatureTextCard({ icon: Icon, text }: FeatureTextCardProps) {
  return (
    <div className={`${featureCardClass} flex h-full items-start gap-4`}>
      <div className={iconShellClass}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="pt-0.5 text-sm leading-6 text-foreground/86">{text}</p>
    </div>
  );
}

function FeatureDetailCard({ icon: Icon, title, description }: FeatureDetailCardProps) {
  return (
    <div className={`${featureCardClass} h-full`}>
      <div className={iconShellClass}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function FeatureShowcaseSection() {
  return (
    <section id="what-we-do" className="py-20 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="space-y-20 lg:space-y-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.03fr)_minmax(0,0.97fr)] lg:gap-16">
            <Reveal>
              <div className={showcaseFrameClass}>
                <div className="relative overflow-hidden rounded-[22px] border border-white/60 bg-background/70">
                  <Image
                    src="/screens/calendar.png"
                    alt="Zenapt calendar and scheduling preview"
                    width={1600}
                    height={1100}
                    priority={false}
                    className="aspect-[16/10] h-auto w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/18 via-transparent to-white/10" />
                </div>

                <div className="absolute inset-x-6 bottom-6 max-w-[22rem] rounded-[20px] border border-white/75 bg-background/92 p-5 shadow-[0_20px_50px_-32px_rgba(54,36,13,0.35)] backdrop-blur-md lg:inset-x-auto lg:left-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <CalendarCheck2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">March 20, 2024</p>
                      <p className="text-xs text-muted-foreground">48 Appointments Today</p>
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-primary/12">
                    <div className="h-full w-[78%] rounded-full bg-primary" />
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="space-y-8">
                <SectionCopy
                  eyebrow="Operational Excellence"
                  title="Calendar &amp; Scheduling"
                  description="A modern and sleek design that transforms complex logistics into a fluid, effortless experience for your staff."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  {schedulingHighlights.map(({ icon: Icon, text }) => (
                    <FeatureTextCard key={text} icon={Icon} text={text} />
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.97fr)_minmax(0,1.03fr)] lg:gap-16">
            <Reveal>
              <div className="space-y-8">
                <SectionCopy
                  eyebrow="Client Experience"
                  title="Online Booking"
                  description="Deliver a premium, high-converting booking experience that mirrors the luxury of your physical space."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  {bookingHighlights.map(({ icon: Icon, title, description }) => (
                    <FeatureDetailCard
                      key={title}
                      icon={Icon}
                      title={title}
                      description={description}
                    />
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="flex justify-center lg:justify-end">
                <div className={showcaseFrameClass}>
                  <div className={`${showcasePanelClass} flex min-h-[30rem] items-center justify-center`}>
                    <div className="w-full max-w-[29rem] rounded-[24px] border border-white/70 bg-background px-6 py-7 shadow-[0_24px_50px_-40px_rgba(62,42,13,0.32)] sm:px-7 sm:py-8">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary/80">
                          Aura Spa Booking
                        </p>
                        <span className="rounded-full border border-border bg-muted/35 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Live booking
                        </span>
                      </div>

                      <div className="mt-8 space-y-6">
                        <div>
                          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Selected Treatment
                          </p>
                          <div className="mt-3 flex items-center justify-between rounded-[16px] border border-border bg-muted/35 px-4 py-3.5">
                            <span className="text-sm font-medium text-foreground">Diamond Glow Facial</span>
                            <span className="text-sm font-semibold text-primary">$225</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Available Times
                          </p>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              className="rounded-[14px] border border-primary bg-background px-4 py-3.5 text-sm font-medium text-foreground shadow-sm"
                            >
                              10:30 AM
                            </button>
                            <button
                              type="button"
                              className="rounded-[14px] border border-border bg-background px-4 py-3.5 text-sm font-medium text-muted-foreground"
                            >
                              1:00 PM
                            </button>
                          </div>
                        </div>

                        <p className="text-xs italic leading-5 text-muted-foreground">
                          A $50 deposit is required to secure this appointment.
                        </p>

                        <button
                          type="button"
                          className="w-full rounded-[14px] bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                        >
                          Confirm &amp; Pay Deposit
                        </button>

                        <div className="rounded-[18px] border border-border bg-muted/35 px-4 py-3">
                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Booking secured
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">Deposit protected</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.03fr)_minmax(0,0.97fr)] lg:gap-16">
            <Reveal>
              <div className={showcaseFrameClass}>
                <div className={`${showcasePanelClass} grid min-h-[30rem] gap-4 sm:grid-cols-2`}>
                  {marketingHighlights.map(({ icon: Icon, title, description }) => (
                    <FeatureDetailCard
                      key={title}
                      icon={Icon}
                      title={title}
                      description={description}
                    />
                  ))}

                  <div className={`${featureCardClass} sm:col-span-2`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Campaign performance
                        </p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          High engagement across segments
                        </p>
                      </div>
                      <div className="rounded-full border border-border bg-muted/35 px-4 py-2 text-sm font-medium text-foreground">
                        82% completion rate
                      </div>
                    </div>
                    <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-primary/10">
                      <div className="h-full w-[82%] rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="space-y-8">
                <SectionCopy
                  eyebrow="Growth Engine"
                  title="Omnichannel Marketing Hub"
                  description="Turn first-time visitors into loyal clients with campaigns across email, promotions, and targeted follow-up moments."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  {marketingStats.map(({ value, label }) => (
                    <div key={label} className={statCardClass}>
                      <p className="text-3xl font-semibold tracking-tight text-primary">{value}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.97fr)_minmax(0,1.03fr)] lg:gap-16">
            <Reveal>
              <div className="space-y-8">
                <SectionCopy
                  eyebrow="Instant Connection"
                  title="Seamless SMS Communication"
                  description="Reach patients on the device they already use with reminders, updates, and promotional messages that feel timely and personal."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  {smsHighlights.map(({ icon: Icon, title, description }) => (
                    <FeatureDetailCard
                      key={title}
                      icon={Icon}
                      title={title}
                      description={description}
                    />
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="flex justify-center lg:justify-end">
                <div className={showcaseFrameClass}>
                  <div className={`${showcasePanelClass} flex min-h-[30rem] items-center justify-center`}>
                    <div className="mx-auto w-[18rem] rounded-[2.6rem] bg-[#1d1d1d] p-3 shadow-[0_30px_60px_-28px_rgba(0,0,0,0.55)]">
                    <div className="rounded-[2rem] bg-background px-4 pb-4 pt-5">
                      <div className="mx-auto mb-4 h-1.5 w-20 rounded-full bg-foreground/10" />
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Zenapt Spa</p>
                          <p className="text-[0.7rem] text-muted-foreground">SMS assistant</p>
                        </div>
                      </div>

                      <div className="mt-6 space-y-3">
                        <div className="ml-auto max-w-[85%] rounded-[1.1rem] rounded-tr-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
                          Hi Sarah — your Diamond Glow Facial is tomorrow at 10:30 AM. Reply YES to confirm.
                        </div>
                        <div className="max-w-[82%] rounded-[1.1rem] rounded-tl-md border border-border bg-muted/40 px-4 py-3 text-sm leading-6 text-foreground">
                          Confirmed! Please text me if anything changes.
                        </div>
                        <div className="ml-auto max-w-[85%] rounded-[1.1rem] rounded-tr-md bg-primary/90 px-4 py-3 text-sm leading-6 text-primary-foreground">
                          Perfect. We also saved a new client offer for your next visit.
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between rounded-full border border-border bg-background px-4 py-3 text-sm text-muted-foreground shadow-sm">
                        <span>Type a message…</span>
                        <Clock3 className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
