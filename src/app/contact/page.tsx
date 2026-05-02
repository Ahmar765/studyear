
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import ContactForm from "@/components/contact-form";

export default function ContactPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
          Have a question or need support? We're here to help.
        </p>
      </div>

      <div className="container mx-auto max-w-4xl grid md:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
                <CardDescription>Fill out the form and our team will get back to you as soon as possible.</CardDescription>
            </CardHeader>
            <CardContent>
                <ContactForm />
            </CardContent>
        </Card>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Response Expectations</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Our team aims to respond to all queries within 24-48 business hours. For urgent account or billing issues, please mark your enquiry appropriately.
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Business Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p><strong>Company:</strong> StudYear Ltd.</p>
                    <p><strong>Email:</strong> <Link href="mailto:contact@studyear.ai" className="text-primary hover:underline">contact@studyear.ai</Link></p>
                    <p><strong>Support:</strong> <Link href="mailto:support@studyear.ai" className="text-primary hover:underline">support@studyear.ai</Link></p>
                    <p><strong>Registered Address:</strong> 123 Learning Lane, London, UK, SW1A 0AA</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
