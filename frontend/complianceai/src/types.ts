// Real types aligned with backend API responses

export interface PipelineResult {
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

// Legacy types kept for pages that still use static data
export interface Document {
  id: string;
  name: string;
  category: 'Akademik' | 'İdari' | 'Mali' | 'Disiplin' | 'Lisansüstü' | 'Yurt Dışı';
  status: 'Uyumlu' | 'Kısmen Uyumlu' | 'Uyumsuz';
  articleCount: number;
  nonCompliantArticles: string[];
  uploadDate: string;
}

export interface Article {
  id: string;
  number: string;
  title: string;
  status: 'Uyumlu' | 'Kısmen Uyumlu' | 'Uyumsuz';
  similarity: number;
  text: string;
  yokReference: string;
  yokText: string;
  reasoning: string[];
  suggestion: string;
}

export interface CategoryScore {
  name: string;
  score: number;
}

export interface TrendData {
  month: string;
  uyumlu: number;
  kismen: number;
  uyumsuz: number;
}
