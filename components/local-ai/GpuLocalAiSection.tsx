import Link from "next/link";
import { recommendQuant } from "@/lib/ai-fit";
import type { GpuSpec } from "@/lib/ai-fit";
import { formatSpeed } from "@/lib/ai-format";
import { DEFAULT_CONTEXT_TOKENS, LLM_MODELS, QUANT_LEVELS } from "@/lib/llm-models";

interface Props {
  gpu: GpuSpec & { id: string; modelName: string };
}

// Server-rendered summary for GPU detail pages: models that fit entirely in VRAM at 8K context.
export function GpuLocalAiSection({ gpu }: Props) {
  const fitting = [...LLM_MODELS]
    .sort((a, b) => a.paramsB - b.paramsB)
    .map((model) => ({ model, rec: recommendQuant(model, DEFAULT_CONTEXT_TOKENS, gpu, null) }))
    .filter((r) => r.rec.fit.status === "gpu");

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Local AI: models that run on the {gpu.modelName}
        </h2>
      </div>
      <p className="px-4 pt-3 text-sm text-slate-600">
        {fitting.length} of {LLM_MODELS.length} popular open models fit entirely in its {gpu.vramGb} GB of VRAM at 8K
        context, each at the best compression level that fits.
      </p>
      {fitting.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100 border-t border-slate-100">
          {fitting.map(({ model, rec }) => (
            <li key={model.slug} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <Link href={`/local-ai/${model.slug}`} className="font-medium text-slate-800 hover:underline">
                {model.name}
              </Link>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {QUANT_LEVELS[rec.quant].label} · {formatSpeed(rec.fit.tokensPerSecond)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/local-ai?gpuId=${gpu.id}`}
        className="block border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 hover:text-slate-800"
      >
        Include system RAM offloading in the Local AI calculator →
      </Link>
    </div>
  );
}
