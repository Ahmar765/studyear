'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { slugifyTitle } from '@/lib/blog-slug';
import {
  publishBlogPostAction,
  saveBlogPostAction,
  type BlogPostAdminRow,
} from '@/server/actions/blog-post-actions';
import { SimpleMarkdown } from '@/components/blog/simple-markdown';
import { Loader, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Props = {
  initialPost?: BlogPostAdminRow | null;
};

export default function BlogPostForm({ initialPost }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [postId, setPostId] = useState(initialPost?.id ?? '');
  const [title, setTitle] = useState(initialPost?.title ?? '');
  const [slugManual, setSlugManual] = useState('');
  const [metaDescription, setMetaDescription] = useState(initialPost?.metaDescription ?? '');
  const [content, setContent] = useState(initialPost?.content ?? '');

  const slugPreview =
    slugManual.trim() ||
    initialPost?.slug ||
    (title.trim() ? slugifyTitle(title) : '') ||
    '…';

  const persist = async (andPublish: boolean) => {
    if (!user?.uid) {
      toast({ variant: 'destructive', title: 'Not signed in', description: 'Save requires an authenticated admin.' });
      return;
    }
    const result = await saveBlogPostAction({
      id: postId || undefined,
      title: title.trim(),
      slug: slugManual.trim() || undefined,
      metaDescription: metaDescription.trim(),
      content,
      authorId: user.uid,
    });
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Save failed', description: result.error });
      return null;
    }
    const id = result.id ?? postId;
    if (id && !postId) {
      setPostId(id);
      router.replace(`/admin/blog/${id}/edit`);
    }
    if (andPublish && id) {
      const pub = await publishBlogPostAction(id);
      if (!pub.success) {
        toast({ variant: 'destructive', title: 'Publish failed', description: pub.error });
        return id;
      }
      toast({ title: 'Published', description: 'Your post is live on the public blog.' });
    } else {
      toast({ title: 'Saved', description: postId ? 'Draft updated.' : 'Draft created.' });
    }
    router.refresh();
    return id;
  };

  const handleSave = () => {
    startTransition(async () => {
      await persist(false);
    });
  };

  const handlePublish = () => {
    startTransition(async () => {
      await persist(true);
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="blog-title">Title</Label>
        <Input
          id="blog-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending}
          placeholder="Post title"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="blog-slug">Slug override (optional)</Label>
        <Input
          id="blog-slug"
          value={slugManual}
          onChange={(e) => setSlugManual(e.target.value)}
          disabled={isPending}
          placeholder="leave blank to derive from title"
        />
        <p className="text-xs text-muted-foreground">
          Public URL: /blog/<span className="font-mono text-foreground">{slugPreview || '…'}</span>
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="blog-meta">Meta description</Label>
        <Textarea
          id="blog-meta"
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          disabled={isPending}
          rows={3}
          placeholder="SEO summary shown in search and listings"
        />
      </div>
      <Tabs defaultValue="edit" className="w-full">
        <TabsList>
          <TabsTrigger value="edit">Edit Markdown</TabsTrigger>
          <TabsTrigger value="preview" disabled={!content.trim()}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="edit" className="mt-4 space-y-2">
          <Label htmlFor="blog-content">Body (Markdown)</Label>
          <Textarea
            id="blog-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isPending}
            rows={22}
            className="font-mono text-sm leading-relaxed"
            placeholder="Use ## for sections, - for bullets, **bold** for emphasis"
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-4 rounded-lg border bg-card p-6">
          {content.trim() ? (
            <SimpleMarkdown content={content} />
          ) : (
            <p className="text-sm text-muted-foreground">Add content to preview.</p>
          )}
        </TabsContent>
      </Tabs>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleSave} disabled={isPending} variant="outline">
          {isPending ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            'Save draft'
          )}
        </Button>
        <Button type="button" onClick={handlePublish} disabled={isPending}>
          {isPending ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" /> Publishing…
            </>
          ) : (
            'Save & publish'
          )}
        </Button>
      </div>
    </div>
  );
}
