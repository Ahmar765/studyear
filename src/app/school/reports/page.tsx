'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Download, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import {
  getAtRiskStudentsAction,
  getSchoolStudentsAction,
  type AtRiskStudent,
  type SchoolStudent,
} from '@/server/actions/school-actions';

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function rosterCsv(students: SchoolStudent[]) {
  const headers = ['Student ID', 'Name', 'Year Group', 'Predicted Grade', 'Progress %'];
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  for (const s of students) {
    lines.push(
      [s.id, s.name, s.yearGroup, s.predictedGrade, s.progressScore].map(esc).join(','),
    );
  }
  return lines.join('\n');
}

function atRiskCsv(rows: AtRiskStudent[]) {
  const headers = ['Student ID', 'Name', 'Risk Level', 'Weakest Subject'];
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  for (const s of rows) {
    lines.push([s.id, s.name, s.riskLevel, s.weakestSubject].map(esc).join(','));
  }
  return lines.join('\n');
}

export default function SchoolReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(true);
  const [reportKind, setReportKind] = useState<'roster' | 'atrisk' | 'summary'>('summary');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPending(false);
      setError('Not authenticated.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const [sRes, rRes] = await Promise.all([
          getSchoolStudentsAction(token),
          getAtRiskStudentsAction(token),
        ]);
        if (!cancelled) {
          setStudents(sRes.students);
          setAtRisk(rRes.students);
          setError(sRes.error || rRes.error);
        }
      } catch {
        if (!cancelled) setError('Failed to load report data.');
      } finally {
        if (!cancelled) setPending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const handleDownload = () => {
    if (reportKind === 'roster') {
      downloadText(`school-roster-${Date.now()}.csv`, rosterCsv(students), 'text/csv;charset=utf-8');
      return;
    }
    if (reportKind === 'atrisk') {
      downloadText(`at-risk-${Date.now()}.csv`, atRiskCsv(atRisk), 'text/csv;charset=utf-8');
      return;
    }
    const summary = [
      `StudYear — School summary (${new Date().toISOString().slice(0, 10)})`,
      `Students on roll: ${students.length}`,
      `At-risk (HIGH/CRITICAL): ${atRisk.length}`,
      '',
      'Average progress % (approx):',
      students.length
        ? String(
            Math.round(
              students.reduce((a, s) => a + (s.progressScore || 0), 0) / students.length,
            ),
          )
        : 'N/A',
    ].join('\n');
    downloadText(`school-summary-${Date.now()}.txt`, summary, 'text/plain;charset=utf-8');
  };

  if (authLoading || pending) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[40vh]">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reporting Suite</h2>
        <p className="text-muted-foreground">
          Generate downloadable exports from live school data (roster, at-risk list, summary).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Generate a Report</CardTitle>
          <CardDescription>Select a report type and download CSV or summary text.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Report type</Label>
              <Select
                value={reportKind}
                onValueChange={(v) => setReportKind(v as typeof reportKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Executive summary (.txt)</SelectItem>
                  <SelectItem value="roster">Student roster (.csv)</SelectItem>
                  <SelectItem value="atrisk">At-risk students (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Current snapshot</p>
              <ul className="space-y-1">
                <li>Students linked to school: {students.length}</li>
                <li>At-risk entries: {atRisk.length}</li>
              </ul>
            </div>
          </div>
          <Button type="button" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download report
          </Button>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center text-muted-foreground">
            <BarChart className="h-10 w-10 mb-2 opacity-70" />
            <p className="text-sm max-w-md">
              Reports use your school-linked student roster and dashboard signals. PDF branding can be
              added later; exports work offline immediately.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
