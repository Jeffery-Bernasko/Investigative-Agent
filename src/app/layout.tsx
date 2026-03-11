import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

// Suppress known third-party library and hydration warnings
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString?.() || "";
    // Suppress Neon Auth Captcha ref warning (third-party library issue)
    if (message.includes("Captcha") && message.includes("`ref` is not a prop")) {
      return;
    }
    // Suppress hydration mismatches from time-based content
    if (message.includes("Text content does not match server-rendered HTML")) {
      return;
    }
    // Suppress extra attributes from browser extensions (Dark Reader, etc.)
    if (message.includes("Extra attributes from the server")) {
      return;
    }
    // Suppress function component ref warnings from third-party UI
    if (message.includes("Function components cannot be given refs")) {
      return;
    }
    originalError.apply(console, args);
  };
}

// Inter as primary font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

// JetBrains Mono for code/data
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "SEPTO | Threat Intelligence Dashboard",
  description:
    "Security & Entity Profiling Threat Observatory - Enterprise-grade OSINT platform for threat intelligence and entity profiling",
  keywords: [
    "OSINT",
    "threat intelligence",
    "security",
    "investigation",
    "entity profiling",
  ],
  authors: [{ name: "Septo Team" }],
  openGraph: {
    title: "SEPTO | Threat Intelligence Dashboard",
    description: "Enterprise-grade OSINT platform for threat intelligence",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
