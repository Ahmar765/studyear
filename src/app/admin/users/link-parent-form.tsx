
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/firebase/services/user';
import { linkParentToStudentAction } from '@/server/actions/admin-actions';
import { Loader } from 'lucide-react';

const FormSchema = z.object({
  parentId: z.string().min(1, 'Parent User ID is required.'),
});

type LinkParentFormProps = {
  student: UserProfile;
  onLinkSuccess: () => void;
};

export default function LinkParentForm({ student, onLinkSuccess }: LinkParentFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { parentId: '' },
  });

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    startTransition(async () => {
        const result = await linkParentToStudentAction(student.uid, values.parentId);
        if (result.success) {
            toast({
                title: 'Link Successful',
                description: `Student ${student.displayName} has been linked to the parent.`,
            });
            onLinkSuccess();
        } else {
            toast({
                variant: 'destructive',
                title: 'Linking Failed',
                description: result.error,
            });
        }
    });
  };

  return (
    <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Parent to {student.displayName}</DialogTitle>
          <DialogDescription>
            Enter the User ID (UID) of the parent you wish to link to this student account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                 <FormField
                    control={form.control}
                    name="parentId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Parent User ID</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter parent's UID" {...field} />
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
                        {isPending ? 'Linking...' : 'Create Link'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
  );
}
