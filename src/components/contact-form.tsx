
'use client';

import { useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { Loader } from "lucide-react";

export default function ContactForm() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(() => {
        return new Promise(resolve => setTimeout(() => {
             toast({
                title: "Message Sent!",
                description: "Thank you for contacting us. We will get back to you shortly.",
            });
            (e.target as HTMLFormElement).reset();
            resolve(undefined);
        }, 1000));
    });
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" name="fullName" required disabled={isPending}/>
        </div>
        <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" name="email" type="email" required disabled={isPending}/>
        </div>
        <div className="space-y-2">
            <Label htmlFor="enquiryType">Enquiry Type</Label>
            <Select name="enquiryType" required disabled={isPending}>
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
            <Textarea id="message" name="message" required className="min-h-[120px]" disabled={isPending}/>
        </div>
        <div className="flex items-center space-x-2">
            <Checkbox id="consent" required disabled={isPending}/>
            <Label htmlFor="consent" className="text-xs text-muted-foreground">
                By submitting this form, you acknowledge you have read and agree to our <Link href="/privacy-policy" className="underline hover:text-primary">Privacy Policy</Link>.
            </Label>
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <><Loader className="mr-2 h-4 w-4 animate-spin"/> Sending...</> : 'Send Message'}
        </Button>
    </form>
  )
}
