import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

const businessDetails = {
  name: "Zenapt LLC",
  email: "brett@zenapt.studio",
  location: "Tampa, Florida",
  phone: "+1 (813) 499-8379",
} as const;

const footerLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/get-demo", label: "Request a Demo" },
] as const;

type SiteFooterProps = Readonly<{
  className?: string;
}>;

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer className={cn("border-t border-border bg-card/60", className)}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] lg:gap-12">
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
                Zenapt LLC
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Booking operations software for modern med spas.
              </h2>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              Built for teams that want premium scheduling, communication, and growth
              tools in one polished workflow.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground/80">
              Contact
            </p>
            <div className="space-y-3 text-sm text-muted-foreground">
              <a
                href={`mailto:${businessDetails.email}`}
                className="flex items-center gap-3 transition hover:text-foreground"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-primary shadow-sm">
                  <Mail className="h-4 w-4" />
                </span>
                <span>{businessDetails.email}</span>
              </a>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-primary shadow-sm">
                  <MapPin className="h-4 w-4" />
                </span>
                <span>{businessDetails.location}</span>
              </div>
              {businessDetails.phone ? (
                <a
                  href={`tel:${businessDetails.phone}`}
                  className="flex items-center gap-3 transition hover:text-foreground"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-primary shadow-sm">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span>{businessDetails.phone}</span>
                </a>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground/80">
              Explore
            </p>
            <nav className="flex flex-col gap-3 text-sm text-muted-foreground">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Zenapt LLC. All rights reserved.</p>
          <p>Tampa, Florida</p>
        </div>
      </div>
    </footer>
  );
}
