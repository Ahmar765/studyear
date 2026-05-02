
// src/app/account/change-password/page.tsx
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useImpersonation } from '@/hooks/use-impersonation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client-app';

const formSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function ChangePasswordPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { isImpersonating } = useImpersonation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (isImpersonating) {
        toast({ variant: 'destructive', title: 'Action Disabled', description: 'Cannot change password during an impersonation session.' });
        return;
    }
    
    startTransition(async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('You must be logged in to change your password.');
        }
        await updatePassword(user, values.newPassword);
        toast({
          title: 'Success',
          description: 'Your password has been changed successfully.',
        });
        router.push('/account');
      } catch (error: any) {
        let errorMessage = error.message;
        if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'This operation is sensitive and requires recent authentication. Please log in again before retrying this request.';
        }
        toast({
          variant: 'destructive',
          title: 'Error changing password',
          description: errorMessage,
        });
      }
    });
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Enter a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {isImpersonating && (
             <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Impersonation Mode Active</AlertTitle>
                <AlertDescription>
                    Changing passwords is disabled for security reasons.
                </AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={isImpersonating} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={isImpersonating} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending || isImpersonating} className="w-full">
                {isPending ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
