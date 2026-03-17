import type { Metadata } from "next";
import LegalPageShell from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | Zenapt",
  description:
    "Learn how Zenapt collects, uses, shares, and protects personal information across its website, demo scheduling flow, and booking management platform.",
};

const sections = [
  {
    title: "1. Scope",
    body: [
      "This Privacy Policy explains how Zenapt collects, uses, discloses, and protects information when you visit our marketing website, request a demo, communicate with our team, or use Zenapt products and related services.",
      "It applies to information provided by prospective customers, business customers, staff users, and end customers whose data may be processed through the Zenapt platform on behalf of our business customers.",
    ],
  },
  {
    title: "2. Information we collect",
    body: [
      "We may collect contact details such as names, email addresses, phone numbers, business names, job titles, website URLs, and mailing or billing information.",
      "We may collect account and service data such as organization details, location details, scheduling settings, services, staff records, appointment information, payment-related metadata, and customer communication preferences.",
      "We may collect technical and usage information such as device information, browser type, IP address, pages visited, referring URLs, session activity, and approximate location derived from network information.",
    ],
  },
  {
    title: "3. How we use information",
    body: [
      "Zenapt uses information to operate, maintain, and improve the platform; provide onboarding, support, and implementation services; schedule demos; process transactions; manage business relationships; and communicate product, service, security, and administrative updates.",
      "We may also use information to monitor usage trends, prevent fraud or abuse, enforce our agreements, comply with legal obligations, and develop new features or service improvements.",
    ],
  },
  {
    title: "4. Communications",
    body: [
      "If you provide contact details to Zenapt, we may send you transactional or service-related messages by email, phone call, or SMS where permitted by law. These communications may include demo confirmations, onboarding updates, appointment-related service notices, support follow-ups, billing notices, and security alerts.",
      "Marketing communications are sent in accordance with applicable law. You can opt out of non-essential marketing emails using the unsubscribe link or by contacting us directly.",
    ],
  },
  {
    title: "5. How we share information",
    body: [
      "We may share information with service providers and contractors that help us host infrastructure, process payments, send emails or SMS messages, support scheduling workflows, provide analytics, or deliver customer support.",
      "We may also disclose information when required by law, regulation, legal process, or governmental request, or when we believe disclosure is reasonably necessary to protect rights, safety, property, or the integrity of Zenapt or its users.",
      "If Zenapt is involved in a merger, acquisition, financing, reorganization, or sale of assets, information may be disclosed as part of that transaction subject to appropriate confidentiality and legal safeguards.",
    ],
  },
  {
    title: "6. Customer data processed on behalf of businesses",
    body: [
      "When Zenapt processes end-customer information on behalf of a med spa, clinic, or other business customer, we act as a service provider or processor for that business customer. In those cases, the business customer controls the purposes and means of processing, and requests regarding that data should generally be directed to the relevant business customer first.",
    ],
  },
  {
    title: "7. Cookies and analytics",
    body: [
      "Zenapt may use cookies, local storage, pixels, and similar technologies to remember preferences, maintain sessions, measure performance, understand product usage, and improve the website and services.",
      "You can control certain cookies through browser settings, but disabling some technologies may affect functionality.",
    ],
  },
  {
    title: "8. Data retention",
    body: [
      "We retain information for as long as reasonably necessary to provide the services, satisfy contractual commitments, resolve disputes, enforce agreements, meet legal obligations, and maintain business records. Retention periods may vary depending on the type of information and the context in which it was collected.",
    ],
  },
  {
    title: "9. Security",
    body: [
      "Zenapt uses administrative, technical, and organizational safeguards designed to protect information from unauthorized access, loss, misuse, or alteration. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.",
    ],
  },
  {
    title: "10. Your choices and rights",
    body: [
      "Depending on your jurisdiction, you may have rights to access, correct, delete, or restrict certain personal information, or to object to certain processing. You may also have the right to withdraw consent where processing is based on consent.",
      "To exercise these rights, contact Zenapt using the information below. We may request reasonable verification before responding.",
    ],
  },
  {
    title: "11. Children’s privacy",
    body: [
      "Zenapt is intended for business use and is not directed to children under 13. We do not knowingly collect personal information directly from children through our marketing site. If you believe a child has provided personal information to us directly, contact us so we can take appropriate steps.",
    ],
  },
  {
    title: "12. Changes to this policy",
    body: [
      "We may update this Privacy Policy from time to time. When we do, we will update the effective date on this page and may provide additional notice where required by law or where changes are material.",
    ],
  },
  {
    title: "13. Contact us",
    body: [
      "If you have questions about this Privacy Policy or Zenapt’s privacy practices, contact us at support@zenapt.studio.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacy Policy"
      title="How Zenapt handles personal information"
      description="This Privacy Policy describes the categories of information Zenapt collects, how we use that information, and the choices available to customers, prospects, and end users."
      effectiveDate="March 17, 2026"
    >
      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {section.title}
          </h2>
          <div className="space-y-3 text-base leading-8 text-slate-600">
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </LegalPageShell>
  );
}