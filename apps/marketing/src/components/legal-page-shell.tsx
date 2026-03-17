import type { ReactNode } from "react";
import Link from "next/link";

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  effectiveDate: string;
  children: ReactNode;
};

export default function LegalPageShell({
  eyebrow,
  title,
  description,
  effectiveDate,
  children,
}: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-violet-50/40 to-white px-4 py-16 text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link
            href="/"
            className="font-medium text-violet-700 transition hover:text-violet-900"
          >
            ← Back to overview
          </Link>

          <div className="flex flex-wrap items-center gap-4 text-slate-600">
            <Link href="/privacy-policy" className="transition hover:text-violet-700">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="transition hover:text-violet-700">
              Terms of Service
            </Link>
            <Link href="/get-demo" className="transition hover:text-violet-700">
              Book a demo
            </Link>
          </div>
        </div>

        <section className="rounded-[2rem] border border-violet-100 bg-white/90 p-8 shadow-sm backdrop-blur sm:p-10">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-600">
              {eyebrow}
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="text-lg leading-8 text-slate-600">{description}</p>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm text-slate-600">
              Effective date: <span className="font-medium text-slate-900">{effectiveDate}</span>
            </div>
            <p className="text-sm leading-6 text-slate-500">
              This page is provided as a general Zenapt legal policy and should be reviewed by counsel before publication or use in production.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-violet-100 bg-white p-8 shadow-sm sm:p-10">
          <div className="space-y-8">{children}</div>
        </section>
      </div>
    </main>
  );
}