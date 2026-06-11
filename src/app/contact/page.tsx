
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import ContactForm from "@/components/contact-form";
import { getPublicCommunicationsSettings } from "@/server/actions/settings-actions";

export default async function ContactPage() {
  const communications = await getPublicCommunicationsSettings();
  const business = communications?.businessDetails;
  const companyName = business?.companyName?.trim() || "StudYear Ltd.";
  const registeredAddress =
    business?.registeredAddress?.trim() || "123 Learning Lane, London, UK, SW1A 0AA";
  const contactEmail = communications?.contactEmail?.trim() || "contact@studyear.com";
  const supportEmail = communications?.supportEmail?.trim() || "support@studyear.com";

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
          Have a question or need support? We&apos;re here to help.
        </p>
      </div>

      <div className="container mx-auto max-w-4xl grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Send us a Message</CardTitle>
            <CardDescription>
              Fill out the form — a copy is delivered to{" "}
              <a href={`mailto:${contactEmail}`} className="text-primary underline">
                {contactEmail}
              </a>{" "}
              when email is configured, and always saved in our admin inbox.
            </CardDescription>
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
                Our team aims to respond to all queries within 24-48 business hours. For urgent
                account or billing issues, please mark your enquiry appropriately.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Company:</strong> {companyName}
              </p>
              <p>
                <strong>Email:</strong>{" "}
                <Link href={`mailto:${contactEmail}`} className="text-primary hover:underline">
                  {contactEmail}
                </Link>
              </p>
              <p>
                <strong>Support:</strong>{" "}
                <Link href={`mailto:${supportEmail}`} className="text-primary hover:underline">
                  {supportEmail}
                </Link>
              </p>
              <p>
                <strong>Registered Address:</strong> {registeredAddress}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
