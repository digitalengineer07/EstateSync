import type { Metadata } from "next";
import { Geist, Geist_Mono, Chakra_Petch, Orbitron } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EstateSync - Real Estate Treasury Platform",
    template: "%s | EstateSync",
  },
  description: "Devoxa Technologies - Real estate treasury, customer collections, property acquisitions, and financial operations platform.",
  icons: {
    icon: "/icon.svg",
  },
};

import { AuthProvider } from "@/context/AuthContext";
import { SWRProvider } from "@/context/SWRProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable} ${orbitron.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,500;0,600;0,700;1,600;1,700&family=Orbitron:wght@600;700;800;900&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <SWRProvider>
            {children}
          </SWRProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
