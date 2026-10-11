// llama.cpp / GGUF quantisation levels, plus MXFP4 for models that ship pre-quantised.
export type QuantId = "F16" | "Q8_0" | "Q5_K_M" | "Q4_K_M" | "MXFP4";

export interface QuantLevel {
  id: QuantId;
  label: string;
  bitsPerWeight: number; // effective average, including per-block scales
  description: string;
}

export type LlmFamily = "Llama" | "Qwen" | "Mistral" | "Gemma" | "Phi" | "DeepSeek" | "gpt-oss";

// Layers with sliding-window attention only cache the last `windowTokens` tokens.
export interface SlidingWindowKv {
  windowTokens: number;
  bytesPerToken: number;
}

export interface LlmModel {
  slug: string;
  name: string;
  family: LlmFamily;
  paramsB: number;               // total parameters, billions
  activeParamsB: number | null;  // parameters read per token (mixture-of-experts only)
  kvBytesPerToken: number;       // FP16 KV cache per token across full-attention layers
  slidingWindowKv: SlidingWindowKv | null;
  maxContextTokens: number;
  quants: QuantId[];
  quantBitsOverride?: Partial<Record<QuantId, number>>; // measured from the published checkpoint
  license: string;
  releaseDate: string;           // YYYY-MM
  hfRepo: string;
}
