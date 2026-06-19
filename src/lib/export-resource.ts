'use client';

import type { SavedResourceDetail } from '@/server/actions/saved-resources-actions';

// ---------------------------------------------------------------------------
// PDF — browser print dialog (user chooses "Save as PDF")
// ---------------------------------------------------------------------------

export function exportAsPdf(): void {
  if (typeof window !== 'undefined') {
    window.print();
  }
}

// ---------------------------------------------------------------------------
// PPTX — build a presentation from the saved resource data
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Wrap long text so it fits inside a pptxgenjs text box (≈ 80 chars/line). */
function wrap(text: string, maxLen = 90): string {
  if (text.length <= maxLen) return text;
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + word).length > maxLen) {
      if (line) lines.push(line.trimEnd());
      line = word + ' ';
    } else {
      line += word + ' ';
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.join('\n');
}

type PptxjsModule = typeof import('pptxgenjs');

async function getPptx(): Promise<PptxjsModule['default']> {
  const mod = await import('pptxgenjs');
  return mod.default ?? (mod as unknown as { default: PptxjsModule['default'] }).default ?? mod;
}

const BRAND_BLUE = '1a56db';
const DARK_TEXT = '1e293b';
const MUTED_TEXT = '64748b';
const WHITE = 'FFFFFF';

function addTitleSlide(
  prs: InstanceType<PptxjsModule['default']>,
  title: string,
  subtitle: string,
) {
  const slide = prs.addSlide();
  slide.background = { color: BRAND_BLUE };
  slide.addText('StudYear', {
    x: 0.4,
    y: 0.3,
    w: 9,
    h: 0.5,
    fontSize: 12,
    color: 'ffffff80',
    bold: false,
  });
  slide.addText(title, {
    x: 0.4,
    y: 1.4,
    w: 9,
    h: 1.6,
    fontSize: 32,
    bold: true,
    color: WHITE,
    wrap: true,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.4,
      y: 3.2,
      w: 9,
      h: 0.8,
      fontSize: 16,
      color: 'ffffffcc',
      wrap: true,
    });
  }
}

function addContentSlide(
  prs: InstanceType<PptxjsModule['default']>,
  heading: string,
  bullets: string[],
) {
  const slide = prs.addSlide();
  slide.addText(heading, {
    x: 0.4,
    y: 0.3,
    w: 9,
    h: 0.65,
    fontSize: 20,
    bold: true,
    color: BRAND_BLUE,
  });
  slide.addShape('line' as any, {
    x: 0.4,
    y: 1.0,
    w: 9,
    h: 0,
    line: { color: BRAND_BLUE, width: 1 },
  });

  const items = bullets.map((b) => ({ text: wrap(b), options: { bullet: true } }));
  slide.addText(items as any, {
    x: 0.4,
    y: 1.15,
    w: 9,
    h: 4.5,
    fontSize: 13,
    color: DARK_TEXT,
    valign: 'top',
    wrap: true,
  });
}

function addKeyValueSlide(
  prs: InstanceType<PptxjsModule['default']>,
  heading: string,
  pairs: { label: string; value: string }[],
) {
  const slide = prs.addSlide();
  slide.addText(heading, {
    x: 0.4,
    y: 0.3,
    w: 9,
    h: 0.65,
    fontSize: 20,
    bold: true,
    color: BRAND_BLUE,
  });
  let y = 1.1;
  for (const { label, value } of pairs) {
    if (y > 6.5) break;
    slide.addText(label, { x: 0.4, y, w: 2.5, h: 0.35, fontSize: 11, bold: true, color: DARK_TEXT });
    slide.addText(wrap(value, 70), { x: 3.0, y, w: 6.5, h: 0.35, fontSize: 11, color: MUTED_TEXT, wrap: true });
    y += 0.45;
  }
}

// ----- resource-type specific builders ------------------------------------

function buildTopicSummary(
  prs: InstanceType<PptxjsModule['default']>,
  resource: SavedResourceDetail,
) {
  const body = isRecord(resource.content) ? resource.content : {};
  const summary = typeof body.summary === 'string' ? body.summary : '';
  addTitleSlide(prs, resource.title, 'Topic Summary');
  if (summary) {
    const chunks = summary.match(/.{1,500}/gs) ?? [summary];
    for (const chunk of chunks) {
      addContentSlide(prs, resource.title, chunk.split('\n').filter(Boolean));
    }
  }
}

function buildQuiz(
  prs: InstanceType<PptxjsModule['default']>,
  resource: SavedResourceDetail,
) {
  const body = isRecord(resource.content) ? resource.content : {};
  const questions = Array.isArray(body.questions) ? body.questions : [];
  addTitleSlide(prs, resource.title, `Quiz — ${questions.length} questions`);
  questions.forEach((q, i) => {
    if (!isRecord(q)) return;
    const question = typeof q.question === 'string' ? q.question : `Question ${i + 1}`;
    const options = Array.isArray(q.options) ? q.options.filter((o) => typeof o === 'string') as string[] : [];
    const answer = typeof q.correctAnswer === 'string' ? q.correctAnswer : '';
    const explanation = typeof q.explanation === 'string' ? q.explanation : '';
    const slide = prs.addSlide();
    slide.addText(`Q${i + 1}`, { x: 0.4, y: 0.25, w: 1, h: 0.5, fontSize: 14, bold: true, color: BRAND_BLUE });
    slide.addText(wrap(question, 100), { x: 0.4, y: 0.8, w: 9, h: 1.0, fontSize: 16, bold: true, color: DARK_TEXT, wrap: true });
    let y = 1.95;
    options.forEach((opt, oi) => {
      const letter = String.fromCharCode(65 + oi);
      const isCorrect = opt === answer || letter === answer;
      slide.addText(`${letter}. ${wrap(opt, 80)}`, {
        x: 0.4, y, w: 9, h: 0.45, fontSize: 12,
        color: isCorrect ? '166534' : DARK_TEXT,
        bold: isCorrect,
        wrap: true,
      });
      y += 0.5;
    });
    if (explanation) {
      slide.addText(`Explanation: ${wrap(explanation, 90)}`, {
        x: 0.4, y: Math.max(y + 0.1, 5.0), w: 9, h: 0.7, fontSize: 11, color: MUTED_TEXT, italic: true, wrap: true,
      });
    }
  });
}

function buildEssayPlan(
  prs: InstanceType<PptxjsModule['default']>,
  resource: SavedResourceDetail,
) {
  const body = isRecord(resource.content) ? resource.content : {};
  addTitleSlide(prs, resource.title, 'Essay Plan');
  if (typeof body.introduction === 'string') {
    addContentSlide(prs, 'Introduction', body.introduction.split('\n').filter(Boolean));
  }
  const paragraphs = Array.isArray(body.bodyParagraphs) ? body.bodyParagraphs : [];
  paragraphs.forEach((p, i) => {
    if (!isRecord(p)) return;
    const bullets: string[] = [];
    if (typeof p.point === 'string') bullets.push(`Point: ${p.point}`);
    if (typeof p.evidence === 'string') bullets.push(`Evidence: ${p.evidence}`);
    if (typeof p.explanation === 'string') bullets.push(`Explanation: ${p.explanation}`);
    addContentSlide(prs, `Body Paragraph ${i + 1}`, bullets);
  });
  if (typeof body.conclusion === 'string') {
    addContentSlide(prs, 'Conclusion', body.conclusion.split('\n').filter(Boolean));
  }
}

function buildLesson(
  prs: InstanceType<PptxjsModule['default']>,
  resource: SavedResourceDetail,
) {
  const body = isRecord(resource.content) ? resource.content : {};
  const lessonTitle = typeof body.lessonTitle === 'string' ? body.lessonTitle : resource.title;
  const lessonPlan = Array.isArray(body.lessonPlan) ? body.lessonPlan : [];
  const firstStep = typeof body.firstStepContent === 'string' ? body.firstStepContent : '';
  addTitleSlide(prs, lessonTitle, 'Interactive Lesson');
  if (lessonPlan.length) {
    addContentSlide(
      prs,
      'Lesson Plan',
      lessonPlan
        .filter(isRecord)
        .map((s) => `Step ${s.step ?? ''}: ${s.title ?? ''} — ${s.concept ?? ''}`),
    );
  }
  if (firstStep) {
    const chunks = firstStep.match(/.{1,600}/gs) ?? [firstStep];
    chunks.forEach((chunk, i) =>
      addContentSlide(prs, i === 0 ? 'Step 1' : 'Step 1 (continued)', chunk.split('\n').filter(Boolean)),
    );
  }
}

function buildCourse(
  prs: InstanceType<PptxjsModule['default']>,
  resource: SavedResourceDetail,
) {
  const body = isRecord(resource.content) ? resource.content : {};
  const courseTitle = typeof body.courseTitle === 'string' ? body.courseTitle : resource.title;
  const objective = typeof body.courseObjective === 'string' ? body.courseObjective : '';
  const modules = Array.isArray(body.modules) ? body.modules : [];
  addTitleSlide(prs, courseTitle, objective || 'AI Course');
  modules.forEach((mod) => {
    if (!isRecord(mod)) return;
    const modTitle = typeof mod.moduleTitle === 'string' ? mod.moduleTitle : 'Module';
    const lessons = Array.isArray(mod.lessons) ? mod.lessons : [];
    addContentSlide(
      prs,
      modTitle,
      lessons
        .filter(isRecord)
        .map((l) => `${l.lessonTitle ?? 'Lesson'}: ${l.lessonObjective ?? ''}`),
    );
  });
}

function buildFormulaSheet(
  prs: InstanceType<PptxjsModule['default']>,
  resource: SavedResourceDetail,
) {
  const body = isRecord(resource.content) ? resource.content : {};
  const formulas = Array.isArray(body.formulas) ? body.formulas : [];
  addTitleSlide(prs, resource.title, 'Formula Sheet');
  for (let i = 0; i < formulas.length; i += 6) {
    const chunk = formulas.slice(i, i + 6);
    addKeyValueSlide(
      prs,
      `Formulas${i > 0 ? ` (${i + 1}–${i + chunk.length})` : ''}`,
      chunk
        .filter(isRecord)
        .map((f) => ({
          label: typeof f.formula === 'string' ? f.formula : '',
          value: typeof f.description === 'string' ? f.description : '',
        })),
    );
  }
}

function buildRecoveryPlan(
  prs: InstanceType<PptxjsModule['default']>,
  resource: SavedResourceDetail,
) {
  const body = isRecord(resource.content) ? resource.content : {};
  const title = typeof body.title === 'string' ? body.title : resource.title;
  const objective = typeof body.recoveryObjective === 'string' ? body.recoveryObjective : '';
  const urgent = Array.isArray(body.urgentFocusAreas) ? body.urgentFocusAreas.filter((x) => typeof x === 'string') as string[] : [];
  const weekly = Array.isArray(body.weeklyRecoveryPlan) ? body.weeklyRecoveryPlan : [];
  const daily = Array.isArray(body.dailyNonNegotiables) ? body.dailyNonNegotiables.filter((x) => typeof x === 'string') as string[] : [];

  addTitleSlide(prs, title, objective || 'Recovery Plan');
  if (urgent.length) addContentSlide(prs, 'Priority Focus Areas', urgent);
  weekly.forEach((wk) => {
    if (!isRecord(wk)) return;
    const tasks = Array.isArray(wk.tasks)
      ? wk.tasks.filter(isRecord).map((t) => `${t.subject ?? ''}: ${t.topic ?? ''} — ${t.action ?? ''}`)
      : [];
    addContentSlide(prs, `Week ${wk.week ?? ''}${wk.focus ? ': ' + wk.focus : ''}`, tasks);
  });
  if (daily.length) addContentSlide(prs, 'Daily Habits', daily);
}

function buildStudyPlan(
  prs: InstanceType<PptxjsModule['default']>,
  resource: SavedResourceDetail,
) {
  const body = isRecord(resource.content) ? resource.content : {};
  addTitleSlide(prs, resource.title, 'Study Plan');
  const weekly = Array.isArray(body.weeklyPlans) ? body.weeklyPlans : [];
  for (const w of weekly) {
    if (!isRecord(w)) continue;
    const daily = Array.isArray(w.dailyPlans) ? w.dailyPlans : [];
    for (const dp of daily) {
      if (!isRecord(dp)) continue;
      const day = typeof dp.day === 'string' ? dp.day : 'Day';
      const sessions = Array.isArray(dp.sessions) ? dp.sessions : [];
      const bullets = sessions
        .filter(isRecord)
        .map((s) => `${s.time ?? ''} — ${s.subject ?? ''}: ${s.topic ?? ''} (${s.revisionMethod ?? ''})`);
      if (bullets.length) addContentSlide(prs, `Week ${w.week ?? ''} — ${day}`, bullets);
    }
  }
}

function buildGeneric(
  prs: InstanceType<PptxjsModule['default']>,
  resource: SavedResourceDetail,
) {
  addTitleSlide(prs, resource.title, resource.typeKey.replace(/_/g, ' '));
  const body = isRecord(resource.content) ? resource.content : {};
  const bullets = Object.entries(body)
    .filter(([, v]) => typeof v === 'string' && v.trim())
    .map(([k, v]) => `${k}: ${v}`);
  if (bullets.length) addContentSlide(prs, 'Details', bullets);
}

export async function exportAsPptx(resource: SavedResourceDetail): Promise<void> {
  const PptxGenJS = await getPptx();
  const prs = new (PptxGenJS as any)();
  prs.layout = 'LAYOUT_WIDE';

  const type = resource.typeKey;

  if (type === 'TOPIC_SUMMARY') buildTopicSummary(prs, resource);
  else if (type === 'AI_QUIZ') buildQuiz(prs, resource);
  else if (type === 'AI_ESSAY_PLAN') buildEssayPlan(prs, resource);
  else if (type === 'AI_INTERACTIVE_LESSON') buildLesson(prs, resource);
  else if (type === 'AI_COURSE') buildCourse(prs, resource);
  else if (type === 'FORMULA_SHEET') buildFormulaSheet(prs, resource);
  else if (type === 'RECOVERY_PLAN') buildRecoveryPlan(prs, resource);
  else if (type === 'STUDY_PLAN') buildStudyPlan(prs, resource);
  else buildGeneric(prs, resource);

  const fileName = resource.title.replace(/[^a-z0-9\s-]/gi, '').trim().replace(/\s+/g, '-') || 'resource';
  await prs.writeFile({ fileName: `${fileName}.pptx` });
}
