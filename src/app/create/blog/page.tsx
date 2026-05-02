
import BlogGenerator from "./blog-generator";

export default function BlogPage() {
    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col items-start space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">AI Blog Post Generator</h2>
                <p className="text-muted-foreground max-w-2xl">
                   Generate a complete, SEO-friendly blog post from a single topic, including a catchy title, meta description, and structured content.
                </p>
            </div>
            <BlogGenerator />
        </div>
    );
}
