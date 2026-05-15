import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export function TutorSubPage({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <div className="tutor-dashboard flex-1 space-y-6 p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          {Icon && <Icon className="h-8 w-8 text-amber-600" />}
          {title}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{description}</p>
      </header>
      {children ?? (
        <Card className="tutor-panel">
          <CardHeader>
            <CardTitle>Coming online</CardTitle>
            <CardDescription>This module is wired into your Command Centre roadmap.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Full implementation includes live data, scheduling, and AI integrations per the StudYear tutor
            ecosystem spec.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
