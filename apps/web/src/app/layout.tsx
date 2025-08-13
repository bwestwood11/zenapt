import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "@repo/tailwind";
import Providers from "@/components/providers";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
});

export const metadata: Metadata = {
  title: "med-spa-saas",
  description: "med-spa-saas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfairDisplay.variable} ${playfairDisplay.className} antialiased`}
      >
        <Providers>
          <div className="h-svh">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
