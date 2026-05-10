import Link from 'next/link';
import { listPublishedBlogPosts } from '@/server/actions/blog-post-actions';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Blog — StudYear',
  description: 'Articles and updates from StudYear.',
};

export default async function BlogIndexPage() {
  const { posts, error } = await listPublishedBlogPosts();

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">StudYear blog</h1>
        <p className="text-muted-foreground">Tips, product updates, and learning science ideas.</p>
      </div>
      {error ? (
        <p className="text-center text-destructive">{error}</p>
      ) : posts.length === 0 ? (
        <p className="text-center text-muted-foreground">No published posts yet. Check back soon.</p>
      ) : (
        <ul className="mx-auto grid max-w-3xl gap-4">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${encodeURIComponent(p.slug)}`}>
                <Card className="transition-colors hover:bg-muted/40">
                  <CardHeader>
                    <CardTitle className="text-xl">{p.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{p.metaDescription}</CardDescription>
                    {p.publishedAt ? (
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.publishedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    ) : null}
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
