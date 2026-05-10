'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  deleteBlogPostAction,
  publishBlogPostAction,
  unpublishBlogPostAction,
  type BlogPostAdminRow,
} from '@/server/actions/blog-post-actions';
import { ExternalLink, Loader, Trash2, Eye, EyeOff } from 'lucide-react';

export default function BlogPostRowActions({ post }: { post: BlogPostAdminRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const run = async (label: string, fn: () => Promise<{ success: boolean; error?: string }>) => {
    startTransition(async () => {
      const r = await fn();
      if (!r.success) {
        toast({ variant: 'destructive', title: `${label} failed`, description: r.error });
        return;
      }
      toast({ title: label });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="outline" size="sm" asChild disabled={isPending}>
        <Link href={`/admin/blog/${post.id}/edit`}>Edit</Link>
      </Button>
      {post.published ? (
        <>
          <Button variant="outline" size="sm" asChild disabled={isPending}>
            <Link href={`/blog/${encodeURIComponent(post.slug)}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> View live
            </Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={() => run('Unpublished', () => unpublishBlogPostAction(post.id))}
          >
            {isPending ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <EyeOff className="mr-2 h-4 w-4" /> Unpublish
              </>
            )}
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => run('Published', () => publishBlogPostAction(post.id))}
        >
          {isPending ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" /> Publish
            </>
          )}
        </Button>
      )}
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (!confirm('Delete this blog post permanently?')) return;
          run('Deleted', () => deleteBlogPostAction(post.id));
        }}
      >
        <Trash2 className="mr-2 h-4 w-4" /> Delete
      </Button>
    </div>
  );
}
