// THIS FILE IS DEPRECATED.
// Logic has been moved to src/server/services/acu-service.ts
// and src/data/acu-costs.ts.

export type Provider = "openai" | "gemini" | "vertex";

export interface UsageMetrics {
  inputTokens: number;
  cachedInputTokens?: number;
  outputTokens: number;
  pages?: number;
  images?: number;
  secondsAudio?: number;
}

export interface ModelPricing {
  provider: Provider;
  model: string;
  pricingMode: "token" | "fixed" | "hybrid";
  inputCostPer1M?: number;
  cachedInputCostPer1M?: number;
  outputCostPer1M?: number;
  fixedUsdPerCall?: number;
}

export interface PricingPolicy {
  featureType: string;
  tier: "control" | "professional" | "decision" | "enterprise";
  multiplierMin: number;
  multiplierMax: number;
  fixedAcuFee?: number;
  perPageAcuFee?: number;
  inputCapTokens?: number;
  outputCapTokens?: number;
  marginFloorPct: number; // e.g. 0.60
}

export interface QuoteResult {
  realCost: number;
  chargedEquivalent: number;
  chargedAcus: number;
  multiplierApplied: number;
}
