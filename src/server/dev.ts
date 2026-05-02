import { config } from 'dotenv';
config({ path: `.env.local` });

// This file is the entry point for the Genkit developer UI.
// It imports all the defined flows so that they can be discovered.
// IT SHOULD NOT BE IMPORTED BY ANY RUNTIME APPLICATION CODE.

// The act of importing these flow files will cause them to be registered with Genkit.
import './ai/flows/topic-summarization.ts';
import './ai/flows/personalized-recommendations.ts';
import './ai/flows/seo-generation.ts';
import './ai/flows/course-generation.ts';
import './ai/flows/essay-plan-generation.ts';
import './ai/flows/flashcard-generation.ts';
import './ai/flows/quiz-generation.ts';
import './ai/flows/written-answer-feedback.ts';
import './ai/flows/ai-lesson-generation.ts';
import './ai/flows/ai-tutor-assistance.ts';
import './ai/flows/blog-post-generation.ts';
import './ai/flows/exam-prediction-generation.ts';
import './ai/flows/formula-sheet-generation.ts';
import './ai/flows/mind-map-generation.ts';
import './ai/flows/progress-report-generation.ts';
import './ai/flows/revision-sheet-generation.ts';
import './ai/flows/similar-content-recommendation.ts';
import './ai/flows/study-plan-generation.ts';
import './ai/flows/diagnostic-report-generation.ts';
import './ai/flows/explain-topic.ts';
import './ai/flows/intervention-generation.ts';
import './ai/flows/recovery-plan-generation.ts';
import './ai/flows/image-generation.ts';
import './ai/flows/chart-generation.ts';
import './ai/flows/assignment-review-generation.ts';
