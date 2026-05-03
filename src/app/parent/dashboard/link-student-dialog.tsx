'use client';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader } from 'lucide-react';
import { requestStudentLinkAction } from '@/server/actions/parent-actions';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const FormSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export default function LinkStudentDialog() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    startTransition(async () => {
      if (!user) {
        toast({ variant: 'destructive', title: 'Not signed in', description: 'Please log in and try again.' });
        return;
      }
      const token = await user.getIdToken();
      const result = await requestStudentLinkAction(token, values.email);
      if (result.success) {
        toast({ title: "Link Request Sent!", description: "The student will now appear on your dashboard after they approve." });
        form.reset();
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Link a Student Account</DialogTitle>
        <DialogDescription>
          Enter the email address of the student you wish to link to your parent account. A request will be sent to them for approval.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student's Email</FormLabel>
                <FormControl>
                  <Input placeholder="student@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary" disabled={isPending}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : 'Send Link Request'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
