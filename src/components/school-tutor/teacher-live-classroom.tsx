'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Check, Copy, Video } from 'lucide-react';

function slugRoomId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 48) || 'StudYearTeacherRoom';
}

export function TeacherLiveClassroom() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [roomSuffix, setRoomSuffix] = useState('live');

  const roomName = useMemo(() => {
    const base = user?.uid ? `StudYear-Teacher-${slugRoomId(user.uid)}` : 'StudYear-Teacher';
    const suffix = slugRoomId(roomSuffix);
    return suffix ? `${base}-${suffix}` : base;
  }, [user?.uid, roomSuffix]);

  const meetUrl = useMemo(() => {
    const params = new URLSearchParams({
      'config.prejoinPageEnabled': 'true',
      'config.startWithAudioMuted': 'true',
      'config.startWithVideoMuted': 'false',
    });
    const displayName = userProfile?.name?.trim() || 'StudYear Teacher';
    params.set('userInfo.displayName', displayName);
    return `https://meet.jit.si/${encodeURIComponent(roomName)}#${params.toString()}`;
  }, [roomName, userProfile?.name]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(meetUrl);
      setCopied(true);
      toast({
        title: 'Link copied',
        description: 'Share this room URL with students or colleagues.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Copy the URL from the address bar inside the room.',
      });
    }
  };

  if (!user) {
    return (
      <Card className="school-panel">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Sign in to start a live classroom session.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="school-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="h-5 w-5 text-indigo-600" />
            Live video room
          </CardTitle>
          <CardDescription>
            HD video and screen share powered by Jitsi. Share the invite link with your class — students can join from
            any browser without installing an app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="teacher-room-suffix">Session label (optional)</Label>
              <Input
                id="teacher-room-suffix"
                value={roomSuffix}
                onChange={(e) => setRoomSuffix(e.target.value)}
                placeholder="e.g. year10-maths"
                maxLength={24}
              />
              <p className="text-xs text-muted-foreground">Room ID: {roomName}</p>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <Button type="button" variant="outline" onClick={copyLink}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copy invite link
              </Button>
              <Button type="button" asChild>
                <a href={meetUrl} target="_blank" rel="noopener noreferrer">
                  Open in new tab
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border bg-black shadow-lg">
        <iframe
          title="StudYear teacher live classroom"
          src={meetUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="aspect-video w-full min-h-[420px] border-0"
        />
      </div>
    </div>
  );
}
