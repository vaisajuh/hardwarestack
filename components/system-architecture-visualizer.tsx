"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Monitor, MemoryStick, HardDrive } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Workload = "Idle" | "Standard Gaming" | "DirectStorage" | "AI Training";

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
      { points: PATHS["cpu-gpu"].points,  reversed: false, count: 4, color: "#3b82f6", duration: 0.7 },
    ],
    description:
      "Traditional pipeline: the CPU decompresses game assets from NVMe, stages them in RAM, processes game logic and draw calls, then streams the results to the GPU. The CPU is the central hub — every byte passes through it.",
  },
  DirectStorage: {
    streams: [
      { points: PATHS["nvme-gpu"].points, reversed: false, count: 5, color: "#10b981", duration: 0.55 },
      { points: PATHS["cpu-gpu"].points,  reversed: false, count: 1, color: "#94a3b8", duration: 1.8  },
    ],
    description:
      "Microsoft DirectStorage bypasses the CPU entirely. The GPU's onboard decompression engine pulls compressed textures directly from NVMe via PCIe, freeing the CPU and eliminating RAM as a staging area. Load times drop dramatically.",
  },
  "AI Training": {
    streams: [
      { points: PATHS["cpu-ram"].points, reversed: false, count: 4, color: "#8b5cf6", duration: 0.65 },
      { points: PATHS["cpu-ram"].points, reversed: true,  count: 4, color: "#8b5cf6", duration: 0.65 },
      { points: PATHS["cpu-gpu"].points, reversed: false, count: 4, color: "#8b5cf6", duration: 0.65 },
      { points: PATHS["cpu-gpu"].points, reversed: true,  count: 3, color: "#8b5cf6", duration: 0.70 },
    ],
    description:
      "During model training, the CPU continuously feeds batched training data from RAM to the GPU while gradients computed by the GPU flow back via PCIe for optimizer updates. The Memory Bus and PCIe ×16 link are under sustained, bidirectional load.",
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

// ── SystemArchitectureVisualizer ─────────────────────────────────────────────

const WORKLOAD_OPTIONS: Workload[] = ["Idle", "Standard Gaming", "DirectStorage", "AI Training"];

export function SystemArchitectureVisualizer() {
  const [workload, setWorkload] = useState<Workload>("Standard Gaming");
  const config = WORKLOADS[workload];

  return (
    <div className="flex flex-col gap-5">
      {/* Workload selector */}
      <div className="flex flex-wrap gap-2">
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
            const isBypass = key === "nvme-gpu";
            const bypassActive = isBypass && workload === "DirectStorage";
            return (
              <g key={key}>
                <path
                  d={pathD(def.points)}
                  fill="none"
                  stroke={bypassActive ? "#10b981" : "#cbd5e1"}
                  strokeWidth={isBypass ? 1.5 : 2}
                  strokeDasharray={isBypass ? "5 4" : undefined}
                />
                {(!isBypass || bypassActive) && (
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
          return (
            <div
              key={key}
              className="absolute flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm"
              style={{
                left:   `${(n.x / SVG_W) * 100}%`,
                top:    `${(n.y / SVG_H) * 100}%`,
                width:  `${(n.w / SVG_W) * 100}%`,
                height: `${(n.h / SVG_H) * 100}%`,
              }}
            >
              <Icon size={14} className={`shrink-0 ${n.iconColor}`} />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-800 leading-tight">{n.label}</div>
                <div className="text-[9px] text-slate-400 leading-tight truncate">{n.sub}</div>
              </div>
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
