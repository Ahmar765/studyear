
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader, Upload } from 'lucide-react';
import { contributeResourceAction } from '@/server/actions/resource-actions';

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().optional(),
  url: z.string().url('Please enter a valid URL.'),
  subjectId: z.string().min(1, 'Please select a subject.'),
  examBoard: z.string().min(1, 'Please select an exam board.'),
  level: z.string().min(1, 'Please select a level.'),
  type: z.enum(['PAST_PAPER', 'VIDEO']),
});

interface ContributionFormProps {
    subjects: { code: string, name: string }[];
    examBoards: string[];
    levels: string[];
}

export default function ContributionForm({ subjects, examBoards, levels }: ContributionFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<'PAST_PAPER' | 'VIDEO'>('PAST_PAPER');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: '',
            url: '',
            subjectId: '',
            examBoard: '',
            level: '',
            type: activeTab,
        },
    });

    const onTabChange = (value: string) => {
        const newType = value as 'PAST_PAPER' | 'VIDEO';
        setActiveTab(newType);
        form.setValue('type', newType);
    };

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        startTransition(async () => {
            const formData = new FormData();
            Object.entries(values).forEach(([key, value]) => {
                if (value) formData.append(key, value);
            });
            
            const result = await contributeResourceAction(formData);

            if (result.success) {
                toast({
                    title: 'Contribution Submitted!',
                    description: 'Thank you! Your resource is now pending review by our team.',
                });
                form.reset();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Submission Failed',
                    description: result.error || 'An unknown error occurred.',
                });
            }
        });
    };

    return (
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="PAST_PAPER">Past Paper</TabsTrigger>
                <TabsTrigger value="VIDEO">Video</TabsTrigger>
            </TabsList>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., AQA Maths Paper 1 2023" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Any extra details about this resource..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="url" render={({ field }) => (
                        <FormItem><FormLabel>URL</FormLabel><FormControl><Input placeholder="https://example.com/resource.pdf" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="level" render={({ field }) => (
                        <FormItem><FormLabel>Level</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent>{levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="subjectId" render={({ field }) => (
                            <FormItem><FormLabel>Subject</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent>{subjects.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="examBoard" render={({ field }) => (
                            <FormItem><FormLabel>Exam Board</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent>{examBoards.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                    </div>
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <Loader className="animate-spin mr-2" /> : <Upload className="mr-2" />}
                        Submit for Review
                    </Button>
                </form>
            </Form>
        </Tabs>
    );
}
