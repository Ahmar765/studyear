import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedBlogPostBySlug } from '@/server/actions/blog-post-actions';
import { SimpleMarkdown } from '@/components/blog/simple-markdown';
import { BlogPostViewTracker } from '../blog-post-view-tracker';
import { Button } from '@/components/ui/button';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
  const { post } = await getPublishedBlogPostBySlug(params.slug);
  if (!post) return { title: 'Post not found' };
  return {
    title: `${post.title} — StudYear blog`,
    description: post.metaDescription,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { post, error } = await getPublishedBlogPostBySlug(params.slug);
  if (error || !post) notFound();

  return (
    <div className="flex-1 p-4 md:p-8">
      <BlogPostViewTracker slug={post.slug} />
      <article className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <Button variant="ghost" className="-ml-2 h-auto px-2 text-muted-foreground" asChild>
            <Link href="/blog">← All posts</Link>
          </Button>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{post.title}</h1>
          {post.publishedAt ? (
            <p className="text-sm text-muted-foreground">
              {new Date(post.publishedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Summary</p>
          <p className="mt-1 rounded-md bg-muted p-3 text-sm italic">{post.metaDescription}</p>
        </div>
        <SimpleMarkdown content={post.content} />
      </article>
    </div>
  );
}
