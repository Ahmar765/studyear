/** UK English educational image prompts — labels must be readable curriculum terminology. */
export function buildEducationalImagePrompt(params: {
  title: string;
  topic: string;
  studyLevel?: string | null;
  subject?: string | null;
  rationale?: string | null;
}): string {
  const level = params.studyLevel?.trim() || 'secondary school';
  const subject = params.subject?.trim() || 'General';
  const context = params.rationale?.trim();

  return [
    `Create a clear, clean educational diagram or illustration on the topic: "${params.topic}".`,
    `Subject area: ${subject}. Intended audience: ${level} students in the UK.`,
    context ? `Additional context: ${context}` : '',
    '',
    'VISUAL REQUIREMENTS:',
    '- Draw only the subject described above. Do not mix unrelated topics in the same image.',
    '- For science/anatomy: show accurate anatomical structures with short leader lines pointing to each labelled part.',
    '- Labels must be plain, readable English words only — the correct biological or technical name for each part.',
    '- Keep labels minimal and precise (e.g. "biceps brachii", "triceps", "deltoid"). Do not add any other text.',
    '- No titles, headings, legends, watermarks, or level descriptors inside the image.',
    '- Do not reproduce any text from these instructions as visual text in the image.',
    '- Clean white or light background. No decorative clutter.',
    '- Style: clear textbook diagram, suitable for revision.',
  ]
  .filter(Boolean)
  .join('\n');
}
