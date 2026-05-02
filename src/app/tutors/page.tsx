
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Star, MessageSquare, BadgeCent, CalendarDays, BookOpen, PlusCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getTutorListingsAction } from "@/server/actions/tutor-actions";

export default async function TutorsPage({ searchParams }: { searchParams: { q?: string } }) {
  const { tutors, error } = await getTutorListingsAction({ query: searchParams.q });

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex flex-col items-start space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Find a Tutor</h2>
        <p className="text-muted-foreground max-w-2xl">
          Search our marketplace for verified tutors to help you with your studies.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tutor Search</CardTitle>
          <CardDescription>
            Filter by subject, level, availability, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex items-center gap-4">
            <Input 
              name="q"
              placeholder="Search by subject or name..." 
              className="flex-1"
              defaultValue={searchParams.q || ""}
            />
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" /> Search Tutors
            </Button>
          </form>
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {error && <p className="text-destructive md:col-span-2">{error}</p>}
            {!error && tutors && tutors.length > 0 ? (
              tutors.map(tutor => (
                <Card key={tutor.uid} className="hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader className="flex-row items-center gap-4">
                     <Avatar className="h-16 w-16 border">
                        <AvatarImage src={tutor.profileImageUrl} />
                        <AvatarFallback>{tutor.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{tutor.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> 
                                4.9
                            </Badge>
                             <div className="font-semibold flex items-center gap-1 text-sm">
                                <BadgeCent className="h-4 w-4 text-muted-foreground" /> £{tutor.hourlyRate || 'N/A'}/hr
                            </div>
                        </div>
                      </div>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">{tutor.bio || 'No bio available.'}</p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                            <BookOpen className="h-4 w-4 text-muted-foreground"/>
                            <span className="font-semibold">Subjects:</span>
                            <div className="flex flex-wrap gap-1">
                                {tutor.subjects.map((s: string) => <Badge variant="outline" key={s}>{s}</Badge>)}
                            </div>
                        </div>
                    </div>
                  </CardContent>
                   <CardContent className="flex flex-col sm:flex-row gap-2">
                     <Button className="w-full">
                      <MessageSquare className="mr-2 h-4 w-4" /> Message
                    </Button>
                    <Button variant="secondary" className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4" /> Book Session
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
                <div className="md:col-span-2 text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                    <p className="text-lg font-semibold">No tutors found</p>
                    <p className="mt-2">No tutors match your current search criteria or none have been approved yet.</p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
