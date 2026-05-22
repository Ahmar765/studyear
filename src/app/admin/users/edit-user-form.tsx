'use client';

import { useEffect, useTransition } from 'react';
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
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/firebase/services/user';
import { updateUserAction } from '@/server/actions/admin-actions';
import { useAuth } from '@/hooks/use-auth';
import { Loader } from 'lucide-react';
import { SubscriptionType } from '@/server/schemas';
import {
  ADMIN_SUBSCRIPTION_TYPES,
  adminSubscriptionLabel,
  subscriptionOptionsForRole,
} from '@/data/admin-user-plans';

const roleTypes = ['STUDENT', 'PARENT', 'PRIVATE_TUTOR', 'SCHOOL_TUTOR', 'SCHOOL_ADMIN', 'ADMIN'] as const;

const FormSchema = z.object({
  role: z.enum(roleTypes),
  subscription: z.enum(ADMIN_SUBSCRIPTION_TYPES as [SubscriptionType, ...SubscriptionType[]]),
});

type EditUserFormProps = {
  user: UserProfile;
  onUpdateSuccess: () => void;
};

export default function EditUserForm({ user, onUpdateSuccess }: EditUserFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user: adminUser } = useAuth();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      role: (user.role as (typeof roleTypes)[number]) || 'STUDENT',
      subscription: (ADMIN_SUBSCRIPTION_TYPES.includes(user.subscription as SubscriptionType)
        ? user.subscription
        : 'FREE') as SubscriptionType,
    },
  });

  const watchedRole = form.watch('role');
  const planOptions = subscriptionOptionsForRole(watchedRole);

  useEffect(() => {
    const current = form.getValues('subscription');
    if (!planOptions.includes(current as SubscriptionType)) {
      form.setValue('subscription', planOptions[0] ?? 'FREE');
    }
  }, [watchedRole, planOptions, form]);

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    startTransition(async () => {
      const token = adminUser ? await adminUser.getIdToken() : null;
      const result = await updateUserAction(user.uid, values, token);
      if (result.success) {
        toast({
          title: 'User updated',
          description:
            values.role === 'PARENT' && values.subscription === 'PARENT_ELITE'
              ? `${user.name} is now on Parent Elite. Use View as User to test the Command Centre.`
              : `${user.name}'s profile has been updated.`,
        });
        onUpdateSuccess();
      } else {
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: result.error,
        });
      }
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit {user.name}</DialogTitle>
        <DialogDescription>
          Change role and subscription. For parent testing, set role Parent and plan Parent Elite.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roleTypes.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subscription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subscription plan</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {planOptions.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {adminSubscriptionLabel(sub)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
