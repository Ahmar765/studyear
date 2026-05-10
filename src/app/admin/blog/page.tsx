import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { listBlogPostsAdminAction } from '@/server/actions/blog-post-actions';
import BlogPostRowActions from './blog-post-row-actions';
import { Newspaper } from 'lucide-react';

export default async function AdminBlogPage() {
  const { posts, error } = await listBlogPostsAdminAction();

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Blog</h2>
          <p className="text-muted-foreground">
            Create drafts, publish to the public blog, and monitor article views (one increment per page load).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/create/blog">
              <Newspaper className="mr-2 h-4 w-4" /> AI generator
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/blog/new">New post</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All posts</CardTitle>
            <CardDescription>Clicks count successful loads of the public article page.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-[14rem] font-medium">{p.title}</TableCell>
                    <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                    <TableCell>
                      {p.published ? (
                        <Badge>Published</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.clickCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <BlogPostRowActions post={p} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {posts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No posts yet. Create one or use the AI generator.</p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
