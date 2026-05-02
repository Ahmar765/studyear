
import VisualGenerator from "./visual-generator";

export default function VisualToolPage() {
    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col items-start space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Visual Tools & Graphs</h2>
                <p className="text-muted-foreground max-w-2xl">
                   Create custom diagrams, educational images, and data charts from a text prompt or your own data.
                </p>
            </div>
            <VisualGenerator />
        </div>
    );
}
