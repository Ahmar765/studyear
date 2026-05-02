/**
 * Genkit registers Gemini (API key) models as `googleai/<modelId>` — bare `gemini-…` strings
 * resolve to NOT_FOUND. See `@genkit-ai/google-genai` (model ref `name: googleai/${name}`).
 * This app only loads the `googleAI` plugin in `index.ts`.
 */
const DEFAULT_GEMINI = 'googleai/gemini-2.5-flash';

export function toGoogleAiGenkitModel(model?: string | null): string {
    const raw = typeof model === 'string' ? model.trim() : '';
    if (!raw) return DEFAULT_GEMINI;
    if (raw.includes('/')) return raw;
    if (/^(gpt-|o[0-9]|chatgpt-)/i.test(raw)) return raw;
    return `googleai/${raw}`;
}
