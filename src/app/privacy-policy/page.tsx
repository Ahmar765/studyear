
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8">
        <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="mt-2 text-lg text-muted-foreground">
                Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
        </div>

        <div className="container mx-auto max-w-4xl space-y-6 text-sm text-muted-foreground">
            <p className="text-base">StudYear ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered academic platform (the "Service").</p>

            <Card>
                <CardHeader><CardTitle className="text-xl">1. Information We Collect</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <p>We collect information that is essential for providing and improving our Service. This includes:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Account & Profile Data:</strong> When you register, we collect your name, email, and selected role (e.g., student, parent). To personalize the Service, we also ask for profile information such as your study level and subjects.</li>
                        <li><strong>Content You Provide (AI Inputs):</strong> We collect the content you submit for processing by our AI tools. This includes exam questions, written answers for feedback, topics for summarization, and queries to our AI tutor.</li>
                        <li><strong>Usage & Transactional Data:</strong> We log your interactions with the Service, including the features you use, AI requests made, and AI Credit Unit (ACU) transactions. This is essential for billing, fraud prevention, and service improvement.</li>
                        <li><strong>Payment Data:</strong> When you purchase ACUs, your payment details are processed directly by our payment processor, Stripe. We do not store your full credit card information on our servers.</li>
                        <li><strong>Technical Data:</strong> We automatically collect information such as your IP address, browser type, and device information to maintain security and analyse usage trends.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-xl">2. How We Use Your Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <p>Your information is used to:</p>
                     <ul className="list-disc pl-5 space-y-2">
                        <li>Create and manage your account and deliver the core functionality of the Service.</li>
                        <li>Process your payments for ACU top-ups via Stripe.</li>
                        <li>Provide the AI-powered services you request by sending your inputs to our AI service providers (e.g., Google, OpenAI).</li>
                        <li>Personalize your experience by generating recommendations and adapting your study plans based on your progress.</li>
                        <li>Monitor and audit ACU consumption for accurate billing and to maintain the integrity of your wallet.</li>
                        <li>Analyse usage to improve our services, identify popular features, and fix issues.</li>
                        <li>Communicate with you regarding your account, support requests, and service updates.</li>
                    </ul>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle className="text-xl">3. Data Sharing and AI Processing</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <p>We do not sell your personal data. We may share information in the following limited circumstances:</p>
                     <ul className="list-disc pl-5 space-y-2">
                        <li><strong>With AI Service Providers:</strong> To provide our AI features, we send the content you submit (e.g., your essay text) to our third-party AI providers (like Google or OpenAI). We have data processing agreements in place, and these providers are prohibited from using your content to train their models.</li>
                        <li><strong>With Service Providers:</strong> We use third-party services for payment processing (Stripe) and cloud hosting (Firebase). We only share the information necessary for them to perform their services.</li>
                        <li><strong>For Legal Reasons:</strong> We may disclose your information if required by law or to protect the rights, property, or safety of our company, our users, or others.</li>
                    </ul>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle className="text-xl">4. Data Retention and Security</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                     <p>We retain your personal data for as long as your account is active and for a reasonable period thereafter to comply with our legal obligations (e.g., for financial auditing). We will retain AI usage logs and transaction data for our records.</p>
                     <p>We employ reasonable technical and organisational security measures, such as encryption and access controls, to protect your data. However, no method of transmission over the Internet is 100% secure.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-xl">5. Your Rights and Choices</CardTitle></CardHeader>
                <CardContent>
                    <p>You have rights over your personal data. You can access and update your profile information at any time through your account settings. You also have the right to request the deletion of your account and associated personal data, subject to our data retention policies for legal and operational compliance. For any such requests, please contact us.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-xl">6. Contact Us</CardTitle></CardHeader>
                <CardContent>
                    <p>If you have any questions or comments about this Privacy Policy, please contact us at: <Link href="mailto:privacy@studyear.ai" className="text-primary underline">privacy@studyear.ai</Link>.</p>
                </CardContent>
            </Card>

        </div>
    </div>
  );
}
