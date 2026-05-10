import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getBlogPostAdminByIdAction } from '@/server/actions/blog-post-actions';
import BlogPostForm from '../../blog-post-form';

type Props = { params: { id: string } };

export default async function AdminBlogEditPage({ params }: Props) {
  const { post, error } = await getBlogPostAdminByIdAction(params.id);
  if (error || !post) notFound();

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Edit post</h2>
          <p className="text-muted-foreground">
            Status: {post.published ? 'Published' : 'Draft'} · Clicks: {post.clickCount.toLocaleString()}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/blog">← Back to list</Link>
        </Button>
      </div>
      <BlogPostForm initialPost={post} />
    </div>
  );
}
