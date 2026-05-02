
'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { askAiTutor } from '@/server/actions/ai-tutor-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, User as UserIcon, Send, Loader, Sparkles, BookOpen, AlertTriangle, UserCheck, Lightbulb, CheckCircle, Search, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { AiTutorAssistanceInput, AiTutorAssistanceOutput } from '@/server/ai/flows/ai-tutor-assistance';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface UserMessage {
  id: string;
  role: 'user';
  content: string;
}
interface AssistantMessage {
    id: string;
    role: 'assistant';
    content: AiTutorAssistanceOutput;
    chargedAcus?: number;
}
type Message = UserMessage | AssistantMessage;

const formSchema = z.object({
  query: z.string().min(1, 'Please enter a message.'),
});

const promptStarters = [
    { icon: Sparkles, text: "Explain photosynthesis like I'm 10" },
    { icon: BookOpen, text: "Give me a step-by-step plan to solve a quadratic equation" },
    { icon: HelpCircle, text: "Ask me 3 warm-up questions about World War 2" },
];

const SimpleMarkdown: React.FC<{ content: string; className?: string }> = ({ content, className }) => {
    return (
        <div className={cn("prose prose-sm prose-stone dark:prose-invert max-w-none text-muted-foreground", className)}>
        {content.split('\n').map((line, index) => {
            if (line.startsWith('## ')) {
                return <h2 key={index} className="text-xl font-bold mt-4 mb-2 text-foreground">{line.substring(3)}</h2>;
            }
             if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ') || line.startsWith('5. ')) {
                return <li key={index} className="ml-4 list-decimal">{line.substring(3)}</li>;
            }
            if (line.startsWith('* ')) {
                return <li key={index} className="ml-4 list-disc">{line.substring(2)}</li>;
            }
             if (line.startsWith('**') && line.endsWith('**')) {
                return <strong key={index} className="text-foreground">{line.substring(2, line.length - 2)}</strong>
            }
            if (line.trim() === '') {
                return <br key={index} />;
            }
            return <p key={index} className="mb-2">{line}</p>;
        })}
        </div>
    );
};

const AIMessageCard: React.FC<{ message: AssistantMessage }> = ({ message }) => {
    if (message.content.escalated) {
        return (
             <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                <CardHeader className="flex-row items-center gap-3 space-y-0 p-4">
                    <UserCheck className="h-6 w-6 text-amber-600"/>
                    <div>
                        <CardTitle className="text-amber-800 dark:text-amber-300 text-base">Escalating to Human Support</CardTitle>
                        <CardDescription className="text-amber-700 dark:text-amber-400 text-xs">Your request needs a human touch.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <p className="text-sm text-amber-900 dark:text-amber-200">{message.content.response}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent className="p-4 space-y-4">
                <SimpleMarkdown content={message.content.response} className="text-foreground" />

                {message.content.detectedWeakness && (
                    <>
                    <Separator />
                    <div className="space-y-1">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2"><Search /> Diagnosis</h4>
                        <p className="text-sm text-muted-foreground italic">"{message.content.detectedWeakness}"</p>
                    </div>
                    </>
                )}

                {message.content.followUpQuestion && (
                    <>
                    <Separator />
                    <div className="space-y-1">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2"><CheckCircle /> Check for Understanding</h4>
                        <p className="text-sm text-muted-foreground font-medium">"{message.content.followUpQuestion}"</p>
                    </div>
                    </>
                )}

                 {message.content.nextAction && (
                    <>
                    <Separator />
                    <div className="space-y-1">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2"><Lightbulb /> Next Action</h4>
                        <p className="text-sm text-muted-foreground font-medium">"{message.content.nextAction}"</p>
                    </div>
                    </>
                )}

            </CardContent>
            {message.chargedAcus && message.chargedAcus > 0 && (
                <CardContent className="p-2 border-t">
                <Badge variant="outline" className="text-xs">
                    -{message.chargedAcus.toLocaleString()} ACUs
                </Badge>
                </CardContent>
            )}
        </Card>
    )
}


export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { query: '' },
  });

  const handleQuerySubmit = (queryText: string) => {
    if (!user || !queryText.trim()) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: queryText };
    setMessages(prev => [...prev, userMessage]);
    form.reset();

    startTransition(async () => {
      const historyForPrompt = messages
        .filter(m => m.role === 'assistant' || m.role === 'user')
        .map(m => ({ 
            role: m.role, 
            content: m.role === 'user' ? m.content : (m.content as AiTutorAssistanceOutput).response 
        })) as { role: 'user' | 'assistant'; content: string; }[];

      const input: AiTutorAssistanceInput = { query: queryText, history: historyForPrompt };
      const result = await askAiTutor(input, user.uid, sessionId);
      
      if (result.sessionId && !sessionId) {
        setSessionId(result.sessionId);
      }

      if (result.success && result.response) {
         const responseMessage: AssistantMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: result.response,
            chargedAcus: result.chargedAcus,
        };
        setMessages(prev => [...prev, responseMessage]);
      } else {
        const errorMessage: AssistantMessage = {
             id: crypto.randomUUID(),
             role: 'assistant',
             content: {
                 escalated: true,
                 response: result.error || 'Sorry, I couldn\'t get a response. Please try again later.'
             }
        }
        setMessages(prev => [...prev, errorMessage]);
      }
    });
  }

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    handleQuerySubmit(values.query);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }
  }, [messages, isPending]);

  return (
    <Card className="h-[75vh] flex flex-col max-w-4xl mx-auto">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.length === 0 ? (
             <div className="text-center text-muted-foreground pt-12">
                <div className="inline-block bg-primary/10 text-primary p-4 rounded-full mb-6">
                    <Bot className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">How can I help you today?</h2>
                <p className="mt-2">I can explain topics, solve problems, or quiz you.</p>
                <div className="grid sm:grid-cols-3 gap-4 mt-8 text-left">
                    {promptStarters.map((starter, index) => (
                        <Card key={index} className="hover:bg-muted cursor-pointer transition-colors" onClick={() => handleQuerySubmit(starter.text)}>
                            <CardContent className="p-4 flex items-start gap-3">
                                <starter.icon className="h-5 w-5 text-primary mt-1 shrink-0"/>
                                <p className="text-sm font-medium text-foreground">{starter.text}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
             </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={cn('flex items-start gap-4', { 'justify-end': message.role === 'user' })}>
                
                {message.role === 'assistant' && (
                    <Avatar className="w-8 h-8 border"><AvatarFallback><Bot /></AvatarFallback></Avatar>
                )}
                
                <div className={cn('max-w-prose w-full', { 'max-w-max': message.role === 'user' })}>
                  {message.role === 'assistant' ? (
                     <AIMessageCard message={message} />
                  ) : (
                    <div className="bg-primary text-primary-foreground p-4 rounded-lg shadow-sm">
                       <SimpleMarkdown content={message.content} className="text-primary-foreground" />
                    </div>
                  )}
                </div>
                 
                 {message.role === 'user' && (
                  <Avatar className="w-8 h-8 border">
                    <AvatarImage src={user?.photoURL ?? ''} />
                    <AvatarFallback><UserIcon /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
           {isPending && (
             <div className="flex items-start gap-4">
                <Avatar className="w-8 h-8 border"><AvatarFallback><Bot /></AvatarFallback></Avatar>
                <div className="p-3 rounded-lg bg-muted shadow-sm flex items-center gap-2">
                    <Loader className="h-4 w-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">Thinking...</p>
                </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <CardContent className="p-4 border-t bg-background/80 backdrop-blur-sm sticky bottom-0">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2">
                <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                    <FormItem className="flex-1">
                    <FormControl>
                        <Input
                        placeholder="Ask a question or type a topic..."
                        autoComplete="off"
                        disabled={isPending}
                        {...field}
                        />
                    </FormControl>
                    </FormItem>
                )}
                />
                <Button type="submit" disabled={isPending}>
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                </Button>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}
