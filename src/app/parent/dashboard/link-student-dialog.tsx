'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Loader, Users } from 'lucide-react';
import { requestStudentLinkAction } from '@/server/actions/parent-actions';
import { notifyParentStudentLinked } from '@/lib/parent-dashboard-events';
import { useAuth } from '@/hooks/use-auth';

const CodeSchema = z.object({
  code: z
    .string()
    .min(8, 'Enter the 8-digit Parent Link Code')
    .max(8)
    .regex(/^\d{8}$/, 'Code must be exactly 8 digits'),
});

export default function LinkStudentDialog() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof CodeSchema>>({
    resolver: zodResolver(CodeSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = (values: z.infer<typeof CodeSchema>) => {
    startTransition(async () => {
      if (!user) {
        toast({ variant: 'destructive', title: 'Not signed in', description: 'Please log in and try again.' });
        return;
      }
      const token = await user.getIdToken();
      const result = await requestStudentLinkAction(token, values.code.replace(/\D/g, ''));
      if (result.success) {
        toast({
          title: 'Connected',
          description: 'Your child is now visible in the Academic Command Centre.',
        });
        form.reset();
        notifyParentStudentLinked();
      } else {
        toast({ variant: 'destructive', title: 'Could not link', description: result.error });
      }
    });
  };

  return (
    <DialogContent className="max-w-md sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Link a learner
        </DialogTitle>
        <DialogDescription>
          Enter your child&apos;s 8-digit Parent Link Code from their StudYear account. Instant, secure pairing — add as
          many children as you need.
        </DialogDescription>
      </DialogHeader>

      <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        Your child finds their code on their StudYear dashboard. They can also show you their QR code.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent Link Code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="12345678"
                    className="font-mono text-center text-lg tracking-[0.3em]"
                    maxLength={8}
                    inputMode="numeric"
                    autoComplete="off"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Pairing…
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
