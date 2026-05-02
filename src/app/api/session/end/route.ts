
import { endActiveSession } from '@/server/services/session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, sessionId } = body;
    
    if (!uid || !sessionId) {
      return NextResponse.json({ success: false, error: 'Missing uid or sessionId' }, { status: 400 });
    }

    await endActiveSession(uid, sessionId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in end session API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
