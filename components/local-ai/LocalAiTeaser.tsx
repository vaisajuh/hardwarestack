import Link from "next/link";
import { Bot } from "lucide-react";
import { recommendQuant } from "@/lib/ai-fit";
import { DEFAULT_CONTEXT_TOKENS, LLM_MODELS } from "@/lib/llm-models";
import type { GpuOption } from "@/types/hardware";

interface Props {
  gpu: GpuOption;
  gpuLabel: string;
}

// Shown under bottleneck results: points gamers at what the same GPU can do for local AI.
export function LocalAiTeaser({ gpu, gpuLabel }: Props) {
  const fitting = LLM_MODELS.filter(
    (model) => recommendQuant(model, DEFAULT_CONTEXT_TOKENS, gpu, null).fit.status === "gpu"
  ).length;

  return (
    <Link
      href={`/local-ai?gpuId=${gpu.id}`}
      className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors"
    >
      <Bot className="h-5 w-5 shrink-0 text-slate-400" />
      <span className="flex-1">
        {fitting > 0 ? (
          <>
            Your {gpuLabel} can also run{" "}
            <span className="font-semibold text-slate-900">
              {fitting} of {LLM_MODELS.length} popular AI models
            </span>{" "}
            locally.
          </>
        ) : (
          <>Curious about running AI models on your own PC? See what it takes.</>
        )}
      </span>
      <span className="shrink-0 text-xs font-medium">See which →</span>
    </Link>
  );
}
