'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { getResourcesByTypeAction, saveUserResourceAction } from '@/server/actions/resource-actions';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Bookmark, Check, Download, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { resourceMetadata, ResourceType } from '@/data/academic';
import {
    formatResourceLevel,
    formatResourceSubject,
    isJunkFilterValue,
} from '@/lib/resource-labels';
import { downloadPastPaperPdf, getPastPaperPdfUrl } from '@/lib/past-paper-url';

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

const PAGE_SIZE = 12;

type ResourceBrowserProps = {
    canonicalSubjects?: string[];
    canonicalLevels?: string[];
};

export default function ResourceBrowser({
    canonicalSubjects = [],
    canonicalLevels = [],
}: ResourceBrowserProps) {
    const searchParams = useSearchParams();
    const typeParam = searchParams.get('type');
    const type =
        typeParam && typeParam in resourceMetadata ? (typeParam as ResourceType) : null;

    const [resources, setResources] = useState<Resource[]>([]);
    const [saved, setSaved] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [subjectFilter, setSubjectFilter] = useState<string>('__all__');
    const [levelFilter, setLevelFilter] = useState<string>('__all__');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        setSearch('');
        setSubjectFilter('__all__');
        setLevelFilter('__all__');
        setVisibleCount(PAGE_SIZE);
        setResources([]);
    }, [type]);

    useEffect(() => {
        if (!type) return;
        startTransition(async () => {
            setError(null);
            const result = await getResourcesByTypeAction(type);
            if (result.success && result.resources) {
                setResources(result.resources as Resource[]);
            } else {
                setError(result.error || 'Failed to load resources.');
            }
        });
    }, [type]);

    const subjectOptions = useMemo(() => {
        const fromLibrary = new Set(
            resources
                .map((r) => formatResourceSubject(r.subject))
                .filter((s) => s && !isJunkFilterValue(s)),
        );
        const merged = new Set([...canonicalSubjects, ...fromLibrary]);
        return [...merged].sort((a, b) => a.localeCompare(b));
    }, [resources, canonicalSubjects]);

    const levelOptions = useMemo(() => {
        const fromLibrary = new Set(
            resources
                .map((r) => formatResourceLevel(r.level))
                .filter((l) => l && !isJunkFilterValue(l)),
        );
        const merged = new Set([...canonicalLevels, ...fromLibrary]);
        return [...merged].sort((a, b) => a.localeCompare(b));
    }, [resources, canonicalLevels]);

    const filteredResources = useMemo(() => {
        const q = search.trim().toLowerCase();
        return resources.filter((r) => {
            if (
                subjectFilter !== '__all__' &&
                formatResourceSubject(r.subject) !== subjectFilter
            ) {
                return false;
            }
            if (
                levelFilter !== '__all__' &&
                formatResourceLevel(r.level) !== levelFilter
            ) {
                return false;
            }
            if (!q) return true;
            const hay = `${r.title} ${r.topic} ${r.subject} ${r.level}`.toLowerCase();
            return hay.includes(q);
        });
    }, [resources, search, subjectFilter, levelFilter]);

    const visibleResources = filteredResources.slice(0, visibleCount);

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
    
    const handleDownloadPastPaper = async (fileUrl: string, title: string) => {
        try {
            await downloadPastPaperPdf(fileUrl, title);
        } catch {
            toast({
                variant: 'destructive',
                title: 'Download failed',
                description: 'Could not download this PDF.',
            });
        }
    };

    const metadata = type ? resourceMetadata[type] : null;

    if (!type) {
        return (
            <div className="flex-1 space-y-8 p-4 md:p-8">
                <h2 className="text-3xl font-bold tracking-tight">Find Study Resources</h2>
                <p className="text-muted-foreground max-w-xl">
                    Pick a category from the hub to browse resources. Unknown or missing{' '}
                    <code className="text-xs">type</code> in the URL cannot be loaded.
                </p>
                <Button asChild>
                    <Link href="/search">Back to categories</Link>
                </Button>
            </div>
        );
    }

    function formatCreated(iso: string) {
        if (!iso) return 'Unknown date';
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? 'Unknown date' : d.toLocaleDateString('en-GB');
    }

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col items-start space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">
                    {metadata ? `Browsing ${metadata.title}` : 'Resource Browser'}
                </h2>
                <p className="text-muted-foreground max-w-2xl">
                    {metadata ? metadata.description : ''}
                </p>
            </div>

            {isPending ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-56 w-full" />
                    ))}
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <h3 className="mt-4 text-lg font-semibold">Could not load resources</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                </div>
            ) : resources.length > 0 ? (
                <>
                    <Card className="border-muted">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Filter & search</CardTitle>
                            <CardDescription>
                                Narrow results by subject, level, or keywords ({filteredResources.length}{' '}
                                of {resources.length} loaded).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3">
                            <Input
                                placeholder="Search title, topic, subject…"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setVisibleCount(PAGE_SIZE);
                                }}
                                aria-label="Search resources"
                            />
                            <Select
                                value={subjectFilter}
                                onValueChange={(v) => {
                                    setSubjectFilter(v);
                                    setVisibleCount(PAGE_SIZE);
                                }}
                            >
                                <SelectTrigger aria-label="Filter by subject">
                                    <SelectValue placeholder="Subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">All subjects</SelectItem>
                                    {subjectOptions.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={levelFilter}
                                onValueChange={(v) => {
                                    setLevelFilter(v);
                                    setVisibleCount(PAGE_SIZE);
                                }}
                            >
                                <SelectTrigger aria-label="Filter by level">
                                    <SelectValue placeholder="Level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">All levels</SelectItem>
                                    {levelOptions.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    {filteredResources.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                            <h3 className="text-lg font-semibold">No matches</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Try clearing filters or a broader search.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {visibleResources.map((resource) => (
                                    <Card key={resource.id} className="flex flex-col">
                                        <CardHeader>
                                            <CardTitle className="line-clamp-2">{resource.title}</CardTitle>
                                            <CardDescription className="line-clamp-2">
                                                {resource.topic || '—'}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow space-y-2">
                                            <div className="flex flex-wrap gap-2">
                                                {formatResourceLevel(resource.level) !==
                                                    'All levels' && (
                                                    <Badge variant="outline">
                                                        {formatResourceLevel(resource.level)}
                                                    </Badge>
                                                )}
                                                {formatResourceSubject(resource.subject) !==
                                                    'General' && (
                                                    <Badge variant="secondary">
                                                        {formatResourceSubject(resource.subject)}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground pt-2">
                                                Created: {formatCreated(resource.createdAt)}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="flex-col sm:flex-row gap-2">
                                            <Button
                                                className="w-full"
                                                onClick={() => handleSave(resource.id)}
                                                disabled={saved.includes(resource.id)}
                                            >
                                                {saved.includes(resource.id) ? (
                                                    <>
                                                        <Check className="mr-2 h-4 w-4" /> Saved
                                                    </>
                                                ) : (
                                                    <>
                                                        <Bookmark className="mr-2 h-4 w-4" /> Save
                                                    </>
                                                )}
                                            </Button>
                                            {(resource.videoUrl || resource.fileUrl) && (
                                                <>
                                                    {resource.videoUrl ? (
                                                        <Button asChild className="w-full" variant="secondary">
                                                            <a
                                                                href={resource.videoUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                                Open
                                                            </a>
                                                        </Button>
                                                    ) : resource.fileUrl ? (
                                                        <>
                                                            <Button asChild className="w-full" variant="secondary">
                                                                <a
                                                                    href={getPastPaperPdfUrl(resource.fileUrl)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                                    Open PDF
                                                                </a>
                                                            </Button>
                                                            {type === 'PAST_PAPER' && (
                                                                <Button
                                                                    className="w-full"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        handleDownloadPastPaper(
                                                                            resource.fileUrl!,
                                                                            resource.title,
                                                                        )
                                                                    }
                                                                >
                                                                    <Download className="mr-2 h-4 w-4" />
                                                                    Download
                                                                </Button>
                                                            )}
                                                        </>
                                                    ) : null}
                                                </>
                                            )}
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                            {visibleCount < filteredResources.length ? (
                                <div className="flex justify-center">
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            setVisibleCount((c) => c + PAGE_SIZE)
                                        }
                                    >
                                        Show more ({filteredResources.length - visibleCount}{' '}
                                        remaining)
                                    </Button>
                                </div>
                            ) : null}
                        </>
                    )}
                </>
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
