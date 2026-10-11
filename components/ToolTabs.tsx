import Link from "next/link";
import { Bot, Gamepad2 } from "lucide-react";

type Tool = "gaming" | "ai";

const TABS: { tool: Tool; href: string; label: string; icon: typeof Bot }[] = [
  { tool: "gaming", href: "/", label: "Gaming bottleneck", icon: Gamepad2 },
  { tool: "ai", href: "/local-ai", label: "Local AI", icon: Bot },
];

// Switches between the two calculators; each keeps its own URL.
export function ToolTabs({ active }: { active: Tool }) {
  return (
    <nav aria-label="Calculators" className="mb-6 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
      {TABS.map(({ tool, href, label, icon: Icon }) => (
        <Link
          key={tool}
          href={href}
          aria-current={tool === active ? "page" : undefined}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            tool === active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
