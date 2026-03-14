import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "@repo/tailwind";
import Providers from "@/components/providers";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
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
        suppressHydrationWarning
        className={`${poppins.variable} ${poppins.className} antialiased`}
      >
        <Providers>
          <div className="w-full min-h-svh">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
