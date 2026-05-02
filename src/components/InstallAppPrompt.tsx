'use client';

import { useState, useEffect } from 'react';
import { usePWAInstallPrompt } from '@/hooks/usePWAInstallPrompt';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import Logo from './logo';
import { Smartphone, Download, Share, ArrowDown } from 'lucide-react';

const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

export default function InstallAppPrompt() {
  const { deferredPrompt, handleInstall, isAppInstalled } = usePWAInstallPrompt();
  const [isOpen, setIsOpen] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    // Determine if it's an iOS device on the client
    setIsIOSDevice(isIOS());
  }, []);

  useEffect(() => {
    const hasDismissed = localStorage.getItem('studyear_install_dismissed');
    if (!isAppInstalled && (deferredPrompt || isIOSDevice) && !hasDismissed) {
      // Show the prompt after a short delay on first eligible visit
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000); // 3-second delay
      return () => clearTimeout(timer);
    }
  }, [deferredPrompt, isAppInstalled, isIOSDevice]);

  const handleDismiss = () => {
    localStorage.setItem('studyear_install_dismissed', 'true');
    setIsOpen(false);
  };

  const onInstallClick = async () => {
    await handleInstall();
    setIsOpen(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent onEscapeKeyDown={handleDismiss} onPointerDownOutside={handleDismiss}>
        <DialogHeader>
            <div className="flex justify-center mb-4">
                <Logo />
            </div>
          <DialogTitle className="text-center text-xl">
            {isIOSDevice ? 'Add StudYear to your Home Screen' : 'Install StudYear as an App'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isIOSDevice 
                ? 'For the best experience, add our platform to your home screen for one-tap access.' 
                : 'Get faster access, a full-screen experience, and one-tap launch from your home screen.'
            }
          </DialogDescription>
        </DialogHeader>

        {isIOSDevice ? (
          <div className="py-4 text-center text-sm text-muted-foreground space-y-4">
            <p>1. Tap the <Share className="inline-block h-4 w-4 mx-1" /> button in your Safari toolbar.</p>
            <p>2. Scroll down and tap on 'Add to Home Screen' <Download className="inline-block h-4 w-4 mx-1" />.</p>
          </div>
        ) : (
             <div className="py-4 text-sm space-y-2">
                <p className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> Opens like a real app</p>
                <p className="flex items-center gap-2"><ArrowDown className="h-4 w-4 text-primary" /> Faster access from your device</p>
            </div>
        )}

        <DialogFooter className="sm:justify-center flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDismiss}>
            Not now
          </Button>
          {!isIOSDevice && deferredPrompt && (
            <Button onClick={onInstallClick}>
              <Download className="mr-2 h-4 w-4" /> Install App
            </Button>
          )}
           {isIOSDevice && (
            <Button onClick={() => setIsOpen(false)}>
              Got it
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
