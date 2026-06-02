import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  verification: {
    google: "google937f05112de8e31a",
  },
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
        <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-900">
                <span className="text-xs font-bold text-white">HS</span>
              </div>
              <span className="text-sm font-semibold text-slate-900 tracking-tight">
                HardwareStack
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/cpus"
                className="rounded px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                CPUs
              </Link>
              <Link
                href="/gpus"
                className="rounded px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                GPUs
              </Link>
            </nav>
          </div>
        </header>

        <div className="flex flex-col flex-1">{children}</div>

        <footer className="border-t border-slate-200 bg-white mt-auto">
          <div className="mx-auto max-w-5xl px-4 py-5 flex flex-col gap-3 text-xs text-slate-700">
            <p>
              <span className="font-semibold">Disclaimer: </span>
              Results are based on normalized benchmark scores and are provided
              for informational purposes only. HardwareStack makes no guarantees
              about the accuracy, completeness, or fitness of any information on
              this site. Always verify component compatibility with your
              motherboard&apos;s specifications and QVL before purchasing.
              HardwareStack accepts no responsibility for damaged, incompatible,
              or incorrectly installed hardware.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                Contact:{" "}
                <a
                  href="mailto:summit.dragon4613@eagereverest.com"
                  className="underline hover:text-slate-900"
                >
                  summit.dragon4613@eagereverest.com
                </a>
              </span>
              <Link href="/terms" className="underline hover:text-slate-900">
                Terms of Use
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
