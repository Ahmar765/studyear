
'use client';

import { useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { updateSystemSettingsAction } from '@/server/actions/settings-actions';
import type { SystemSettings } from '@/server/schemas/system-settings';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

const SettingsFormSchema = z.object({
    // Feature Flags
    ff_tutor_marketplace: z.boolean(),
    ff_parent_dashboard: z.boolean(),
    ff_school_portal: z.boolean(),
    ff_ai_feedback: z.boolean(),
    
    // Pricing Rules
    pricing_multiplier: z.coerce.number(),
    tutor_commission: z.coerce.number(),
    
    // AI Provider Settings
    ai_defaultProvider: z.enum(['openai', 'gemini', 'vertex']),
    ai_fallbackProvider: z.enum(['openai', 'gemini', 'vertex']),
    ai_openai_costEffective: z.string(),
    ai_openai_performance: z.string(),
    ai_gemini_costEffective: z.string(),
    ai_gemini_performance: z.string(),
    ai_vertex_costEffective: z.string(),
    ai_vertex_performance: z.string(),
});


export default function SettingsForms({ initialSettings }: { initialSettings: SystemSettings }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof SettingsFormSchema>>({
        resolver: zodResolver(SettingsFormSchema),
        defaultValues: {
            ff_tutor_marketplace: initialSettings.featureFlags?.tutor_marketplace ?? true,
            ff_parent_dashboard: initialSettings.featureFlags?.parent_dashboard ?? true,
            ff_school_portal: initialSettings.featureFlags?.school_portal ?? true,
            ff_ai_feedback: initialSettings.featureFlags?.ai_feedback ?? true,
            pricing_multiplier: initialSettings.pricingRules?.multiplier ?? 3,
            tutor_commission: initialSettings.pricingRules?.tutor_commission ?? 20,
            ai_defaultProvider: initialSettings.aiProvider?.defaultProvider ?? 'gemini',
            ai_fallbackProvider: initialSettings.aiProvider?.fallbackOrder?.[0] ?? 'vertex',
            ai_openai_costEffective: initialSettings.aiProvider?.modelMap?.openai?.costEffective ?? 'gpt-4-turbo',
            ai_openai_performance: initialSettings.aiProvider?.modelMap?.openai?.performance ?? 'gpt-4o',
            ai_gemini_costEffective: initialSettings.aiProvider?.modelMap?.gemini?.costEffective ?? 'gemini-2.5-flash',
            ai_gemini_performance: initialSettings.aiProvider?.modelMap?.gemini?.performance ?? 'gemini-2.5-pro',
            ai_vertex_costEffective: initialSettings.aiProvider?.modelMap?.vertex?.costEffective ?? 'gemini-2.5-flash',
            ai_vertex_performance: initialSettings.aiProvider?.modelMap?.vertex?.performance ?? 'gemini-2.5-pro',
        },
    });

    const onSubmit = (values: z.infer<typeof SettingsFormSchema>) => {
        startTransition(async () => {
            const newSettings: SystemSettings = {
                featureFlags: {
                    tutor_marketplace: values.ff_tutor_marketplace,
                    parent_dashboard: values.ff_parent_dashboard,
                    school_portal: values.ff_school_portal,
                    ai_feedback: values.ff_ai_feedback,
                },
                pricingRules: {
                    multiplier: values.pricing_multiplier,
                    tutor_commission: values.tutor_commission,
                },
                aiProvider: {
                    defaultProvider: values.ai_defaultProvider,
                    fallbackOrder: [values.ai_fallbackProvider],
                    modelMap: {
                        openai: {
                            costEffective: values.ai_openai_costEffective,
                            performance: values.ai_openai_performance,
                        },
                        gemini: {
                            costEffective: values.ai_gemini_costEffective,
                            performance: values.ai_gemini_performance,
                        },
                        vertex: {
                            costEffective: values.ai_vertex_costEffective,
                            performance: values.ai_vertex_performance,
                        },
                    }
                }
            };
            
            const result = await updateSystemSettingsAction(newSettings);
            if (result.success) {
                toast({ title: 'Success', description: 'System settings have been updated.' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    }

  return (
    <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Feature Flags</CardTitle>
                    <CardDescription>Globally enable or disable key platform features.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="ff_tutor_marketplace" render={({ field }) => (
                        <FormItem className="flex items-center justify-between"><FormLabel>Tutor Marketplace</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                    )} />
                     <FormField control={form.control} name="ff_parent_dashboard" render={({ field }) => (
                        <FormItem className="flex items-center justify-between"><FormLabel>Parent Dashboard</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                    )} />
                     <FormField control={form.control} name="ff_school_portal" render={({ field }) => (
                        <FormItem className="flex items-center justify-between"><FormLabel>School Portal</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ff_ai_feedback" render={({ field }) => (
                        <FormItem className="flex items-center justify-between"><FormLabel>AI Feedback Engine (Premium)</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                    )} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Pricing & Billing Rules</CardTitle>
                    <CardDescription>Adjust core financial parameters for the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="pricing_multiplier" render={({ field }) => (
                        <FormItem><FormLabel>ACU Pricing Multiplier</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormDescription className="text-xs">User charge = internal AI cost × this multiplier.</FormDescription><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="tutor_commission" render={({ field }) => (
                        <FormItem><FormLabel>Tutor Marketplace Commission (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription className="text-xs">The platform's cut on tutor bookings.</FormDescription><FormMessage /></FormItem>
                    )} />
                </CardContent>
            </Card>

            <Card className="lg:col-span-3 xl:col-span-1">
                <CardHeader>
                    <CardTitle>AI Provider Settings</CardTitle>
                    <CardDescription>Control the AI models and providers in use.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="ai_defaultProvider" render={({ field }) => (
                            <FormItem><FormLabel>Default Provider</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="openai">OpenAI</SelectItem><SelectItem value="gemini">Google Gemini (Genkit)</SelectItem><SelectItem value="vertex">Google Vertex AI</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="ai_fallbackProvider" render={({ field }) => (
                            <FormItem><FormLabel>Fallback Provider</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="openai">OpenAI</SelectItem><SelectItem value="gemini">Google Gemini (Genkit)</SelectItem><SelectItem value="vertex">Google Vertex AI</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                    </div>
                    <Separator />
                    <h4 className="font-semibold text-sm">OpenAI Models</h4>
                     <div className="grid grid-cols-2 gap-4">
                         <FormField control={form.control} name="ai_openai_costEffective" render={({ field }) => ( <FormItem><FormLabel>Cost-Effective</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="ai_openai_performance" render={({ field }) => ( <FormItem><FormLabel>Performance</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <Separator />
                    <h4 className="font-semibold text-sm">Google Gemini Models</h4>
                     <div className="grid grid-cols-2 gap-4">
                         <FormField control={form.control} name="ai_gemini_costEffective" render={({ field }) => ( <FormItem><FormLabel>Cost-Effective</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="ai_gemini_performance" render={({ field }) => ( <FormItem><FormLabel>Performance</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                     <Separator />
                    <h4 className="font-semibold text-sm">Google Vertex AI Models</h4>
                     <div className="grid grid-cols-2 gap-4">
                         <FormField control={form.control} name="ai_vertex_costEffective" render={({ field }) => ( <FormItem><FormLabel>Cost-Effective</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="ai_vertex_performance" render={({ field }) => ( <FormItem><FormLabel>Performance</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                </CardContent>
            </Card>
        </div>
         <Button className="w-full md:w-auto" type="submit" disabled={isPending}>
            {isPending ? 'Saving All Settings...' : 'Save All Settings'}
        </Button>
    </form>
    </Form>
  )
}
