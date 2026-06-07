
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
import {
  persistableImageUrl,
  storeGeneratedImageUrl,
  stripNonPersistableImageFields,
} from "@/server/lib/visual-image-storage";
import { stripUndefinedDeep, toFirestoreDocument } from "@/server/lib/strip-undefined-deep";
import { buildEducationalImagePrompt } from "@/server/lib/educational-image-prompt";

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
            const finalPrompt =
              validation.data.type === 'EDUCATIONAL_IMAGE' ||
              validation.data.type === 'VISUAL_DRAWING'
                ? buildEducationalImagePrompt({
                    title: validation.data.title,
                    topic: validation.data.prompt ?? validation.data.title,
                    studyLevel: validation.data.studyLevel,
                    subject: validation.data.subject,
                  })
                : validation.data.prompt;
          const imageResult = await generateImage({ prompt: finalPrompt! });
          visualOutput = { imageUrl: imageResult.imageUrl, revisedPrompt: imageResult.revisedPrompt };
        } else {
            throw new Error("Unsupported visual type.");
        }
        
        return visualOutput;
      },
    });
    
    const visualRef = adminDb.collection('generated_visuals').doc();
    const visualId = visualRef.id;

    let displayImageUrl = result.result.imageUrl;
    let firestoreImageUrl: string | null = null;
    if (result.result.imageUrl) {
      const stored = await storeGeneratedImageUrl(result.result.imageUrl, {
        userId: validation.data.userId,
        id: visualId,
      });
      displayImageUrl = stored.displayUrl ?? stored.firestoreUrl ?? undefined;
      firestoreImageUrl = stored.firestoreUrl;
      if (!firestoreImageUrl && result.result.imageUrl.startsWith('data:')) {
        return {
          success: false,
          error:
            'Image was generated but could not be saved. Configure Cloudinary (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and upload preset) so images can be stored.',
        };
      }
    }

    await visualRef.set(
      toFirestoreDocument({
        studentId: validation.data.studentId,
        userId: validation.data.userId,
        type: validation.data.type,
        title: validation.data.title,
        prompt: validation.data.prompt ?? null,
        data: validation.data.data ?? null,
        svg: result.result.svg ?? null,
        ...(firestoreImageUrl ? { imageUrl: firestoreImageUrl } : {}),
        acuCost: result.acu.chargedACUs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    );

    const libraryContent = stripUndefinedDeep(
      stripNonPersistableImageFields(
        {
          ...result.result,
          prompt: validation.data.prompt ?? null,
          data: validation.data.data ?? null,
          xAxisLabel: validation.data.xAxisLabel ?? null,
          yAxisLabel: validation.data.yAxisLabel ?? null,
          studyLevel: validation.data.studyLevel ?? null,
          subject: validation.data.subject ?? null,
        },
        firestoreImageUrl,
      ),
    );

    await savedResourceService.save({
      studentId: validation.data.studentId,
      type: validation.data.type,
      title: validation.data.title,
      content: libraryContent,
      linkedEntityId: visualId,
      subject: validation.data.subject ?? null,
      level: validation.data.studyLevel ?? null,
      topic: validation.data.title,
    });

    return {
      success: true,
      visual: {
        svg: result.result.svg,
        imageUrl: displayImageUrl,
      },
    };

  } catch (error: any) {
    console.error("Error in createVisualResourceAction:", error);
    return { success: false, error: error.message };
  }
}

export type SystemVisualContext = GenerateSystemVisualInput;

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
        await docRef.set(
          toFirestoreDocument({
            cacheKey,
            userId: 'SYSTEM',
            type: 'SYSTEM_VISUAL',
            title: `System Visual: ${cacheKey}`,
            prompt: result.revisedPrompt ?? null,
            ...(imageUrlToStore !== null ? { imageUrl: imageUrlToStore } : {}),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
        );
        
        return { success: true, imageUrl: result.imageUrl };

    } catch (error: any) {
        console.error(`Failed to generate system visual for context ${cacheKey}:`, error);
        return { success: false, error: error?.message ?? String(error) };
    }
}