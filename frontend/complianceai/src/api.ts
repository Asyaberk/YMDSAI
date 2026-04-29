// ── API base ────────────────────────────────────────────────────────────────
const BASE = "http://127.0.0.1:8001/api";

// ── Types mirroring backend responses ───────────────────────────────────────
export interface SummaryRow {
  pipeline: string;
  pipeline_label: string;
  pipeline_color: string;
  model: string;
  n: number;
  accuracy: number | null;
  recall_at_k: number | null;
  mrr: number | null;
  mean_pred_score: number | null;
  mean_latency: number | null;
  total_cost: number | null;
}

export interface SummaryMeta {
  best_pipeline: string;
  best_recall_at_k: number;
  best_model: string;
  total_cost_usd: number;
  mean_accuracy: number;
  n_cases: number;
  n_pipelines: number;
}

export interface SummaryResponse {
  rows: SummaryRow[];
  meta: SummaryMeta;
}

export interface ExperimentAgg {
  pipeline: string;
  pipeline_label: string;
  pipeline_color: string;
  model: string;
  n: number;
  accuracy: number | null;
  recall_at_k: number | null;
  mrr: number | null;
  mean_pred_score: number | null;
  mean_latency: number | null;
  total_cost: number | null;
}

export interface ExperimentRaw {
  case_id: string;
  pipeline: string;
  model: string;
  gold_label: string;
  pred_label: string;
  pred_score: number | null;
  correct: boolean | null;
  recall_at_k: number | null;
  mrr: number | null;
  latency_sec: number | null;
  cost_usd: number | null;
}

export interface ExperimentResponse {
  aggregated: ExperimentAgg[];
  raw: ExperimentRaw[];
}

// ── Fetch helpers ────────────────────────────────────────────────────────────
export async function fetchSummary(): Promise<SummaryResponse> {
  const res = await fetch(`${BASE}/summary`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchExperiments(): Promise<ExperimentResponse> {
  const res = await fetch(`${BASE}/experiments`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
