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

const MessageBlockSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  body: z.string().optional(),
});

const CommunicationsSchema = z.object({
  supportEmail: z.string().email().optional(),
  contactEmail: z.string().email().optional(),
  noreplyEmail: z.string().email().optional(),
  forgotPassword: MessageBlockSchema.optional(),
  contactForm: MessageBlockSchema.optional(),
  signupWelcome: MessageBlockSchema.optional(),
});

export const SystemSettingsSchema = z.object({
  aiProvider: AIProviderConfigSchema.optional(),
  featureFlags: FeatureFlagsSchema.optional(),
  pricingRules: PricingRulesSchema.optional(),
  communications: CommunicationsSchema.optional(),
});

export type CommunicationsSettings = z.infer<typeof CommunicationsSchema>;

export type SystemSettings = z.infer<typeof SystemSettingsSchema>;
