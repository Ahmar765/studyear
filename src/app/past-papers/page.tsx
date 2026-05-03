
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Library, FileCheck2, Download } from "lucide-react";
import { searchPastPapersAction, type PastPaperResult } from "@/server/actions/past-paper-actions";
import { useState, useEffect, useTransition } from "react";
import { getSubjects, getExamBoards, getLevels } from "@/server/actions/academic-actions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import ContributionForm from "./contribution-form";

interface Subject {
    code: string;
    name: string;
}

export default function PastPapersPage() {
  const [filters, setFilters] = useState({
    subjectId: '',
    examBoard: '',
    year: '',
  });
  const [results, setResults] = useState<PastPaperResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isFetchingFilters, setIsFetchingFilters] = useState(true);
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examBoards, setExamBoards] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
        try {
            const [subjectsData, examBoardsData, levelsData] = await Promise.all([getSubjects(), getExamBoards(), getLevels()]);
            setSubjects(subjectsData as Subject[]);
            setExamBoards(examBoardsData);
            setLevels(levelsData);
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not load search filters.'})
        } finally {
            setIsFetchingFilters(false);
        }
    }
    fetchData();
  }, [toast]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const { papers, error } = await searchPastPapersAction(filters);
      if (error) {
        toast({ variant: 'destructive', title: 'Search Failed', description: error });
      } else {
        setResults(papers);
      }
    });
  }

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Past Papers Library</h2>
        <p className="text-muted-foreground">
          Search our community-fed library of past papers, mark schemes, and examiner reports.
        </p>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Filter the Library</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <form onSubmit={handleSearch}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Select value={filters.subjectId} onValueChange={(v) => handleFilterChange('subjectId', v)} disabled={isFetchingFilters}>
                          <SelectTrigger><SelectValue placeholder="All Subjects" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Subjects</SelectItem>
                            {subjects.map((s) => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                       <div className="space-y-2">
                        <Label>Exam Board</Label>
                        <Select value={filters.examBoard} onValueChange={(v) => handleFilterChange('examBoard', v)} disabled={isFetchingFilters}>
                          <SelectTrigger><SelectValue placeholder="All Boards" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Boards</SelectItem>
                            {examBoards.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                       <div className="space-y-2">
                        <Label>Year</Label>
                        <Input type="number" placeholder="e.g. 2023" value={filters.year} onChange={(e) => handleFilterChange('year', e.target.value)} />
                      </div>
                      <Button type="submit" className="w-full" disabled={isPending || isFetchingFilters}>
                        <Search className="mr-2 h-4 w-4" /> {isPending ? 'Searching...' : 'Search'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
            </Card>
      
            <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Search Results</CardTitle>
                    {!isPending && <span className="text-sm text-muted-foreground">{results.length} papers found</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  {isPending ? (
                    <div className="space-y-4">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : results.length > 0 ? (
                    <div className="space-y-4">
                      {results.map(paper => (
                        <Card key={paper.id} className="flex flex-col md:flex-row items-start p-4 gap-4">
                          <div className="flex-grow">
                            <h3 className="font-semibold">{paper.title}</h3>
                            <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground mt-1">
                                <Badge variant="outline">{paper.examBoard}</Badge>
                                <Badge variant="outline" className="flex items-center gap-1">{paper.paperYear}</Badge>
                                <Badge variant="secondary">{subjects.find(s => s.code === paper.subjectId)?.name || paper.subjectId}</Badge>
                            </div>
                          </div>
                           <Button asChild variant="ghost" size="sm" className="w-full md:w-auto shrink-0">
                                <a href={paper.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="mr-2"/>Download
                                </a>
                            </Button>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg">
                      <Library className="h-12 w-12 mb-4" />
                      <h3 className="text-lg font-semibold">Your search results will appear here.</h3>
                      <p className="text-sm">Use the filters above to find relevant exam papers.</p>
                    </div>
                  )}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
             <Card className="bg-muted/30 sticky top-20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileCheck2 />Contribute a Resource</CardTitle>
                    <CardDescription>Help the community by uploading a past paper or video. Once approved, it becomes a shared platform asset.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isFetchingFilters ? (
                        <Skeleton className="h-64 w-full" />
                    ) : (
                        <ContributionForm subjects={subjects} examBoards={examBoards} levels={levels} />
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
