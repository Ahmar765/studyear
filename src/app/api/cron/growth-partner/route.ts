import { NextRequest, NextResponse } from 'next/server';
import {
  advancePendingCommissions,
  releasePendingAcuRewards,
} from '@/server/lib/growth-partner';

/** Daily/hourly cron: release ACU rewards and advance commissions past review window. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const querySecret = req.nextUrl.searchParams.get('secret');

  if (secret && auth !== `Bearer ${secret}` && querySecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [acu, commissions] = await Promise.all([
    releasePendingAcuRewards(),
    advancePendingCommissions(),
  ]);

  return NextResponse.json({
    ok: true,
    acuRewards: acu,
    commissions,
  });
}
