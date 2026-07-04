import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans, Newsreader } from "next/font/google";
import "./globals.css";

// Three voices, three typefaces (handoff/HANDOFF.md):
// Newsreader = Chief speaking · Instrument Sans = user content · Plex Mono = machine facts.
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Chief",
  description: "A chief of staff in your pocket. Chief proposes; you approve.",
  applicationName: "Chief",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chief",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // safe-area insets via env() — bar + nav sit above the home indicator
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#131513" },
    { media: "(prefers-color-scheme: light)", color: "#F3F2ED" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${instrumentSans.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
