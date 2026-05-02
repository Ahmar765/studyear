
'use client';
import { useCookieConsent } from '@/hooks/use-cookie-consent';
import { Button } from './ui/button';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { useState } from 'react';
import { Cookie } from 'lucide-react';

export default function CookieBanner() {
  const { consent, acceptAll, rejectAll, saveConsent } = useCookieConsent();
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    functional: false,
  });

  const handleSavePreferences = () => {
    saveConsent(preferences);
    setShowPreferences(false);
  };

  if (consent?.consentGiven) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t shadow-lg">
        <div className="container mx-auto p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
             <Cookie className="h-5 w-5 text-primary mt-1 shrink-0" />
              <p className="text-sm text-muted-foreground">
                We use cookies to enhance your experience, analyze site traffic, and personalize content. By clicking "Accept All", you agree to our use of cookies.
                Read our <Link href="/cookies" className="underline hover:text-primary">Cookie Policy</Link>.
              </p>
          </div>
          <div className="flex gap-2 flex-shrink-0 w-full md:w-auto">
            <Button onClick={acceptAll} className="w-full">Accept All</Button>
            <Button variant="outline" onClick={() => setShowPreferences(true)} className="w-full">
              Preferences
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cookie Preferences</DialogTitle>
            <DialogDescription>
              Manage your cookie settings. Necessary cookies cannot be disabled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <Label htmlFor="necessary-cookies">Strictly Necessary</Label>
              <Switch id="necessary-cookies" checked disabled />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-md">
              <Label htmlFor="analytics-cookies">Analytics & Performance</Label>
              <Switch 
                id="analytics-cookies" 
                checked={preferences.analytics}
                onCheckedChange={(checked) => setPreferences(p => ({...p, analytics: checked}))}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-md">
              <Label htmlFor="functional-cookies">Functional Cookies</Label>
              <Switch 
                id="functional-cookies" 
                checked={preferences.functional}
                onCheckedChange={(checked) => setPreferences(p => ({...p, functional: checked}))}
               />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => rejectAll()}>Reject All Non-Essential</Button>
            <Button onClick={handleSavePreferences}>Save Preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
