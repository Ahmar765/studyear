'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  listContactSubmissionsAction,
  updateContactSubmissionStatusAction,
  type ContactSubmissionRow,
} from '@/server/actions/settings-actions';
import { AdminEmailTestPanel } from '@/components/admin/admin-email-test-panel';
import { ContactInboxReplyDialog } from '@/components/admin/contact-inbox-reply-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminContactInboxPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<ContactSubmissionRow[]>([]);
  const [inbox, setInbox] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await listContactSubmissionsAction(token);
      if (res.success) {
        setSubmissions(res.submissions);
        setInbox(res.inbox);
        setError(undefined);
      } else {
        setError(res.error);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const markStatus = async (id: string, status: 'READ' | 'REPLIED') => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await updateContactSubmissionStatusAction(token, id, status);
    if (res.success) {
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    } else {
      toast({ variant: 'destructive', title: 'Update failed', description: res.error });
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Contact inbox</h2>
        <p className="text-muted-foreground max-w-2xl">
          Messages from the public contact form. Reply directly from here — emails send from your StudYear
          mailbox via SMTP.
        </p>
      </div>

      <AdminEmailTestPanel />

      {loading ? (
        <div className="flex items-center justify-center min-h-[20vh]">
          <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {inbox ? (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>Contact form delivers to</AlertTitle>
              <AlertDescription>
                <a href={`mailto:${inbox}`} className="text-primary underline">
                  {inbox}
                </a>
                {' — '}
                set in Admin → Settings → Contact inbox email, or via{' '}
                <code className="text-xs">CONTACT_INBOX_EMAIL</code> env var.
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not load inbox</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Submissions</CardTitle>
              <CardDescription>
                {submissions.length} message{submissions.length === 1 ? '' : 's'} — newest first
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
                  No contact messages yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{row.fullName}</div>
                          <a
                            href={`mailto:${row.email}`}
                            className="text-xs text-primary hover:underline"
                          >
                            {row.email}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.enquiryType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs text-sm text-muted-foreground whitespace-pre-wrap">
                          {row.message}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'NEW' ? 'default' : 'secondary'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <ContactInboxReplyDialog submission={row} onSent={load} />
                            {row.status === 'NEW' ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => void markStatus(row.id, 'READ')}
                              >
                                Mark read
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Button asChild variant="outline">
            <Link href="/admin/settings">Email &amp; message copy settings</Link>
          </Button>
        </>
      )}
    </div>
  );
}
