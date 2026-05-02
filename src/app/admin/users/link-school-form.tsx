'use client';

import { useTransition, useState, useEffect } from 'react';
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
import { linkStudentToSchoolAction, getSchoolAccountsAction, SchoolAccountData } from '@/server/actions/admin-actions';
import { Loader } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const FormSchema = z.object({
  schoolId: z.string().min(1, 'Please select a school.'),
});

type LinkSchoolFormProps = {
  student: UserProfile;
  onLinkSuccess: () => void;
};

export default function LinkSchoolForm({ student, onLinkSuccess }: LinkSchoolFormProps) {
  const [isPending, startTransition] = useTransition();
  const [schools, setSchools] = useState<SchoolAccountData[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSchools() {
      const { accounts, error } = await getSchoolAccountsAction();
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load schools.' });
      } else {
        setSchools(accounts);
      }
      setIsLoadingSchools(false);
    }
    fetchSchools();
  }, [toast]);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { schoolId: '' },
  });

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    startTransition(async () => {
        const result = await linkStudentToSchoolAction(student.uid, values.schoolId);
        if (result.success) {
            toast({
                title: 'Link Successful',
                description: `${student.displayName} has been linked to the selected school.`,
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
          <DialogTitle>Link {student.displayName} to a School</DialogTitle>
          <DialogDescription>
            Select a school account to associate with this student. This will grant the school visibility into the student's progress.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                 <FormField
                    control={form.control}
                    name="schoolId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>School Account</FormLabel>
                        {isLoadingSchools ? <Skeleton className="h-10 w-full" /> : (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select a school..." /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {schools.map(school => (
                                        <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" disabled={isPending}>Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isPending || isLoadingSchools}>
                        {isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                        {isPending ? 'Linking...' : 'Create Link'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
  );
}
