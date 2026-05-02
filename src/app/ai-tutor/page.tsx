
import ChatInterface from "./chat-interface";

export default function AiTutorPage() {
    return (
        <div className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col items-start space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">AI Tutor</h2>
                <p className="text-muted-foreground max-w-2xl">
                    Your personal AI-powered academic assistant. Ask questions, get explanations, and test your knowledge.
                </p>
            </div>
            <ChatInterface />
        </div>
    );
}

    