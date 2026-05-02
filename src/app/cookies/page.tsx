
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function CookiesPolicyPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight">Cookies Policy</h1>
            <p className="mt-2 text-lg text-muted-foreground">
                Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
        </div>

        <div className="container mx-auto max-w-4xl space-y-6 text-sm text-muted-foreground">
            <p className="text-base">This Cookies Policy explains how StudYear ("we," "us," and "our") uses cookies and similar technologies to recognise you when you visit our website. It explains what these technologies are and why we use them, as well as your rights to control our use of them.</p>

            <Card>
                <CardHeader><CardTitle className="text-xl">What Are Cookies?</CardTitle></CardHeader>
                <CardContent>
                    <p>Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-xl">Why Do We Use Cookies?</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <p>We use cookies for several reasons. Some cookies are required for technical reasons in order for our Service to operate, and we refer to these as "essential" or "strictly necessary" cookies. Other cookies enable us to track and target the interests of our users to enhance the experience on our platform. We categorise them as follows:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Strictly Necessary Cookies:</strong> These are essential for you to browse the website and use its features, such as accessing secure areas of the site. This includes cookies that manage your session when you are logged in.</li>
                        <li><strong>Performance and Analytics Cookies:</strong> These cookies collect information about how you use our website, like which pages you visited and which links you clicked on. None of this information can be used to identify you. It is all aggregated and, therefore, anonymized. Their sole purpose is to improve website functions. This includes cookies from third-party analytics services such as Google Analytics.</li>
                        <li><strong>Functionality Cookies:</strong> These cookies allow our website to remember choices you have made in the past, like what language you prefer or your user name and password so you can automatically log in. This also includes storing your consent preferences for our cookie banner.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-xl">How Can You Control Cookies?</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                   <p>You have the right to decide whether to accept or reject cookies. When you first visit our site, you will be presented with a cookie banner that allows you to make your choices. Your preferences will be stored for 30 days.</p>
                   <p>If you are logged into a StudYear account, we will attempt to associate your consent preferences with your account to provide a consistent experience across your signed-in devices. Please note this is not always technically possible.</p>
                   <p>You can also set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website though your access to some functionality and areas may be restricted.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-xl">Changes to This Policy</CardTitle></CardHeader>
                <CardContent>
                    <p>We may update this Cookies Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal or regulatory reasons. Please therefore re-visit this Cookies Policy regularly to stay informed.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-xl">Contact Us</CardTitle></CardHeader>
                <CardContent>
                    <p>If you have any questions about our use of cookies, please contact us at <Link href="mailto:privacy@studyear.ai" className="text-primary underline">privacy@studyear.ai</Link>.</p>
                </CardContent>
            </Card>

        </div>
    </div>
  );
}
