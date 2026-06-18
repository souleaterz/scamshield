import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import AuthHeader from "@/app/components/AuthHeader";
import { isClerkConfigured } from "@/app/lib/auth";
import { SITE_URL, SITE_NAME } from "@/app/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ScamShield — Is it a scam?",
    template: "%s",
  },
  description:
    "Paste a message, link, phone number, or screenshot and get an instant AI verdict on whether it's a scam.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "ScamShield — Is it a scam?",
    description:
      "Paste a message, link, phone number, or screenshot and get an instant AI verdict on whether it's a scam.",
    url: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <AuthHeader />
        {children}
      </body>
    </html>
  );

  // Only mount ClerkProvider once Clerk is configured — otherwise the app runs
  // anonymously with no provider required.
  return isClerkConfigured() ? <ClerkProvider>{content}</ClerkProvider> : content;
}
