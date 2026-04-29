export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Document {
  id: string;
  name: string;
  category: 'Akademik' | 'İdari' | 'Mali' | 'Disiplin' | 'Lisansüstü' | 'Yurt Dışı';
  status: 'Uyumlu' | 'Kısmen Uyumlu' | 'Uyumsuz';
  articleCount: number;
  nonCompliantArticles: string[];
  uploadDate: string;
}

export interface RAGModel {
  id: string;
  name: string;
  f1: number;
  precision: number;
  recall: number;
  latency: number;
  explainability: number;
  category: 'Simple' | 'Medium' | 'Complex';
  description: string;
  pros: string[];
  cons: string[];
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
