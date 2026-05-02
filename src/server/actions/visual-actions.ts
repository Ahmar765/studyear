
'use server';

import { runPaidAIFeature } from "../services/run-paid-ai-feature";
import { savedResourceService } from "../services/resources";
import { generateImage, GenerateImageOutput } from "../ai/flows/image-generation";
import { generateChartSvg } from "../services/visual-svg.service";
import { adminDb } from "@/lib/firebase/admin-app";
import { FeatureKey } from "@/data/acu-costs";
import {
  type GenerateSystemVisualInput,
  generateSystemVisual,
} from "../ai/flows/system-visual-generation";
import * as admin from 'firebase-admin';
import { VisualRequestSchema, type VisualRequest } from "@/server/schemas/visual-request";

export async function createVisualResourceAction(input: VisualRequest): Promise<{ success: boolean; visual?: { svg?: string, imageUrl?: string }; error?: string; }> {
  const validation = VisualRequestSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.flatten().formErrors.join(', ') };
  }
  
  const featureKey = validation.data.type as FeatureKey;

  try {
    const result = await runPaidAIFeature({
      userId: validation.data.userId,
      featureKey: featureKey,
      metadata: { studentId: validation.data.studentId, visualType: validation.data.type, title: validation.data.title },
      action: async () => {
        let visualOutput: { svg?: string, imageUrl?: string, revisedPrompt?: string } = {};

        const isChart = ["BAR_GRAPH", "LINE_GRAPH", "PIE_CHART", "SCATTER_PLOT", "HISTOGRAM", "PICTOGRAPH", "COORDINATE_GRAPH", "GEOMETRY_DIAGRAM", "FUNCTION_GRAPH", "GRAPH_THEORY_DIAGRAM"].includes(validation.data.type);
        const isImage = ["EDUCATIONAL_IMAGE", "VISUAL_DRAWING"].includes(validation.data.type);
        
        if (isChart) {
          visualOutput = generateChartSvg(validation.data);
        } else if (isImage) {
            let finalPrompt = validation.data.prompt;
            if (validation.data.type === 'EDUCATIONAL_IMAGE') {
                finalPrompt = `
Create a child-friendly educational image for primary school learners.

Title: ${validation.data.title}
Topic: ${validation.data.prompt}
Study level: ${validation.data.studyLevel ?? "Primary School"}

Rules:
- Bright but clean colours
- Simple shapes
- No scary content
- No complex adult themes
- No clutter
- Use age-appropriate visuals
- Make it easy for a child to understand
- No unnecessary text unless educational labels are needed
- Suitable for classroom and parent use
`;
            }
          const imageResult = await generateImage({ prompt: finalPrompt! });
          visualOutput = { imageUrl: imageResult.imageUrl, revisedPrompt: imageResult.revisedPrompt };
        } else {
            throw new Error("Unsupported visual type.");
        }
        
        return visualOutput;
      },
    });
    
    const visualRef = adminDb.collection('generated_visuals').doc();
    await visualRef.set({
      studentId: validation.data.studentId,
      userId: validation.data.userId,
      type: validation.data.type,
      title: validation.data.title,
      prompt: validation.data.prompt ?? null,
      data: validation.data.data ?? null,
      svg: result.result.svg ?? null,
      imageUrl: result.result.imageUrl ?? null,
      acuCost: result.acu.chargedACUs,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await savedResourceService.save({
      studentId: validation.data.studentId,
      type: validation.data.type,
      title: validation.data.title,
      content: { ...result.result, prompt: validation.data.prompt },
      linkedEntityId: visualRef.id,
    });

    return { success: true, visual: result.result };

  } catch (error: any) {
    console.error("Error in createVisualResourceAction:", error);
    return { success: false, error: error.message };
  }
}

export type SystemVisualContext = GenerateSystemVisualInput;

/** Firestore string fields cap ~1MiB; skip persisting huge data URLs (use HTTPS URLs only for cache). */
const FIRESTORE_SAFE_IMAGE_URL_MAX = 900_000;
function persistableImageUrl(url: string | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('data:')) return null;
  if (url.length > FIRESTORE_SAFE_IMAGE_URL_MAX) return null;
  return url;
}

export async function generateSystemVisualAction(context: SystemVisualContext): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    const { platform, module, user_role, intent } = context;
    const cacheKey = `${platform}-${module}-${user_role}-${intent}`;

    try {
        const cacheRef = adminDb.collection('generated_visuals').where('cacheKey', '==', cacheKey).limit(1);
        const cacheSnap = await cacheRef.get();

        if (!cacheSnap.empty) {
            const cachedData = cacheSnap.docs[0].data();
            if (cachedData.imageUrl) {
                return { success: true, imageUrl: cachedData.imageUrl };
            }
        }
        
        const result = await generateSystemVisual(context);

        const docRef = adminDb.collection('generated_visuals').doc();
        const imageUrlToStore = persistableImageUrl(result.imageUrl);
        await docRef.set({
            cacheKey,
            userId: 'SYSTEM',
            type: 'SYSTEM_VISUAL',
            title: `System Visual: ${cacheKey}`,
            prompt: result.revisedPrompt,
            ...(imageUrlToStore !== null ? { imageUrl: imageUrlToStore } : {}),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        return { success: true, imageUrl: result.imageUrl };

    } catch (error: any) {
        console.error(`Failed to generate system visual for context ${cacheKey}:`, error);
        return { success: false, error: error?.message ?? String(error) };
    }
}