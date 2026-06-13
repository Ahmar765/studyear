import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import {
  listFlaggedAttributions,
  listPartnersForAdmin,
} from '@/server/lib/growth-partner';
import {
  AdminGrowthPartnerActions,
  FlaggedAttributionsTable,
  PartnerTierBadge,
} from '@/components/admin/admin-growth-partners-panel';
import { GROWTH_PARTNER_PROGRAMME } from '@/data/growth-partner-programme';

export default async function AdminGrowthPartnersPage() {
  const [partners, flagged] = await Promise.all([
    listPartnersForAdmin(),
    listFlaggedAttributions(),
  ]);
  const error: string | null = null;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {GROWTH_PARTNER_PROGRAMME.name}
        </h2>
        <p className="max-w-3xl text-muted-foreground">
          Approve influencers, review flagged attributions, and monitor referral performance.
          Commission is paid on net eligible revenue only, with monthly and per-customer caps.
        </p>
      </div>

      {error && <p className="text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Growth partners
          </CardTitle>
          <CardDescription>
            Standard referrers earn ACUs; Growth Referrers and approved influencers earn commission
            subject to fraud review and caps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Paid referrals</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner) => (
                <TableRow key={partner.userId}>
                  <TableCell>
                    <div className="font-medium">{partner.name ?? '—'}</div>
                    <div className="text-sm text-muted-foreground">{partner.email}</div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{partner.referralCode}</TableCell>
                  <TableCell>
                    <PartnerTierBadge tier={partner.tier} />
                  </TableCell>
                  <TableCell>{partner.successfulPaidReferrals ?? 0}</TableCell>
                  <TableCell>
                    <Badge
                      variant={partner.status === 'ACTIVE' ? 'secondary' : 'destructive'}
                    >
                      {partner.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AdminGrowthPartnerActions partner={partner} />
                  </TableCell>
                </TableRow>
              ))}
              {partners.length === 0 && !error && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No growth partner profiles yet — they are created when users open the programme
                    page.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {flagged.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Flagged attributions</CardTitle>
            <CardDescription>
              Review for self-referral, refund abuse, or duplicate household patterns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FlaggedAttributionsTable flagged={flagged} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
