# StudYear - AI Academic Performance Operating System

This monorepo implements a provider-agnostic ACU monetisation and control layer.

## Rules:
1. No app may call OpenAI, Gemini, or Vertex directly.
2. Every AI request must be quoted, reserved, executed, then settled.
3. Raw provider cost is internal only.
4. User-facing systems expose only ACU pricing and ACU balances.
5. Model selection is routing policy, not product logic.

## Strategic Product Objective

The platform must not behave like a content library. It must behave like an **AI academic command centre**.

It will:
- Diagnose the student’s current position
- Predict likely outcomes by subject
- Identify grade gaps
- Build a personalised improvement plan
- Generate live dashboards automatically
- Adapt every day based on performance data
- Push the student toward measurable grade uplift
- Employ machine learning and behavioral learning to enhance outcomes
- Utilise dynamic AI-powered SEO to maintain high search engine visibility
- Track online user engagement to deliver timely interventions and support

## Core Platform Modules

- **Diagnostic & Predictive Engine:** Assesses student knowledge and predicts academic trajectories.
- **AI Planning & Automation:** Generates and adapts personalized study plans.
- **Intelligent Dashboards:** Provides real-time insights for students, parents, and educators.
- **AI Tutoring & Feedback:** Offers on-demand academic support and marks written work.
- **Progress Tracking & Accountability:** Monitors performance and encourages consistency.
- **Exam Optimisation:** Focuses revision on high-impact areas to maximize exam scores.
- **Multi-Tenant Administration:** Allows schools and parents to manage their cohorts effectively.

## Technical Architecture

The platform is built on a modern, scalable tech stack designed for high performance and security.

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, ShadCN UI
- **Backend:** Next.js Server Actions & API Routes, Firebase (App Hosting)
- **AI & Machine Learning:** Genkit, Google Gemini, Vertex AI
- **Database:** Firestore
- **Authentication:** Firebase Authentication
- **Payments:** Stripe
