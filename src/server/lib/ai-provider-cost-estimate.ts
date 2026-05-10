import type { AIProvider } from '@/server/ai/gateway-schema';
import { GBP_PER_ACU_ENTRY_RATE } from '@/data/acu-economics';

/** FX hint for dashboards only — not financial reporting. */
export const USD_TO_GBP_ASSUMED = 0.79;

function normalizeModelId(model: string): string {
  return model
    .replace(/^googleai\//i, '')
    .replace(/^models\//i, '')
    .trim()
    .toLowerCase();
}

/**
 * Approximate list-price USD per 1M tokens (input / output). Tune when providers change pricing.
 */
function usdPerMillionTokens(model: string): { input: number; output: number } {
  const m = normalizeModelId(model);
  if (m.includes('gpt-4o-mini')) return { input: 0.15, output: 0.6 };
  if (m.includes('gpt-4o')) return { input: 2.5, output: 10 };
  if (m.includes('gpt-4-turbo')) return { input: 10, output: 30 };
  if (m.includes('gpt-4')) return { input: 10, output: 30 };
  if (m.includes('gpt-3.5')) return { input: 0.5, output: 1.5 };
  if (m.includes('flash')) return { input: 0.1, output: 0.4 };
  if (m.includes('gemini') && m.includes('pro')) return { input: 1.25, output: 5 };
  if (m.includes('gemini')) return { input: 0.2, output: 0.8 };
  if (m.includes('claude')) return { input: 3, output: 15 };
  return { input: 1.0, output: 4.0 };
}

/** Estimated provider-side USD cost from token counts (excludes caching discounts, tiers, etc.). */
export function estimateProviderUsdCost(
  _provider: AIProvider,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const r = usdPerMillionTokens(model);
  const usd =
    (Math.max(0, inputTokens) / 1_000_000) * r.input +
    (Math.max(0, outputTokens) / 1_000_000) * r.output;
  return Math.round(usd * 1_000_000) / 1_000_000;
}

export function buildAiUsagePricingFields(
  provider: AIProvider,
  model: string,
  inputTokens: number,
  outputTokens: number,
  chargedAcus: number,
): { realCostUsd: number; customerChargeEquivalentGbp: number } {
  const safeAcus = typeof chargedAcus === 'number' && !Number.isNaN(chargedAcus) ? chargedAcus : 0;
  return {
    realCostUsd: estimateProviderUsdCost(provider, model, inputTokens, outputTokens),
    customerChargeEquivalentGbp: safeAcus * GBP_PER_ACU_ENTRY_RATE,
  };
}
