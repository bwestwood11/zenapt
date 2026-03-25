import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LifeBuoy,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
};

export type StatItem = {
  value: string;
  label: string;
  detail: string;
};

export type HighlightItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type WorkflowItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type ContactItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export const heroVideoSrc =
  "https://assets.mixkit.co/videos/preview/mixkit-woman-receiving-a-facial-treatment-at-a-spa-38397-large.mp4";

export const navItems: NavItem[] = [
  { label: "What we do", href: "#what-we-do" },
  { label: "Platform", href: "#platform" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export const heroStats: StatItem[] = [
  {
    value: "18",
    label: "Appointments today",
    detail: "Live schedule visibility with confirmation tracking.",
  },
  {
    value: "$6.4k",
    label: "Collections tracked",
    detail: "Deposits, balances, and promo performance in one flow.",
  },
  {
    value: "2",
    label: "Locations synced",
    detail: "Teams, services, and calendars connected across clinics.",
  },
];

export const trustPoints = [
  "Built for single and multi-location med spas.",
  "Scheduling, payments, and retention in one workflow.",
  "Launch faster without rebuilding your intake process.",
];

export const platformHighlights: HighlightItem[] = [
  {
    title: "Built for med spa operations",
    description:
      "Manage bookings, staff availability, services, pricing, and client activity from one polished operating system.",
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
      "Track appointment payments, promo codes, add-ons, and follow-ups that help revenue grow predictably.",
    icon: Wallet,
  },
];

export const platformPillars: HighlightItem[] = [
  {
    title: "Client experience",
    description:
      "Keep customer notes, booking history, and communication context attached to every appointment.",
    icon: Users,
  },
  {
    title: "Operational confidence",
    description:
      "Use real-time confirmations, coverage visibility, and scheduling safeguards to reduce manual follow-up.",
    icon: ShieldCheck,
  },
  {
    title: "Growth visibility",
    description:
      "Understand how services, locations, and staff contribute to revenue with cleaner reporting signals.",
    icon: TrendingUp,
  },
];

export const workflowItems: WorkflowItem[] = [
  {
    title: "Appointment scheduling",
    description:
      "Configure durations, prep time, buffer time, reschedules, and no-show tracking without sacrificing speed at the front desk.",
    icon: CalendarClock,
  },
  {
    title: "Service and staff setup",
    description:
      "Group services, assign specialists, manage locations, and keep availability aligned with the actual way your clinics operate.",
    icon: ClipboardList,
  },
  {
    title: "Client management",
    description:
      "Store customer details, preferences, histories, and internal notes so every visit feels informed and personal.",
    icon: Users,
  },
  {
    title: "Revenue operations",
    description:
      "Support deposits, add-ons, balance collection, and promo code workflows directly inside the booking journey.",
    icon: TrendingUp,
  },
];

export const operatingRhythm = [
  {
    title: "Capture the request",
    description: "Turn inquiries into qualified demo and booking conversations.",
  },
  {
    title: "Align specialists and rooms",
    description: "Match staff, services, and locations without spreadsheet coordination.",
  },
  {
    title: "Collect and follow through",
    description: "Track deposits, balances, and retention moments after the appointment.",
  },
];

export const faqs: FaqItem[] = [
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

export const contactOptions: ContactItem[] = [
  {
    title: "Book a walkthrough",
    description:
      "Use the demo flow to share your business details and select a time that works for your team.",
    icon: Sparkles,
  },
  {
    title: "Email the team",
    description:
      "Reach support@zenapt.studio for product, onboarding, or partnership questions.",
    icon: Mail,
  },
  {
    title: "Get implementation guidance",
    description:
      "Review locations, services, staff setup, and booking workflows during your intro call.",
    icon: LifeBuoy,
  },
];

export const heroChecks = [
  {
    label: "Operational visibility",
    icon: CheckCircle2,
  },
  {
    label: "Better scheduling hygiene",
    icon: ShieldCheck,
  },
  {
    label: "More revenue confidence",
    icon: TrendingUp,
  },
];
