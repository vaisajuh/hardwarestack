"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Monitor, MemoryStick, HardDrive } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LiveData } from "@/components/CalculatorSection";

// ── Types ────────────────────────────────────────────────────────────────────

type Workload = "Idle" | "Standard Gaming" | "DirectStorage" | "AI Training";
type ActiveWorkload = Workload | "Your Build";

interface NodeDef {
  x: number; y: number; w: number; h: number;
  label: string; sub: string;
  Icon: LucideIcon; iconColor: string;
}

interface PathDef {
  points: [number, number][];
  label: string; labelX: number; labelY: number;
  anchor: "start" | "middle" | "end";
}

interface StreamDef {
  points: [number, number][];
  reversed: boolean;
  count: number;
  color: string;
  duration: number;
}

interface WorkloadDef {
  streams: StreamDef[];
  description: string;
}

// ── SVG coordinate system: 560 × 320 ────────────────────────────────────────
// Node rects (x, y = top-left corner)
// Centers: CPU(220,160) RAM(220,55) GPU(420,160) NVMe(220,265)

const SVG_W = 560;
const SVG_H = 320;

const NODES: Record<string, NodeDef> = {
  cpu:  { x: 170, y: 134, w: 100, h: 52, label: "CPU",      sub: "Central Processor",  Icon: Cpu,         iconColor: "text-slate-600"  },
  ram:  { x: 170, y:  29, w: 100, h: 52, label: "RAM",      sub: "System Memory",      Icon: MemoryStick, iconColor: "text-sky-600"    },
  gpu:  { x: 370, y: 134, w: 100, h: 52, label: "GPU",      sub: "Graphics Processor", Icon: Monitor,     iconColor: "text-violet-600" },
  nvme: { x: 170, y: 239, w: 100, h: 52, label: "NVMe SSD", sub: "Storage",            Icon: HardDrive,   iconColor: "text-amber-600"  },
};

// Paths connect the edges of node rects:
//   cpu-ram:  CPU top (220,134) → RAM bottom (220,81)
//   cpu-gpu:  CPU right (270,160) → GPU left (370,160)
//   cpu-nvme: CPU bottom (220,186) → NVMe top (220,239)
//   nvme-gpu: NVMe right (270,265) → corner (420,265) → GPU bottom (420,186)

const PATHS: Record<string, PathDef> = {
  "cpu-ram": {
    points: [[220, 134], [220, 81]],
    label: "Memory Bus", labelX: 228, labelY: 112, anchor: "start",
  },
  "cpu-gpu": {
    points: [[270, 160], [370, 160]],
    label: "PCIe 4.0 ×16", labelX: 320, labelY: 152, anchor: "middle",
  },
  "cpu-nvme": {
    points: [[220, 186], [220, 239]],
    label: "PCIe 4.0 ×4", labelX: 228, labelY: 216, anchor: "start",
  },
  "nvme-gpu": {
    points: [[270, 265], [420, 265], [420, 186]],
    label: "DirectStorage", labelX: 428, labelY: 242, anchor: "start",
  },
  "ram-gpu": {
    points: [[270, 55], [420, 55], [420, 134]],
    label: "PCIe DMA", labelX: 345, labelY: 47, anchor: "middle",
  },
};

// ── Workload configurations ──────────────────────────────────────────────────

const WORKLOADS: Record<Workload, WorkloadDef> = {
  Idle: {
    streams: [
      { points: PATHS["cpu-nvme"].points, reversed: false, count: 1, color: "#94a3b8", duration: 3.0 },
    ],
    description:
      "The system is at rest. Only light, periodic I/O pulses flow between the CPU and storage as the OS performs background maintenance. All major buses are largely idle.",
  },
  "Standard Gaming": {
    streams: [
      { points: PATHS["cpu-nvme"].points, reversed: true,  count: 3, color: "#3b82f6", duration: 1.1 },
      { points: PATHS["cpu-ram"].points,  reversed: false, count: 2, color: "#3b82f6", duration: 0.9 },
      { points: PATHS["cpu-ram"].points,  reversed: true,  count: 2, color: "#3b82f6", duration: 0.9 },
      { points: PATHS["cpu-gpu"].points,  reversed: false, count: 3, color: "#3b82f6", duration: 0.8 },
      { points: PATHS["cpu-gpu"].points,  reversed: true,  count: 1, color: "#94a3b8", duration: 1.8 },
      { points: PATHS["ram-gpu"].points,  reversed: false, count: 2, color: "#60a5fa", duration: 1.0 },
    ],
    description:
      "The CPU sends draw calls and command buffers to the GPU, while the GPU pulls bulk texture data directly from RAM via PCIe DMA. When each frame completes, the GPU signals the CPU via a completion interrupt over PCIe so the next frame can be dispatched.",
  },
  DirectStorage: {
    streams: [
      { points: PATHS["nvme-gpu"].points, reversed: false, count: 5, color: "#10b981", duration: 0.55 },
      { points: PATHS["cpu-gpu"].points,  reversed: false, count: 1, color: "#94a3b8", duration: 1.8  },
      { points: PATHS["cpu-gpu"].points,  reversed: true,  count: 1, color: "#94a3b8", duration: 2.2  },
    ],
    description:
      "The GPU's onboard decompression engine pulls compressed textures directly from NVMe via PCIe, bypassing the CPU entirely. The CPU sends only lightweight draw calls and receives completion signals back — a fraction of the traditional pipeline traffic.",
  },
  "AI Training": {
    streams: [
      { points: PATHS["cpu-ram"].points, reversed: false, count: 4, color: "#8b5cf6", duration: 0.65 },
      { points: PATHS["cpu-ram"].points, reversed: true,  count: 4, color: "#8b5cf6", duration: 0.65 },
      { points: PATHS["cpu-gpu"].points, reversed: false, count: 3, color: "#8b5cf6", duration: 0.70 },
      { points: PATHS["cpu-gpu"].points, reversed: true,  count: 3, color: "#8b5cf6", duration: 0.70 },
      { points: PATHS["ram-gpu"].points, reversed: false, count: 4, color: "#a78bfa", duration: 0.60 },
    ],
    description:
      "The CPU stages training batches in RAM. The GPU's DMA engine pulls batches directly from RAM over PCIe while the CPU sends optimizer commands via the ×16 link. Gradients flow back CPU-side for parameter updates — all three buses sustain continuous load.",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function pathD(points: [number, number][]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
}

function pathTimes(points: [number, number][]): number[] {
  const segs = points
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  let cum = 0;
  return [0, ...segs.map(d => { cum += d; return cum / total; })];
}

// ── DataPacket ───────────────────────────────────────────────────────────────

function DataPacket({
  points, color, duration, delay,
}: {
  points: [number, number][];
  color: string;
  duration: number;
  delay: number;
}) {
  const times = pathTimes(points);
  return (
    <motion.g
      initial={{ x: points[0][0], y: points[0][1] }}
      animate={{
        x: points.map(p => p[0]),
        y: points.map(p => p[1]),
      }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear", times }}
    >
      <circle r={3.5} fill={color} />
    </motion.g>
  );
}

// ── Live "Your Build" config ─────────────────────────────────────────────────

function shortName(name: string): string {
  return name
    .replace("Intel Core ", "").replace("AMD Ryzen ", "Ryzen ")
    .replace("NVIDIA GeForce ", "").replace("AMD Radeon ", "");
}

const NODE_BOTTLENECK_BORDER: Record<string, Record<string, string>> = {
  CPU:      { cpu: "border-red-400 border-2",    gpu: "border-slate-200", ram: "border-slate-200", nvme: "border-slate-200" },
  GPU:      { cpu: "border-slate-200",            gpu: "border-red-400 border-2", ram: "border-slate-200", nvme: "border-slate-200" },
  RAM:      { cpu: "border-slate-200",            gpu: "border-slate-200", ram: "border-amber-400 border-2", nvme: "border-slate-200" },
  Balanced: { cpu: "border-emerald-400 border-2", gpu: "border-emerald-400 border-2", ram: "border-slate-200", nvme: "border-slate-200" },
};

function buildLiveConfig(liveData: LiveData): WorkloadDef {
  const { result, cpuName, gpuName, resolution } = liveData;
  const { cpuUtilization, gpuUtilization, bottleneckComponent } = result;

  const red    = "#ef4444";
  const amber  = "#f59e0b";
  const green  = "#10b981";
  const slate  = "#94a3b8";

  let streams: StreamDef[];

  if (bottleneckComponent === "CPU") {
    streams = [
      { points: PATHS["cpu-ram"].points,  reversed: false, count: 4, color: red,   duration: 0.7  },
      { points: PATHS["cpu-ram"].points,  reversed: true,  count: 3, color: red,   duration: 0.7  },
      { points: PATHS["cpu-gpu"].points,  reversed: false, count: 2, color: amber, duration: 1.1  },
      { points: PATHS["cpu-gpu"].points,  reversed: true,  count: 1, color: slate, duration: 2.0  },
      { points: PATHS["cpu-nvme"].points, reversed: true,  count: 2, color: slate, duration: 1.3  },
      { points: PATHS["ram-gpu"].points,  reversed: false, count: 1, color: slate, duration: 1.4  },
    ];
  } else if (bottleneckComponent === "GPU") {
    streams = [
      { points: PATHS["cpu-gpu"].points,  reversed: false, count: 4, color: red,   duration: 0.6  },
      { points: PATHS["cpu-gpu"].points,  reversed: true,  count: 1, color: slate, duration: 1.5  },
      { points: PATHS["cpu-ram"].points,  reversed: false, count: 2, color: slate, duration: 1.2  },
      { points: PATHS["cpu-ram"].points,  reversed: true,  count: 1, color: slate, duration: 1.2  },
      { points: PATHS["ram-gpu"].points,  reversed: false, count: 3, color: red,   duration: 0.65 },
    ];
  } else if (bottleneckComponent === "RAM") {
    streams = [
      { points: PATHS["cpu-ram"].points,  reversed: false, count: 3, color: amber, duration: 0.9  },
      { points: PATHS["cpu-ram"].points,  reversed: true,  count: 3, color: amber, duration: 0.9  },
      { points: PATHS["cpu-gpu"].points,  reversed: false, count: 1, color: slate, duration: 1.8  },
      { points: PATHS["cpu-gpu"].points,  reversed: true,  count: 1, color: slate, duration: 2.2  },
      { points: PATHS["ram-gpu"].points,  reversed: false, count: 1, color: amber, duration: 1.6  },
    ];
  } else {
    // Balanced
    streams = [
      { points: PATHS["cpu-ram"].points,  reversed: false, count: 3, color: green, duration: 0.8  },
      { points: PATHS["cpu-ram"].points,  reversed: true,  count: 3, color: green, duration: 0.8  },
      { points: PATHS["cpu-gpu"].points,  reversed: false, count: 3, color: green, duration: 0.75 },
      { points: PATHS["cpu-gpu"].points,  reversed: true,  count: 1, color: slate, duration: 1.8  },
      { points: PATHS["cpu-nvme"].points, reversed: true,  count: 2, color: green, duration: 1.2  },
      { points: PATHS["ram-gpu"].points,  reversed: false, count: 3, color: green, duration: 0.8  },
    ];
  }

  const cpu = shortName(cpuName);
  const gpu = shortName(gpuName);
  const descriptions: Record<string, string> = {
    CPU:      `${cpu} is the bottleneck at ${resolution} (CPU ${cpuUtilization}% / GPU ${gpuUtilization}%). The CPU buses are saturated while ${gpu} is underutilized — it's waiting for data that can't arrive fast enough.`,
    GPU:      `${gpu} is the bottleneck at ${resolution} (CPU ${cpuUtilization}% / GPU ${gpuUtilization}%). The GPU is fully saturated and the PCIe lane is under heavy load, while ${cpu} still has headroom.`,
    RAM:      `Slow RAM is the bottleneck at ${resolution}. The memory bus is the constraint, starving both the CPU and GPU of the data they need.`,
    Balanced: `${cpu} and ${gpu} are well matched at ${resolution} (CPU ${cpuUtilization}% / GPU ${gpuUtilization}%). Both components run near capacity with balanced traffic across all buses.`,
  };

  return { streams, description: descriptions[bottleneckComponent] ?? "" };
}

// ── Legend helpers ───────────────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function LegendLine({ dashed, label }: { dashed: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <svg width="20" height="8" className="shrink-0">
        <line
          x1="0" y1="4" x2="20" y2="4"
          stroke="#94a3b8" strokeWidth="1.5"
          strokeDasharray={dashed ? "4 2" : undefined}
        />
      </svg>
      {label}
    </span>
  );
}

// ── SystemArchitectureVisualizer ─────────────────────────────────────────────

const WORKLOAD_OPTIONS: Workload[] = ["Idle", "Standard Gaming", "DirectStorage", "AI Training"];

export function SystemArchitectureVisualizer({ liveData }: { liveData?: LiveData | null }) {
  const [workload, setWorkload] = useState<ActiveWorkload>("Standard Gaming");
  const [prevHadLiveData, setPrevHadLiveData] = useState(!!liveData);

  // Adjust workload when liveData presence changes (React "setState during render" pattern)
  const hadLiveData = !!liveData;
  if (hadLiveData !== prevHadLiveData) {
    setPrevHadLiveData(hadLiveData);
    if (hadLiveData) setWorkload("Your Build");
    else if (workload === "Your Build") setWorkload("Standard Gaming");
  }

  const config = workload === "Your Build" && liveData
    ? buildLiveConfig(liveData)
    : WORKLOADS[workload as Workload];

  return (
    <div className="flex flex-col gap-5">
      {/* Workload selector */}
      <div className="flex flex-wrap gap-2">
        {liveData && (
          <button
            onClick={() => setWorkload("Your Build")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              workload === "Your Build"
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400"
            }`}
          >
            Your Build ✦
          </button>
        )}
        <div className="w-px bg-slate-200 self-stretch" />
        {WORKLOAD_OPTIONS.map(w => (
          <button
            key={w}
            onClick={() => setWorkload(w)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              workload === w
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-500">
        {workload === "Your Build" ? (
          <>
            <LegendDot color="#ef4444" label="Bottleneck (saturated)" />
            <LegendDot color="#f59e0b" label="Throttled (starved)" />
            <LegendDot color="#10b981" label="Healthy / balanced" />
            <LegendDot color="#94a3b8" label="Control signals" />
          </>
        ) : workload === "DirectStorage" ? (
          <>
            <LegendDot color="#10b981" label="DirectStorage data" />
            <LegendDot color="#94a3b8" label="Control signals" />
          </>
        ) : workload === "AI Training" ? (
          <>
            <LegendDot color="#8b5cf6" label="Training data" />
            <LegendDot color="#a78bfa" label="DMA data" />
          </>
        ) : (
          <>
            <LegendDot color="#3b82f6" label="Data packets" />
            <LegendDot color="#60a5fa" label="DMA texture data" />
            <LegendDot color="#94a3b8" label="Control signals" />
          </>
        )}
        <LegendLine dashed={false} label="Main bus" />
        <LegendLine dashed label="DMA / bypass" />
      </div>

      {/* Diagram */}
      <div
        className="relative w-full rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden"
        style={{ paddingTop: `${(SVG_H / SVG_W) * 100}%` }}
      >
        {/* Layer 1 — static paths (behind nodes) */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {Object.entries(PATHS).map(([key, def]) => {
            const isDma = key === "nvme-gpu" || key === "ram-gpu";
            const isDirectStorageBypass = key === "nvme-gpu" && workload === "DirectStorage";
            return (
              <g key={key}>
                <path
                  d={pathD(def.points)}
                  fill="none"
                  stroke={isDirectStorageBypass ? "#10b981" : isDma ? "#94a3b8" : "#cbd5e1"}
                  strokeWidth={isDma ? 1.5 : 2}
                  strokeDasharray={isDma ? "6 3" : undefined}
                />
                {(!isDma || isDirectStorageBypass || key === "ram-gpu") && (
                  <text
                    x={def.labelX}
                    y={def.labelY}
                    textAnchor={def.anchor}
                    fontSize={9}
                    fill="#94a3b8"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {def.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Layer 2 — hardware nodes */}
        {Object.entries(NODES).map(([key, n]) => {
          const Icon = n.Icon;
          const isLive = workload === "Your Build" && liveData;
          const borderClass = isLive
            ? (NODE_BOTTLENECK_BORDER[liveData.result.bottleneckComponent]?.[key] ?? "border-slate-200")
            : "border-slate-200";
          const utilization =
            isLive && key === "cpu" ? liveData.result.cpuUtilization
            : isLive && key === "gpu" ? liveData.result.gpuUtilization
            : null;

          return (
            <div
              key={key}
              className={`absolute flex flex-col justify-center rounded-lg border bg-white px-3 shadow-sm transition-colors duration-300 ${borderClass}`}
              style={{
                left:   `${(n.x / SVG_W) * 100}%`,
                top:    `${(n.y / SVG_H) * 100}%`,
                width:  `${(n.w / SVG_W) * 100}%`,
                height: `${(n.h / SVG_H) * 100}%`,
              }}
            >
              <div className="flex items-center gap-2">
                <Icon size={14} className={`shrink-0 ${n.iconColor}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-slate-800 leading-tight">{n.label}</div>
                  <div className="text-[9px] text-slate-400 leading-tight truncate">{n.sub}</div>
                </div>
                {utilization !== null && (
                  <span className="text-[9px] font-mono font-semibold text-slate-500 shrink-0">{utilization}%</span>
                )}
              </div>
              {utilization !== null && (
                <div className="mt-1 h-0.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${utilization}%`,
                      backgroundColor: utilization > 90 ? "#ef4444" : utilization > 70 ? "#f59e0b" : "#10b981",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Layer 3 — animated packets (above nodes) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <g key={workload}>
            {config.streams.flatMap((stream, si) => {
              const pts: [number, number][] = stream.reversed
                ? ([...stream.points].reverse() as [number, number][])
                : stream.points;
              return Array.from({ length: stream.count }, (_, pi) => (
                <DataPacket
                  key={`${si}-${pi}`}
                  points={pts}
                  color={stream.color}
                  duration={stream.duration}
                  delay={(pi / stream.count) * stream.duration}
                />
              ));
            })}
          </g>
        </svg>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-500 leading-relaxed">{config.description}</p>
    </div>
  );
}
