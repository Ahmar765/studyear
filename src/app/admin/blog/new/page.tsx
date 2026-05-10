import Link from 'next/link';
import { Button } from '@/components/ui/button';
import BlogPostForm from '../blog-post-form';

export default function AdminBlogNewPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">New blog post</h2>
          <p className="text-muted-foreground">Write Markdown here or paste output from the AI blog generator.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/blog">← Back to list</Link>
        </Button>
      </div>
      <BlogPostForm />
    </div>
  );
}
