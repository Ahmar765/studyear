/**
 * @fileOverview An AI agent that generates brand-aligned system visuals.
 *
 * This flow takes contextual information and injects it into a master prompt
 * to create a consistent, high-authority visual identity for the platform.
 */

import { z } from 'zod';
import { generateImage, GenerateImageOutput } from './image-generation';

const IntentSchema = z.enum(['control', 'risk', 'growth', 'insight']);
const PlatformTypeSchema = z.enum(['StudYear', 'Construx', 'Veryx']);
const ModuleTypeSchema = z.enum([
  'dashboard',
  'analytics',
  'alert',
  'report',
  'hero',
  'accountHeader',
]);
const UserRoleSchema = z.enum([
  'ADMIN',
  'STUDENT',
  'PARENT',
  'TUTOR',
  'SCHOOL_ADMIN',
  'SCHOOL_TUTOR',
]);

export const GenerateSystemVisualInputSchema = z.object({
  platform: PlatformTypeSchema,
  module: ModuleTypeSchema,
  user_role: UserRoleSchema,
  intent: IntentSchema,
});
export type GenerateSystemVisualInput = z.infer<typeof GenerateSystemVisualInputSchema>;

const getSubjectType = (role: z.infer<typeof UserRoleSchema>): string => {
  switch (role) {
    case 'ADMIN':
      return 'Executive operator reviewing a complex system interface';
    case 'SCHOOL_ADMIN':
      return 'School director analyzing performance data in a command center';
    case 'PARENT':
      return "Concerned parent observing a child's progress on a futuristic display";
    case 'TUTOR':
    case 'SCHOOL_TUTOR':
      return 'Professional educator monitoring multiple student data streams';
    case 'STUDENT':
    default:
      return 'Focused student interacting with an AI-augmented learning environment';
  }
};

const getEnvironmentType = (platform: z.infer<typeof PlatformTypeSchema>): string => {
  switch (platform) {
    case 'StudYear':
      return 'Intelligent learning environment with holographic data overlays';
    default:
      return 'Hyper-clean, futuristic, operational command center';
  }
};

const getLighting = (intent: z.infer<typeof IntentSchema>): string => {
  switch (intent) {
    case 'risk':
      return 'Sharp directional lighting with high contrast shadows and controlled red alert highlights';
    case 'growth':
      return 'Expansive, deep lighting with subtle upward-flowing blue light streaks';
    case 'insight':
      return 'Focused beam of white light illuminating a central data point, high contrast';
    case 'control':
    default:
      return 'Sharp directional lighting, high contrast shadows, and subtle glow accents of electric blue and white';
  }
};

export async function generateSystemVisual(
  input: GenerateSystemVisualInput
): Promise<GenerateImageOutput> {
  const { platform, module, user_role, intent } = input;

  const subject_type = getSubjectType(user_role);
  const environment_type = getEnvironmentType(platform);
  const lighting_style = getLighting(intent);

  const masterPrompt = `
Create a cinematic, ultra-premium, non-generic visual representing a ${platform} operating system for the ${module} module.

This is NOT a marketing image. This is a SYSTEM VISUAL embodying the platform's core identity.

STYLE:
- Enterprise-grade, high authority, dark intelligence aesthetic.
- A blend of Bloomberg Terminal, Palantir, and Apple keynote design philosophies.
- Matte black and deep charcoal environment.

LIGHTING:
- ${lighting_style}.

COMPOSITION:
- Centered or asymmetrical power framing to emphasize control.
- Clear depth layers: a foreground element suggesting user control (e.g., hand gesture, keyboard), a midground showing the system interface, and a background suggesting vast scale.
- Clean, structured, zero clutter.

SUBJECT:
- ${subject_type}.
- The subject must feel intentional and focused, not staged. Their expression should convey concentration and decision-making. No stock-photo smiles or postures.

ENVIRONMENT:
- ${environment_type}.
- The space should feel hyper-clean, futuristic, and operational. No generic offices, no clichés.

VISUAL SIGNALS:
- Abstract representations of data flow, system orchestration, and control layers.
- Subtle, non-readable holographic UI overlays that add texture and suggest complexity without being distracting.

TONE:
- Power, Control, Precision, Intelligence, and Financial/Academic Consequence.

NEGATIVE CONSTRAINTS:
- ABSOLUTELY NO stock photo style.
- NO smiling corporate teams.
- NO bright, cheerful backgrounds.
- NO generic office setups or computer monitors.
- NO overused tech tropes (e.g., glowing blue brains, binary code streams).
- NO randomness. Every element must feel deliberate.

OUTPUT:
An ultra-realistic, cinematic 4K image. Sharp, premium, and brand-defining.
    `;

  return generateImage({ prompt: masterPrompt });
}
