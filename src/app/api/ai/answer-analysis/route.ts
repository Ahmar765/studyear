

import { NextResponse } from "next/server";
import { calculateStruggleScore, shouldTriggerIntervention } from "@/server/services/prediction-engine";
import { triggerInterventionAction } from "@/server/actions/intervention-actions";
import { logActivityEvent } from "@/server/services/activity";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { studentId, subject, topic, mistakePattern, wrongStreak, timeTakenSec, expectedTimeSec, hintUsageCount } = body;

    if (!studentId || !subject || !topic || !mistakePattern) {
        return NextResponse.json({ success: false, error: 'Missing required fields for analysis.' }, { status: 400 });
    }

    const struggleScore = calculateStruggleScore({
      wrongStreak: wrongStreak ?? 0,
      timeTakenSec: timeTakenSec ?? 0,
      expectedTimeSec: expectedTimeSec ?? 60,
      hintUsageCount: hintUsageCount ?? 0
    });

    // Log the analysis event
    await logActivityEvent(studentId, "ANSWER_ANALYSED", {
      subject,
      topic,
      ...body,
      struggleScore
    });

    // Check if an intervention is needed
    if (shouldTriggerIntervention(struggleScore)) {
      // The `triggerInterventionAction` will handle the AI call and saving the resource.
      const interventionResult = await triggerInterventionAction({
        studentId,
        subject,
        topic,
        mistakePattern,
        struggleScore,
        userId: studentId, // For ACU debiting etc., the student is the user.
      });
      
      if (interventionResult.success) {
        return NextResponse.json({
          success: true,
          struggleScore,
          interventionTriggered: true,
          intervention: interventionResult.output
        });
      } else {
        // If intervention fails, still report the score but flag the error
        console.error("Intervention trigger failed:", interventionResult.error);
        return NextResponse.json({
          success: true,
          struggleScore,
          interventionTriggered: false,
          error: `Intervention failed: ${interventionResult.error}`
        });
      }
    }
    
    // No intervention needed
    return NextResponse.json({
      success: true,
      struggleScore,
      interventionTriggered: false
    });

  } catch (error: any) {
    console.error("Error in answer analysis route:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
