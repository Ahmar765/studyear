
'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Eye, Loader } from 'lucide-react';
import {
    searchUsersForImpersonationAction,
    startImpersonationAction,
    type ImpersonationSearchUserRow,
} from '@/server/actions/admin-actions';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  targetUid: z.string().min(1, 'Target User ID is required.'),
  reason: z.string().min(10, 'Please provide a brief reason for this session (min. 10 characters).'),
});

export default function SupportPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ImpersonationSearchUserRow[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { targetUid: '', reason: '' },
  });

  const runSearch = useCallback(
    async (q: string) => {
      if (!user || q.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const idToken = await user.getIdToken();
        const { users, error } = await searchUsersForImpersonationAction(idToken, q);
        if (error) {
          toast({ variant: 'destructive', title: 'Search failed', description: error });
          setSearchResults([]);
        } else {
          setSearchResults(users);
        }
      } finally {
        setSearching(false);
      }
    },
    [user, toast],
  );

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      void runSearch(q);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchQuery, runSearch]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    startTransition(async () => {
        const { success, customToken, impersonationLogId, error } = await startImpersonationAction(values.targetUid, values.reason);

        if (success && customToken && impersonationLogId) {
            toast({
                title: 'Impersonation Session Starting',
                description: 'A new tab will open for the user session.',
            });
            const impersonateUrl = `/auth/impersonate?token=${customToken}&logId=${impersonationLogId}&targetUid=${values.targetUid}`;
            window.open(impersonateUrl, '_blank');
        } else {
            toast({
                variant: 'destructive',
                title: 'Failed to start session',
                description: error,
            });
        }
    });
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Support Tools</h2>
        <p className="text-muted-foreground max-w-2xl">
          Access admin-only support features. All actions are logged.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>View as User</CardTitle>
          <CardDescription>
            Initiate a secure, time-limited impersonation session to assist a user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="targetUid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target user</FormLabel>
                    <p className="text-muted-foreground text-sm mb-2">
                      Search by name or email, or enter a User ID below.
                    </p>
                    <div ref={searchWrapRef} className="relative space-y-2">
                      <Input
                        placeholder="Search by name or email…"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setSearchOpen(true);
                        }}
                        onFocus={() => setSearchOpen(true)}
                        autoComplete="off"
                      />
                      {searchOpen && searchQuery.trim().length >= 2 && (
                        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                          {searching ? (
                            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                              <Loader className="h-4 w-4 animate-spin" />
                              Searching…
                            </div>
                          ) : searchResults.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No matches.</div>
                          ) : (
                            <ul className="py-1">
                              {searchResults.map((row) => (
                                <li key={row.uid}>
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => {
                                      field.onChange(row.uid);
                                      setSearchQuery(
                                        row.name || row.email || row.uid,
                                      );
                                      setSearchOpen(false);
                                    }}
                                  >
                                    <span className="font-medium">
                                      {row.name || '(No name)'}
                                    </span>
                                    {row.email ? (
                                      <span className="text-muted-foreground">
                                        {' '}
                                        · {row.email}
                                      </span>
                                    ) : null}
                                    <span className="block truncate font-mono text-xs text-muted-foreground">
                                      {row.uid}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      <FormControl>
                        <Input
                          placeholder="User ID (UID) — filled when you pick a user, or paste directly"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Session</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., 'Investigating user report of missing study plan...'" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                {isPending ? 'Initiating...' : 'Start View as User Session'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
