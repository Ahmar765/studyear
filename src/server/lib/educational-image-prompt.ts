/** UK English educational image prompts — labels must be readable curriculum terminology. */
export function buildEducationalImagePrompt(params: {
  title: string;
  topic: string;
  studyLevel?: string | null;
  subject?: string | null;
  rationale?: string | null;
}): string {
  const level = params.studyLevel?.trim() || 'UK secondary school (GCSE/A-Level)';
  const subject = params.subject?.trim() || 'General';
  const context = params.rationale?.trim();

  return [
    'Create a clear educational diagram or illustration for UK students.',
    '',
    `Title: ${params.title}`,
    `Subject: ${subject}`,
    `Study level: ${level}`,
    `Topic: ${params.topic}`,
    context ? `Context: ${context}` : '',
    '',
    'Rules:',
    '- ALL text labels must be in UK English with correct curriculum terminology',
    '- Use clear leader lines when labelling parts (e.g. muscles, organs, graph axes, data series)',
    '- Layout suitable for revision — match the study level (not childish for GCSE/A-Level)',
    '- No foreign language text, no decorative nonsense labels, no clutter',
    '- For graphs: label axes, units, and legend entries in UK English',
    '- Suitable for classroom, parent, and exam revision use',
  ]
    .filter(Boolean)
    .join('\n');
}
