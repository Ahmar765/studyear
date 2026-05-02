'use client';

import { useTransition } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/firebase/services/user';
import { updateUserAction } from '@/server/actions/admin-actions';
import { Loader } from 'lucide-react';
import { SubscriptionType } from '@/server/schemas';

const subscriptionTypes: SubscriptionType[] = [
    "FREE", "STUDENT_PREMIUM", "STUDENT_PREMIUM_PLUS", "PARENT_PRO", "PARENT_PRO_PLUS", "PRIVATE_TUTOR", "SCHOOL_SMALL", "SCHOOL_MEDIUM", "SCHOOL_LARGE"
];
const roleTypes = ['STUDENT', 'PARENT', 'PRIVATE_TUTOR', 'SCHOOL_TUTOR', 'SCHOOL_ADMIN', 'ADMIN'];

const FormSchema = z.object({
  role: z.enum(roleTypes as [string, ...string[]]),
  subscription: z.enum(subscriptionTypes as [string, ...string[]]),
});

type EditUserFormProps = {
  user: UserProfile;
  onUpdateSuccess: () => void;
};

export default function EditUserForm({ user, onUpdateSuccess }: EditUserFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      role: user.role,
      subscription: user.subscription || 'FREE',
    },
  });

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    startTransition(async () => {
        const result = await updateUserAction(user.uid, values);
        if (result.success) {
            toast({
                title: 'User Updated',
                description: `${user.name}'s profile has been successfully updated.`,
            });
            onUpdateSuccess();
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
          <DialogTitle>Edit {user.name}</DialogTitle>
          <DialogDescription>
            Change the role and subscription plan for {user.email}.
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {roleTypes.map(role => (
                                    <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
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
                        <FormLabel>Subscription Plan</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {subscriptionTypes.map(sub => (
                                    <SelectItem key={sub} value={sub}>{sub.replace(/_/g, ' ')}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                        {isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
  );
}
