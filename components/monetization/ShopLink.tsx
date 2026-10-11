import { ExternalLink } from "lucide-react";
import { buildShopLink } from "@/lib/shopping-links";

// Compact "where to buy" link for GPU lists: Amazon (affiliate) when tagged, otherwise Google Shopping.
export function ShopLink({ modelName }: { modelName: string }) {
  const { href, label, rel } = buildShopLink(modelName);
  return (
    <a
      href={href}
      target="_blank"
      rel={rel}
      className="shrink-0 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
    >
      {label} <ExternalLink className="h-3 w-3" />
    </a>
  );
}
