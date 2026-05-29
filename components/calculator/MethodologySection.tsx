export function MethodologySection() {
  return (
    <section className="mt-12 border-t border-slate-200 pt-10">
      <h2 className="text-lg font-bold text-slate-900 mb-1">
        How the bottleneck is calculated
      </h2>
      <p className="text-sm text-slate-500 mb-8 max-w-2xl">
        We believe in being transparent about our methodology. Here is exactly
        how the numbers are produced.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
              1
            </span>
            <h3 className="text-sm font-semibold text-slate-800">
              CPU gaming score
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Raw PassMark single-thread score is scaled to approximate real gaming
            throughput — single-thread speed matters most, but core count and
            architectural efficiency add headroom.
          </p>
          <code className="block rounded bg-slate-50 border border-slate-100 px-3 py-2 text-[11px] text-slate-700 leading-relaxed">
            score = singleCore × log₂(cores + 1) × tierScale
          </code>
          <p className="mt-2 text-[11px] text-slate-400">
            Tier scale: Entry 1.0 → Mid 1.1 → High 1.25 → Ultra 1.4 →
            Enthusiast 1.6
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
              2
            </span>
            <h3 className="text-sm font-semibold text-slate-800">
              GPU score &amp; resolution scaling
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            The GPU&apos;s PassMark raster score is divided by a resolution
            multiplier — higher resolutions demand proportionally more from the
            GPU, shifting the bottleneck toward the graphics card.
          </p>
          <code className="block rounded bg-slate-50 border border-slate-100 px-3 py-2 text-[11px] text-slate-700 leading-relaxed">
            effectiveGPU = rasterScore / resolutionRatio
          </code>
          <p className="mt-2 text-[11px] text-slate-400">
            Resolution ratios: 1080p = 1.0 · 1440p = 1.78 · 4K = 4.0
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
              3
            </span>
            <h3 className="text-sm font-semibold text-slate-800">
              RAM bandwidth penalty (optional)
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Slow or single-channel memory starves the CPU. The reference point
            is DDR4-3600 dual-channel — no penalty, no bonus. Below that,
            effective CPU score is reduced by up to 25%.
          </p>
          <code className="block rounded bg-slate-50 border border-slate-100 px-3 py-2 text-[11px] text-slate-700 leading-relaxed">
            factor = 0.75 + 0.25 × min(1, bandwidth / 7200)
            <br />
            effectiveCPU = cpuScore × factor
          </code>
          <p className="mt-2 text-[11px] text-slate-400">
            Bandwidth = speedMHz × channels. Reference: 3600 × 2 = 7200
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
              4
            </span>
            <h3 className="text-sm font-semibold text-slate-800">
              Bottleneck decision
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            The imbalance percentage is the relative gap between the two scores.
            Below 10% the system is considered well-matched. The weaker
            component is identified as the bottleneck.
          </p>
          <code className="block rounded bg-slate-50 border border-slate-100 px-3 py-2 text-[11px] text-slate-700 leading-relaxed">
            gap = |cpuScore − gpuScore| / max(both) × 100
          </code>
          <p className="mt-2 text-[11px] text-slate-400">
            &lt; 10% → Balanced · CPU score &lt; GPU → CPU bottleneck · GPU
            score &lt; CPU → GPU bottleneck
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400 max-w-2xl">
        Benchmark data is sourced from PassMark. Scores are normalized and
        intended as a relative guide — real-world performance varies by game,
        driver version, and system configuration. Always cross-reference with
        reviews and benchmarks for your specific use case.
      </p>
    </section>
  );
}
