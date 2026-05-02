import type { AIFeatureKey } from '@/data/acu-costs';

// =========================================================================================
//  AI Gateway Data Contracts
// =========================================================================================
//  These interfaces define the data structures for all AI interactions, ensuring
//  consistency and type safety across the platform's AI features.

export type AITaskType = AIFeatureKey | 'recommendation' | 'diagnostic_report' | 'blog_post' | 'grade_prediction' | 'summarizer' | 'ai_tutor' | 'intervention';

export type AIProvider = 'openai' | 'gemini' | 'vertex';
export type ProviderHealthStatus = "healthy" | "degraded" | "down";

export interface AIRequestContext {
  requestId: string;
  userId: string;
  tenantId?: string;
  role: "student" | "parent" | "tutor" | "teacher" | "school_admin" | "admin" | "support_admin";
  subscriptionTier: string;
  taskType: AITaskType;
  featureName: string;
  entitlement?: AIFeatureKey; // e.g., "AI_FEEDBACK", "AI_COURSE_GENERATOR"
  inputModality?: "text" | "file" | "image" | "mixed";
  estimatedInputTokens: number;
  latencyPriority?: "low" | "medium" | "high";
  qualityPriority?: "low" | "medium" | "high";
  costPriority?: "low" | "medium" | "high";
  complianceMode?: "standard" | "gcp_only";
  idempotencyKey: string;
}

export interface AIUserInput<T> {
  promptPayload: T,
  files?: Array<{
    fileId: string;
    mimeType: string;
    storagePath: string;
  }>;
  metadata?: Record<string, unknown>;
}


export interface AIProviderUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  actualCost?: number;
}

export interface AINormalizedResponse<TOutput> {
  requestId: string;
  provider: AIProvider;
  model: string;
  taskType: AITaskType;
  status: "success" | "failed";
  output: TOutput;
  usage: AIProviderUsage;
  latencyMs: number;
  fallbackUsed: boolean;
}
