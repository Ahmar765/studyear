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
import {
  ContactInboxDetailDialog,
  truncateMessage,
} from '@/components/admin/contact-inbox-detail-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export default function AdminContactInboxPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<ContactSubmissionRow[]>([]);
  const [inbox, setInbox] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [selected, setSelected] = useState<ContactSubmissionRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

  const openMessage = (row: ContactSubmissionRow) => {
    setSelected(row);
    setDetailOpen(true);
  };

  const markStatus = async (id: string, status: 'READ' | 'REPLIED') => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await updateContactSubmissionStatusAction(token, id, status);
    if (res.success) {
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
      setSelected((prev) => (prev?.id === id ? { ...prev, status } : prev));
    } else {
      toast({ variant: 'destructive', title: 'Update failed', description: res.error });
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Contact inbox</h2>
        <p className="text-muted-foreground max-w-2xl">
          Click a message or email to read the full enquiry. Reply directly from the inbox via SMTP.
        </p>
      </div>

      <AdminEmailTestPanel />

      <ContactInboxDetailDialog
        submission={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onMarkRead={(id) => void markStatus(id, 'READ')}
        onReplied={load}
      />

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
                {submissions.length} message{submissions.length === 1 ? '' : 's'} — click to open and read
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((row) => (
                      <TableRow
                        key={row.id}
                        className={cn(
                          'cursor-pointer hover:bg-muted/50',
                          row.status === 'NEW' && 'bg-primary/[0.03]',
                        )}
                        onClick={() => openMessage(row)}
                      >
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{row.fullName}</div>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline text-left"
                            onClick={(e) => {
                              e.stopPropagation();
                              openMessage(row);
                            }}
                          >
                            {row.email}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.enquiryType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-sm">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {truncateMessage(row.message)}
                          </p>
                          <span className="text-xs text-primary mt-1 inline-block">Read message →</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'NEW' ? 'default' : 'secondary'}>
                            {row.status}
                          </Badge>
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
