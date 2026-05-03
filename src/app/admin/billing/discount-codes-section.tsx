'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  createDiscountCodeAction,
  deactivateDiscountCodeAction,
  listDiscountCodesAction,
  type DiscountCodeRow,
} from '@/server/actions/discount-actions';
import { Badge } from '@/components/ui/badge';
import { Loader } from 'lucide-react';

export default function DiscountCodesSection() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [codes, setCodes] = useState<DiscountCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('10');

  const load = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await listDiscountCodesAction(token);
    if (res.error) {
      toast({ variant: 'destructive', title: 'Could not load codes', description: res.error });
    }
    setCodes(res.codes);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    load();
  }, [user, authLoading]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) {
      toast({ variant: 'destructive', title: 'Enter a positive value.' });
      return;
    }
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await createDiscountCodeAction(token, {
        code,
        type,
        value: num,
      });
      if (res.success) {
        toast({ title: 'Discount code created' });
        setCode('');
        await load();
      } else {
        toast({ variant: 'destructive', title: 'Could not create code', description: res.error });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await deactivateDiscountCodeAction(token, id);
    if (res.success) {
      toast({ title: 'Code deactivated' });
      await load();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
    }
  };

  if (authLoading || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manage Discount Codes</CardTitle>
          <CardDescription>Create promotion codes stored in Firestore (Stripe checkout wiring can follow).</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Discount Codes</CardTitle>
        <CardDescription>
          Codes are saved for operational tracking. Connect them to Stripe Coupons in production when ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="discount-code">New code</Label>
            <Input
              id="discount-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., SUMMER25"
              required
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'percentage' | 'fixed')}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage off</SelectItem>
                <SelectItem value="fixed">Fixed amount (£)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="discount-value">Value</Label>
            <Input
              id="discount-value"
              type="number"
              min={0.01}
              step={0.01}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'percentage' ? 'e.g., 25' : 'e.g., 10'}
              required
            />
          </div>
          <Button className="w-full" type="submit" disabled={submitting || !user}>
            {submitting ? 'Saving…' : 'Create discount code'}
          </Button>
        </form>

        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-medium">Active codes</p>
          {codes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No codes yet.</p>
          ) : (
            <ul className="space-y-2">
              {codes.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-mono font-medium">{c.code}</span>
                  <span className="text-muted-foreground">
                    {c.type === 'percentage' ? `${c.value}%` : `£${c.value}`}
                  </span>
                  {c.active ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                  {c.active && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDeactivate(c.id)}>
                      Deactivate
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
