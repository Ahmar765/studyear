
'use client';

import { useTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/firebase/services/user';
import { adjustAcuBalanceAction } from '@/server/actions/admin-actions';
import { Loader } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const FormSchema = z.object({
  amount: z.coerce.number().int().min(1, 'Amount must be a positive integer.'),
  description: z.string().min(1, 'A description is required.'),
});

type AcuAdjustmentDialogProps = {
  user: UserProfile;
  onSuccess: () => void;
};

export default function AcuAdjustmentDialog({ user, onSuccess }: AcuAdjustmentDialogProps) {
  const { user: adminUser } = useAuth();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { amount: 1000, description: 'Admin grant' },
  });

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    if (!adminUser) return;
    startTransition(async () => {
        const result = await adjustAcuBalanceAction({
            ...values,
            userId: user.uid,
            adminId: adminUser.uid,
        });
        if (result.success) {
            toast({
                title: 'ACU Balance Updated',
                description: `${values.amount.toLocaleString()} ACUs have been credited to ${user.name}.`,
            });
            onSuccess();
        } else {
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: result.error,
            });
        }
    });
  };

  return (
    <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust ACU Balance for {user.name}</DialogTitle>
          <DialogDescription>
            Manually credit or debit ACUs from a user's wallet. Use negative numbers to debit.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                 <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Reason / Description</FormLabel>
                        <FormControl>
                            <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" disabled={isPending}>Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                        {isPending ? 'Processing...' : 'Apply Adjustment'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
  );
}
