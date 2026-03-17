import type { Metadata } from "next";
import LegalPageShell from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service | Zenapt",
  description:
    "Review the Zenapt Terms of Service governing access to the Zenapt website, demo scheduling flow, platform, and related support services.",
};

const sections = [
  {
    title: "1. Agreement to these terms",
    body: [
      "These Terms of Service govern access to and use of Zenapt’s website, platform, booking tools, scheduling features, communications, and related services. By accessing or using Zenapt, you agree to these Terms on behalf of yourself and, if applicable, the organization you represent.",
      "If you use Zenapt on behalf of a business, you represent that you have authority to bind that business to these Terms.",
    ],
  },
  {
    title: "2. Zenapt services",
    body: [
      "Zenapt provides software and related services designed to help med spas and similar businesses manage bookings, services, staff, locations, customer information, and payment-related workflows.",
      "Zenapt may modify, improve, replace, or discontinue features from time to time. Certain features may be offered as beta, pilot, or early-access functionality and may be subject to additional terms.",
    ],
  },
  {
    title: "3. Eligibility and account responsibilities",
    body: [
      "You must provide accurate and complete information when creating an account or using the services. You are responsible for maintaining the confidentiality of account credentials and for all activity that occurs under your account.",
      "You agree to notify Zenapt promptly of any unauthorized access, credential compromise, or suspected security incident involving your account.",
    ],
  },
  {
    title: "4. Acceptable use",
    body: [
      "You may not use Zenapt to violate law, infringe intellectual property or privacy rights, transmit unlawful or harmful material, attempt unauthorized access, interfere with the service, scrape or reverse engineer the platform except as permitted by law, or use the platform to support fraudulent, abusive, or deceptive conduct.",
      "You are responsible for ensuring that communications sent through Zenapt, including email and SMS messages, comply with applicable marketing, privacy, consumer protection, and healthcare-related laws.",
    ],
  },
  {
    title: "5. Customer data and your obligations",
    body: [
      "As between you and Zenapt, you retain rights to the business and customer data you submit to the platform, subject to the rights necessary for Zenapt to provide and improve the services.",
      "You represent that you have all rights, notices, consents, and permissions needed to collect, process, store, and share any data you provide to Zenapt, including end-customer contact information and appointment records.",
      "You are responsible for the accuracy, quality, legality, and integrity of the data you provide to Zenapt.",
    ],
  },
  {
    title: "6. Fees, billing, and taxes",
    body: [
      "Paid features may require fees under an order form, subscription plan, or other commercial agreement with Zenapt. Unless otherwise stated, fees are quoted in U.S. dollars and are non-refundable except as required by law or expressly stated in writing.",
      "You are responsible for applicable taxes, duties, levies, or similar governmental assessments other than taxes based on Zenapt’s net income.",
    ],
  },
  {
    title: "7. Third-party services",
    body: [
      "Zenapt may integrate with or rely on third-party services such as payment processors, messaging providers, hosting providers, analytics vendors, and scheduling or communication tools. Your use of third-party services may also be subject to those providers’ terms and privacy policies.",
      "Zenapt is not responsible for third-party products or services except to the extent expressly required by law.",
    ],
  },
  {
    title: "8. Intellectual property",
    body: [
      "Zenapt and its licensors retain all rights, title, and interest in the services, software, website, documentation, branding, and related intellectual property. Except for the limited rights expressly granted in these Terms, no rights are granted to you by implication, estoppel, or otherwise.",
      "Subject to these Terms, Zenapt grants you a limited, non-exclusive, non-transferable, non-sublicensable right to access and use the services for your internal business purposes during the applicable subscription term.",
    ],
  },
  {
    title: "9. Feedback",
    body: [
      "If you provide suggestions, feedback, ideas, or improvement requests to Zenapt, you grant Zenapt a worldwide, perpetual, irrevocable, royalty-free license to use and incorporate that feedback without restriction or compensation.",
    ],
  },
  {
    title: "10. Confidentiality",
    body: [
      "Each party may receive non-public information from the other party that is designated as confidential or that should reasonably be understood to be confidential. The receiving party will use the same degree of care it uses to protect its own confidential information, and no less than reasonable care, to protect such information from unauthorized use or disclosure.",
    ],
  },
  {
    title: "11. Disclaimers",
    body: [
      "Zenapt provides the services on an “as is” and “as available” basis except as expressly stated in a written agreement. To the maximum extent permitted by law, Zenapt disclaims all implied warranties, including implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement.",
      "Zenapt does not guarantee uninterrupted service, complete accuracy, or that the services will be error-free or meet every business, regulatory, or clinical requirement. You remain responsible for your professional, operational, legal, and compliance decisions.",
    ],
  },
  {
    title: "12. Limitation of liability",
    body: [
      "To the fullest extent permitted by law, Zenapt will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenues, goodwill, data, or business interruption, even if advised of the possibility of those damages.",
      "To the fullest extent permitted by law, Zenapt’s aggregate liability arising out of or related to the services or these Terms will not exceed the amounts paid or payable by you to Zenapt for the services during the twelve months immediately preceding the event giving rise to the claim.",
    ],
  },
  {
    title: "13. Indemnification",
    body: [
      "You agree to defend, indemnify, and hold harmless Zenapt and its affiliates, officers, employees, and agents from and against third-party claims, liabilities, damages, losses, and expenses arising out of or related to your use of the services, your data, your communications with end customers, or your violation of these Terms or applicable law.",
    ],
  },
  {
    title: "14. Suspension and termination",
    body: [
      "Zenapt may suspend or terminate access to the services if you materially breach these Terms, fail to pay amounts due, create security or legal risk, or use the services in a prohibited manner.",
      "You may stop using the services at any time. Sections that by their nature should survive termination will survive, including provisions related to fees owed, confidentiality, intellectual property, disclaimers, limitations of liability, indemnification, and dispute-related terms.",
    ],
  },
  {
    title: "15. Governing law and disputes",
    body: [
      "Unless otherwise stated in a signed commercial agreement between you and Zenapt, these Terms are governed by the laws applicable in the jurisdiction where Zenapt is organized, without regard to conflict-of-law principles. The parties will first attempt to resolve disputes informally and in good faith before initiating formal proceedings.",
    ],
  },
  {
    title: "16. Changes to these terms",
    body: [
      "Zenapt may update these Terms from time to time. If we make material changes, we may provide notice through the website, product, email, or another reasonable method. Continued use of the services after the updated Terms become effective constitutes acceptance of the revised Terms.",
    ],
  },
  {
    title: "17. Contact us",
    body: [
      "If you have questions about these Terms of Service, contact Zenapt at support@zenapt.studio.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      eyebrow="Terms of Service"
      title="Terms for using Zenapt"
      description="These Terms of Service describe the rules, responsibilities, and limits that apply when businesses use Zenapt’s website, platform, and related support services."
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