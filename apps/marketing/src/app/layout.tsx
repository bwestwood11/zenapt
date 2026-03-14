import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "@repo/tailwind";
import Providers from "@/components/providers";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Zenapt | Booking management for med spas",
  description:
    "Zenapt is a booking management solution for med spas, with scheduling, client management, services, locations, and payments in one platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${playfairDisplay.variable} ${playfairDisplay.className} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
