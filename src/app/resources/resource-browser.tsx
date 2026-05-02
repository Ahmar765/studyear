'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { getResourcesByTypeAction, saveUserResourceAction } from '@/server/actions/resource-actions';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Bookmark, Check, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { resourceMetadata } from '@/data/academic';

interface Resource {
    id: string;
    title: string;
    subject: string;
    topic: string;
    level: string;
    createdAt: string;
    videoUrl?: string;
    fileUrl?: string;
}

export default function ResourceBrowser() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type') as keyof typeof resourceMetadata | null;
    const [resources, setResources] = useState<Resource[]>([]);
    const [saved, setSaved] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (type) {
            startTransition(async () => {
                setError(null);
                const result = await getResourcesByTypeAction(type);
                if (result.success && result.resources) {
                    setResources(result.resources as Resource[]);
                } else {
                    setError(result.error || "Failed to load resources.");
                }
            });
        }
    }, [type]);

    const handleSave = async (resourceId: string) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to save resources.' });
            return;
        }
        const result = await saveUserResourceAction(resourceId, user.uid);
        if (result.success) {
            setSaved(prev => [...prev, resourceId]);
            toast({ title: 'Saved!', description: 'Resource has been saved to your collection.' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };
    
    const metadata = type ? resourceMetadata[type] : null;

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col items-start space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">
                    {metadata ? `Browsing ${metadata.title}` : 'Resource Browser'}
                </h2>
                <p className="text-muted-foreground max-w-2xl">
                    {metadata ? metadata.description : 'Select a resource type from the search page.'}
                </p>
            </div>

            {isPending ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}
                </div>
            ) : error ? (
                 <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <h3 className="mt-4 text-lg font-semibold">Could not load resources</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                </div>
            ) : resources.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resources.map((resource) => (
                        <Card key={resource.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{resource.title}</CardTitle>
                                <CardDescription>{resource.topic}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">{resource.level}</Badge>
                                    <Badge variant="secondary">{resource.subject}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground pt-2">
                                    Created: {new Date(resource.createdAt).toLocaleDateString()}
                                </p>
                            </CardContent>
                            <CardFooter className="flex-col sm:flex-row gap-2">
                                <Button
                                    className="w-full"
                                    onClick={() => handleSave(resource.id)}
                                    disabled={saved.includes(resource.id)}
                                >
                                    {saved.includes(resource.id) ? (
                                        <><Check className="mr-2 h-4 w-4" /> Saved</>
                                    ) : (
                                        <><Bookmark className="mr-2 h-4 w-4" /> Save</>
                                    )}
                                </Button>
                                {(resource.videoUrl || resource.fileUrl) && (
                                    <Button asChild className="w-full" variant="secondary">
                                        <a
                                            href={resource.videoUrl || resource.fileUrl!}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Open
                                        </a>
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24 text-center">
                    <h3 className="text-lg font-semibold">No resources found</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Be the first to create one for this category!
                    </p>
                </div>
            )}
        </div>
    );
}
