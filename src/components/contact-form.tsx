'use client';

import { useEffect, useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { Loader } from 'lucide-react';
import {
  getPublicCommunicationsSettings,
  submitContactFormAction,
} from '@/server/actions/settings-actions';

export default function ContactForm() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [enquiryType, setEnquiryType] = useState('support');
  const [copy, setCopy] = useState({
    title: 'Message sent',
    description: 'Thank you for contacting us. We will get back to you shortly.',
  });

  useEffect(() => {
    void getPublicCommunicationsSettings().then((c) => {
      if (c.contactForm?.title) setCopy((prev) => ({ ...prev, title: c.contactForm!.title! }));
      if (c.contactForm?.description) {
        setCopy((prev) => ({ ...prev, description: c.contactForm!.description! }));
      }
    });
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitContactFormAction({
        fullName: String(formData.get('fullName') ?? ''),
        email: String(formData.get('email') ?? ''),
        enquiryType,
        message: String(formData.get('message') ?? ''),
      });
      if (result.success) {
        toast({
          title: copy.title,
          description: result.emailSent
            ? copy.description
            : `${copy.description} Your message was saved, but we could not send an email notification — our team will still see it in the admin inbox shortly.`,
        });
        if (!result.emailSent) {
          toast({
            variant: 'destructive',
            title: 'Email delivery issue',
            description:
              'Outbound mail is not configured on the server (MAIL_SMTP_* env vars). Ask your administrator to set SMTP and Admin → Communications → Contact email.',
          });
        }
        (e.target as HTMLFormElement).reset();
        setEnquiryType('support');
      } else {
        toast({ variant: 'destructive', title: 'Could not send', description: result.error });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="enquiryType" value={enquiryType} />
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" name="fullName" required disabled={isPending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input id="email" name="email" type="email" required disabled={isPending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="enquiryType">Enquiry Type</Label>
        <Select value={enquiryType} onValueChange={setEnquiryType} required disabled={isPending}>
          <SelectTrigger id="enquiryType">
            <SelectValue placeholder="Select a reason..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="support">General Support</SelectItem>
            <SelectItem value="billing">Billing & ACU Queries</SelectItem>
            <SelectItem value="feedback">Platform Feedback</SelectItem>
            <SelectItem value="partnership">Partnership / Business</SelectItem>
            <SelectItem value="privacy">Privacy / Data Request</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" required className="min-h-[120px]" disabled={isPending} />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="consent" required disabled={isPending} />
        <Label htmlFor="consent" className="text-xs text-muted-foreground">
          By submitting this form, you acknowledge you have read and agree to our{' '}
          <Link href="/privacy-policy" className="underline hover:text-primary">
            Privacy Policy
          </Link>
          .
        </Label>
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Message'
        )}
      </Button>
    </form>
  );
}
