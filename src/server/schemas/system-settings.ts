import { z } from 'zod';

const AIProviderConfigSchema = z.object({
  defaultProvider: z.enum(['openai', 'gemini', 'vertex']),
  fallbackOrder: z.array(z.enum(['openai', 'gemini', 'vertex'])),
  modelMap: z.object({
    openai: z.object({ performance: z.string(), costEffective: z.string() }),
    gemini: z.object({ performance: z.string(), costEffective: z.string() }),
    vertex: z.object({ performance: z.string(), costEffective: z.string() }),
  }),
});

const FeatureFlagsSchema = z.object({
  tutor_marketplace: z.boolean(),
  parent_dashboard: z.boolean(),
  school_portal: z.boolean(),
  ai_feedback: z.boolean(),
});

const PricingRulesSchema = z.object({
  multiplier: z.number(),
  tutor_commission: z.number(),
});

export const SystemSettingsSchema = z.object({
  aiProvider: AIProviderConfigSchema.optional(),
  featureFlags: FeatureFlagsSchema.optional(),
  pricingRules: PricingRulesSchema.optional(),
});

export type SystemSettings = z.infer<typeof SystemSettingsSchema>;
