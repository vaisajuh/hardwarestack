import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PC Bottleneck Calculator — HardwareStack",
    template: "%s — HardwareStack",
  },
  description:
    "Free CPU & GPU bottleneck calculator. Find out if your processor or graphics card is limiting your gaming performance at 1080p, 1440p, or 4K resolution.",
  keywords: [
    "bottleneck calculator",
    "CPU bottleneck",
    "GPU bottleneck",
    "PC bottleneck test",
    "CPU GPU compatibility",
  ],
  openGraph: {
    title: "PC Bottleneck Calculator — HardwareStack",
    description:
      "Instantly calculate CPU & GPU bottlenecks across 1080p, 1440p, and 4K resolutions.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 font-sans text-slate-900">
        {children}
      </body>
    </html>
  );
}
