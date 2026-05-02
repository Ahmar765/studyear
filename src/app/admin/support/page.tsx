
'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Eye, Loader } from 'lucide-react';
import { startImpersonationAction } from '@/server/actions/admin-actions';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  targetUid: z.string().min(1, 'Target User ID is required.'),
  reason: z.string().min(10, 'Please provide a brief reason for this session (min. 10 characters).'),
});

export default function SupportPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { targetUid: '', reason: '' },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    startTransition(async () => {
        const { success, customToken, impersonationLogId, error } = await startImpersonationAction(values.targetUid, values.reason);

        if (success && customToken && impersonationLogId) {
            toast({
                title: 'Impersonation Session Starting',
                description: 'A new tab will open for the user session.',
            });
            const impersonateUrl = `/auth/impersonate?token=${customToken}&logId=${impersonationLogId}&targetUid=${values.targetUid}`;
            window.open(impersonateUrl, '_blank');
        } else {
            toast({
                variant: 'destructive',
                title: 'Failed to start session',
                description: error,
            });
        }
    });
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Support Tools</h2>
        <p className="text-muted-foreground max-w-2xl">
          Access admin-only support features. All actions are logged.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>View as User</CardTitle>
          <CardDescription>
            Initiate a secure, time-limited impersonation session to assist a user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="targetUid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target User ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter the User ID (UID) of the target user" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Session</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., 'Investigating user report of missing study plan...'" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                {isPending ? 'Initiating...' : 'Start View as User Session'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
