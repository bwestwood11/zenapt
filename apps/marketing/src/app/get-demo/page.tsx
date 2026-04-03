import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { MedSpaBookingForm } from "@/features/demo-form/form";

export default function GetDemoPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-6 pt-3 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-3 sm:py-5">
          <Link href="/" className="inline-flex items-center gap-3 text-foreground">
            <Image src="/logo.svg" alt="ZenApt Logo" width={28} height={28} className="h-7 w-7" />
            <Image
              src="/logo-text.svg"
              alt="ZenApt"
              width={118}
              height={24}
              className="h-5 w-auto sm:h-6"
            />
          </Link>

          <div className="flex items-center gap-3 sm:gap-5">
            <Link
              href="/"
              className="text-sm font-medium text-foreground/80 transition hover:text-foreground"
            >
              Login
            </Link>
            <Button
              asChild
              className="h-10 rounded-md px-5 text-sm font-medium"
            >
              <Link href="/">Get Started</Link>
            </Button>
          </div>
        </header>

        <div className="flex-1">
          <section className="mx-auto max-w-5xl pt-10 sm:pt-12 lg:pt-14">
            <div className="space-y-3 text-center">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.38em] text-primary/80 sm:text-xs">
                Request a Demonstration
              </p>
              <div className="space-y-2.5">
                <h1 className="font-serif text-4xl tracking-tight text-foreground sm:text-5xl lg:text-[3.35rem]">
                  Elevate Your Practice
                </h1>
                <p className="font-serif text-base italic text-foreground/70 sm:text-lg">
                  The Luxury Standard in Med Spa Management
                </p>
              </div>
            </div>

            <div className="mt-8 sm:mt-10">
              <Suspense
                fallback={<div className="text-center text-sm text-muted-foreground">Loading form...</div>}
              >
                <MedSpaBookingForm />
              </Suspense>
            </div>
          </section>
        </div>

        <footer className="mt-10 border-t border-border/70 pt-5 text-[0.72rem] text-muted-foreground">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="ZenApt Logo" width={18} height={18} className="h-4.5 w-4.5" />
              <span className="font-serif italic text-foreground/70">ZenApt Luxury Systems</span>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <Link href="/privacy-policy" className="transition hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms-of-service" className="transition hover:text-foreground">
                Terms
              </Link>
              <a href="mailto:brett@zenapt.studio" className="transition hover:text-foreground">
                Contact
              </a>
            </div>
            <p>© 2026 ZenApt Luxury Systems. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
