import Link from "next/link";
import { MedSpaBookingForm } from "@/features/demo-form/form";
import React, { Suspense } from "react";

const page = () => {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-violet-50/50 to-white px-4 py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <div className="space-y-4 text-center">
          <Link
            href="/"
            className="inline-flex text-sm font-medium text-violet-700 transition hover:text-violet-900"
          >
            ← Back to overview
          </Link>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-600">
              Book your demo
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              See how Zenapt fits your med spa workflow
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-8 text-slate-600">
              Share your clinic details and pick a time. We&apos;ll walk through
              scheduling, locations, services, staff setup, and the client
              experience with your team.
            </p>
          </div>
        </div>

        <Suspense fallback={<div className="text-center text-slate-500">Loading form...</div>}>
          <MedSpaBookingForm />
        </Suspense>
      </div>
    </main>
  );
};

export default page;
