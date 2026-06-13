'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  approveInfluencerAction,
  suspendPartnerAction,
} from '@/server/actions/growth-partner-actions';
import { tierDisplayName, type GrowthPartnerTier } from '@/data/growth-partner-programme';

type Partner = {
  userId: string;
  referralCode: string;
  tier: GrowthPartnerTier;
  successfulPaidReferrals: number;
  status: string;
  email: string | null;
  name: string | null;
};

export function AdminGrowthPartnerActions({ partner }: { partner: Partner }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async (action: 'approve' | 'suspend') => {
    if (!user) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const result =
        action === 'approve'
          ? await approveInfluencerAction(partner.userId, token)
          : await suspendPartnerAction(
              partner.userId,
              'Suspended from admin Growth Partners panel',
              token,
            );
      if (!result.ok) {
        toast({ variant: 'destructive', title: 'Action failed', description: result.error });
      } else {
        toast({
          title: action === 'approve' ? 'Influencer approved' : 'Partner suspended',
        });
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex justify-end gap-2">
      {partner.tier !== 'APPROVED_INFLUENCER' && partner.status === 'ACTIVE' && (
        <Button size="sm" disabled={busy} onClick={() => run('approve')}>
          Approve influencer
        </Button>
      )}
      {partner.status === 'ACTIVE' && (
        <Button size="sm" variant="destructive" disabled={busy} onClick={() => run('suspend')}>
          Suspend
        </Button>
      )}
    </div>
  );
}

export function PartnerTierBadge({ tier }: { tier: GrowthPartnerTier }) {
  return <Badge variant="secondary">{tierDisplayName(tier)}</Badge>;
}

export function FlaggedAttributionsTable({
  flagged,
}: {
  flagged: Array<{ id: string; referrerUserId?: string; referredUserId?: string; status?: string }>;
}) {
  if (flagged.length === 0) return null;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Referred user</TableHead>
          <TableHead>Referrer</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flagged.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono text-xs">{row.referredUserId}</TableCell>
            <TableCell className="font-mono text-xs">{row.referrerUserId}</TableCell>
            <TableCell>{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
