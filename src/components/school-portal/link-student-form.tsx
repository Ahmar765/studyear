'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { linkStudentToSchoolByEmailAction } from '@/server/actions/school-actions';
import { Loader, UserPlus } from 'lucide-react';

export function LinkStudentForm({ onLinked }: { onLinked?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    startTransition(async () => {
      const token = await user.getIdToken();
      const result = await linkStudentToSchoolByEmailAction(token, email);
      if (result.success) {
        toast({
          title: 'Student linked',
          description: `${result.studentName ?? 'Student'} is now on your school roster.`,
        });
        setEmail('');
        onLinked?.();
      } else {
        toast({
          variant: 'destructive',
          title: 'Could not link student',
          description: result.error,
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="student-email">Student email</Label>
        <Input
          id="student-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="student@schoolmail.com"
          required
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          The student must already have a StudYear account with this email.
        </p>
      </div>
      <Button type="submit" disabled={isPending || !email.trim()}>
        {isPending ? (
          <Loader className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        {isPending ? 'Linking…' : 'Add student to school'}
      </Button>
    </form>
  );
}
