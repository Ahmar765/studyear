
'use client';

import { useState, useTransition, useEffect } from "react";
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Bot, Loader, Image as ImageIcon, BarChartHorizontal, Trash2, DraftingCompass } from "lucide-react";
import { createVisualResourceAction } from "@/server/actions/visual-actions";
import { VisualRequestSchema } from "@/server/schemas/visual-request";
import { z } from "zod";
import Image from "next/image";
import { resourceMetadata } from "@/data/academic";

type VisualResult = {
  imageUrl?: string;
  svg?: string;
} | null;

const visualToolTypes = [
    "EDUCATIONAL_IMAGE", "VISUAL_DRAWING", "BAR_GRAPH", "LINE_GRAPH", 
    "PIE_CHART", "COORDINATE_GRAPH", "GEOMETRY_DIAGRAM", "FUNCTION_GRAPH"
];

const FormSchema = z.object({
  type: z.enum([
    "VISUAL_DRAWING", "EDUCATIONAL_IMAGE", "BAR_GRAPH", "LINE_GRAPH", 
    "PIE_CHART", "SCATTER_PLOT", "HISTOGRAM", "PICTOGRAPH", 
    "COORDINATE_GRAPH", "GEOMETRY_DIAGRAM", "FUNCTION_GRAPH", "GRAPH_THEORY_DIAGRAM"
  ]),
  title: z.string().min(3, "Title must be at least 3 characters."),
  prompt: z.string().optional(),
  barData: z.array(z.object({ label: z.string(), value: z.number() })).optional(),
  lineData: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  coordinatePoints: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  geometryShape: z.enum(['triangle', 'circle']).optional(),
  functionExpression: z.string().optional(),
});
type FormValues = z.infer<typeof FormSchema>;

export default function VisualGenerator() {
  const [result, setResult] = useState<VisualResult>(null);
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      type: "EDUCATIONAL_IMAGE",
      title: "",
      prompt: "",
      barData: [],
      lineData: [],
      coordinatePoints: [],
      geometryShape: 'triangle',
      functionExpression: 'x*x',
    },
  });
  
  const { fields: barFields, append: appendBar, remove: removeBar } = useFieldArray({ control: form.control, name: "barData" });
  const { fields: lineFields, append: appendLine, remove: removeLine } = useFieldArray({ control: form.control, name: "lineData" });
  const { fields: pointFields, append: appendPoint, remove: removePoint } = useFieldArray({ control: form.control, name: "coordinatePoints" });

  const watchType = form.watch("type");

  const handleSubmit = (values: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in.' });
      return;
    }

    setResult(null);
    let submissionData: any = {
      userId: user.uid,
      studentId: user.uid,
      type: values.type,
      title: values.title,
    };

    if (["EDUCATIONAL_IMAGE", "VISUAL_DRAWING"].includes(values.type)) {
      submissionData.prompt = values.prompt;
    } else if (values.type === 'BAR_GRAPH' || values.type === 'PIE_CHART') {
      submissionData.data = values.barData;
    } else if (values.type === 'LINE_GRAPH') {
      submissionData.data = values.lineData;
    } else if (values.type === 'COORDINATE_GRAPH') {
      submissionData.data = { points: values.coordinatePoints };
    } else if (values.type === 'GEOMETRY_DIAGRAM') {
      submissionData.data = { shape: values.geometryShape };
    } else if (values.type === 'FUNCTION_GRAPH') {
      submissionData.data = { expression: values.functionExpression };
    }

    startTransition(async () => {
      const res = await createVisualResourceAction(submissionData);

      if (res.success && res.visual) {
        setResult(res.visual);
        toast({ title: 'Visual Created!', description: 'Your new visual has been saved to your library.' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error || 'Failed to generate visual.' });
      }
    });
  };
  
  const isImagePrompt = ["EDUCATIONAL_IMAGE", "VISUAL_DRAWING"].includes(watchType);
  const isBarOrPie = ["BAR_GRAPH", "PIE_CHART"].includes(watchType);
  const isLine = watchType === "LINE_GRAPH";
  const isCoordinate = watchType === "COORDINATE_GRAPH";
  const isGeometry = watchType === "GEOMETRY_DIAGRAM";
  const isFunction = watchType === "FUNCTION_GRAPH";

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a Visual</CardTitle>
          <CardDescription>Select a tool and provide the necessary details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label>Tool Type</Label>
                <Select value={watchType} onValueChange={(v) => form.setValue('type', v as any)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        {visualToolTypes.map(opt => (
                            <SelectItem key={opt} value={opt}>
                                <span className="flex items-center gap-2">
                                    {React.createElement(resourceMetadata[opt as keyof typeof resourceMetadata]?.icon || DraftingCompass, { className: 'h-4 w-4' })}
                                    {resourceMetadata[opt as keyof typeof resourceMetadata]?.title}
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label>Title</Label>
                <Input {...form.register("title")} placeholder="A title for your visual..." disabled={isPending} />
                {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
            </div>

            {isImagePrompt && (
                <div className="space-y-2">
                    <Label>Prompt</Label>
                    <Textarea {...form.register("prompt")} placeholder="Describe the image or drawing you want to create..." className="min-h-[150px]" disabled={isPending} />
                    {form.formState.errors.prompt && <p className="text-sm text-destructive">{form.formState.errors.prompt.message}</p>}
                </div>
            )}
            
            {isBarOrPie && (
                 <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Chart Data</h4>
                     {barFields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-2">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">Label</Label>
                                <Input {...form.register(`barData.${index}.label`)} placeholder="e.g., Year 1" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">Value</Label>
                                <Input {...form.register(`barData.${index}.value`, { valueAsNumber: true })} type="number" placeholder="e.g., 85" />
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeBar(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendBar({ label: '', value: 0 })}>Add Data Point</Button>
                 </div>
            )}

             {isLine && (
                 <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Line Graph Data</h4>
                     {lineFields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-2">
                            <div className="flex-1 space-y-1"><Label className="text-xs">X-Value</Label><Input {...form.register(`lineData.${index}.x`, { valueAsNumber: true })} type="number" /></div>
                            <div className="flex-1 space-y-1"><Label className="text-xs">Y-Value</Label><Input {...form.register(`lineData.${index}.y`, { valueAsNumber: true })} type="number" /></div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendLine({ x: 0, y: 0 })}>Add Point</Button>
                 </div>
            )}

            {isCoordinate && (
                 <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Coordinate Points</h4>
                     {pointFields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-2">
                            <div className="flex-1 space-y-1"><Label className="text-xs">X</Label><Input {...form.register(`coordinatePoints.${index}.x`, { valueAsNumber: true })} type="number" /></div>
                            <div className="flex-1 space-y-1"><Label className="text-xs">Y</Label><Input {...form.register(`coordinatePoints.${index}.y`, { valueAsNumber: true })} type="number" /></div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removePoint(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendPoint({ x: 0, y: 0 })}>Add Point</Button>
                 </div>
            )}

            {isGeometry && (
                <div className="space-y-2">
                    <Label>Shape</Label>
                    <Select onValueChange={(v) => form.setValue('geometryShape', v as 'triangle' | 'circle')} defaultValue="triangle">
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="triangle">Triangle</SelectItem>
                            <SelectItem value="circle">Circle</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

             {isFunction && (
                <div className="space-y-2">
                    <Label>Function Expression (e.g., x*x or 2*x + 3)</Label>
                    <Input {...form.register("functionExpression")} placeholder="Enter a function of x" />
                </div>
            )}
            
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <><Loader className="mr-2 h-4 w-4 animate-spin"/> Generating...</> : <><Sparkles className="mr-2 h-4 w-4"/> Generate Visual</>}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Generated Visual</CardTitle>
          <CardDescription>
            Appears below when ready. Each visual is saved to your library automatically—you’ll find it under Saved Resources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <Skeleton className="aspect-video w-full" />
          ) : result ? (
            <div className="aspect-video relative rounded-md border bg-white flex items-center justify-center p-2">
              {result.imageUrl && <Image src={result.imageUrl} alt="Generated AI Image" fill className="object-contain" />}
              {result.svg && <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: result.svg }} />}
            </div>
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center rounded-lg border border-dashed text-center">
              <Bot className="h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Your visual is waiting to be created.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
