
'use server';

import { aiTutorAssistance, AiTutorAssistanceInput, AiTutorAssistanceOutput } from '@/server/ai/flows/ai-tutor-assistance';
import { runStudYearAction } from '../services/pipeline';
import { savedResourceService } from '../services/resources';
import { adminDb } from '@/lib/firebase/admin-app';
import * as admin from 'firebase-admin';


export async function askAiTutor(
  input: AiTutorAssistanceInput,
  userId: string,
  sessionId?: string | null
): Promise<{ 
    success: boolean; 
    response?: AiTutorAssistanceOutput;
    chargedAcus?: number; 
    error?: string;
    sessionId?: string;
}> {
  if (!input.query || input.query.length < 2) {
    return { success: false, error: 'Please enter a valid question.' };
  }
  
  try {
    const result = await runStudYearAction({
        userId,
        studentId: userId,
        entityType: 'AI_TUTOR_SESSION',
        action: 'AI_TUTOR_USED',
        eventType: 'QUESTION_ASKED',
        stage: 'LEARN',
        featureKey: 'AI_EXPLANATION',
        payload: input,
        execute: async () => {
            const output = await aiTutorAssistance(input);
            const now = admin.firestore.FieldValue.serverTimestamp();
            
            let sessionRef;
            const newTranscript = [
                { role: 'user', content: input.query, createdAt: new Date() },
                { role: 'assistant', ...output, createdAt: new Date() }
            ];

            if (sessionId) {
                sessionRef = adminDb.collection('users').doc(userId).collection('ai_sessions').doc(sessionId);
                await sessionRef.update({
                    transcript: admin.firestore.FieldValue.arrayUnion(...newTranscript)
                });
            } else {
                 sessionRef = adminDb.collection('users').doc(userId).collection('ai_sessions').doc();
                 await sessionRef.set({
                    studentId: userId,
                    mode: 'chat',
                    subject: 'General',
                    topic: 'General Conversation',
                    createdAt: now,
                    transcript: newTranscript
                });
            }
            
            if (output.escalated) {
                console.log(`AI Tutor escalation for user ${userId}. Query: ${input.query}`);
            }

            const savedResourceQuery = await adminDb.collection('users').doc(userId).collection('saved_resources')
                .where('linkedEntityId', '==', sessionRef.id)
                .limit(1)
                .get();
            
            const fullTranscript = [...(input.history || []), ...newTranscript];

            if (savedResourceQuery.empty) {
                await savedResourceService.save({
                    studentId: userId,
                    type: 'AI_TUTOR_SESSION',
                    title: `AI Tutor: ${input.query.substring(0, 30)}...`,
                    content: { transcript: fullTranscript },
                    linkedEntityId: sessionRef.id,
                });
            } else {
                const savedResourceRef = savedResourceQuery.docs[0].ref;
                await savedResourceRef.update({
                    'content.transcript': fullTranscript,
                    updatedAt: now,
                });
            }
            
            return {
                ...output,
                sessionId: sessionRef.id,
            }
        }
    });
    
    return { 
        success: true, 
        response: result.result,
        chargedAcus: result.acu?.chargedACUs,
        sessionId: result.result.sessionId,
    };

  } catch (error: any) {
    console.error('Error asking AI Tutor:', error);
    return { success: false, error: error.message || 'Failed to get a response from the AI Tutor.' };
  }
}
