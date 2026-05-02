
// src/app/signup/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { signup, handleSocialSignIn } from "@/server/actions/auth-actions";
import { UserCredential, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase/client-app";
import { Separator } from "@/components/ui/separator";
import { Loader } from "lucide-react";


function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return <Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create an account'}</Button>;
}

export default function SignupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  
  useEffect(() => {
    // We keep this to redirect logged-in users
    if (user && !loading) {
        router.push('/');
    }
  }, [user, loading, router]);


  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;

    try {
        const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
        const result = await signup(userCredential.user.uid, email, role);

        if (result.message === "Success") {
            if (result.sessionId) {
                sessionStorage.setItem('sessionId', result.sessionId);
            }
            toast({
                title: "Account Created",
                description: "You can now complete your profile.",
            });
            // All new users go to profile setup now. Admins will be redirected from there.
            router.push("/profile-setup");

        } else {
            toast({
                variant: "destructive",
                title: "Signup Failed",
                description: result.error,
            });
        }
    } catch(error: any) {
         toast({
            variant: "destructive",
            title: "Signup Failed",
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const { sessionId } = await handleSocialSignIn(result.user);
        if (sessionId) {
            sessionStorage.setItem('sessionId', sessionId);
        }
        toast({
            title: "Account Created",
            description: "Welcome! Please complete your profile.",
        });
        router.push('/profile-setup');
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Google Sign-Up Failed",
            description: error.message || "Could not sign up with Google.",
        });
    } finally {
        setIsGoogleSubmitting(false);
    }
  }


  if (loading || user) {
     return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Enter your information to create an account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="grid gap-4">
             <div className="grid gap-2">
                <Label htmlFor="role">I am a...</Label>
                <Select name="role" required defaultValue="STUDENT">
                    <SelectTrigger id="role" disabled={isSubmitting || isGoogleSubmitting}>
                        <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="STUDENT">Student</SelectItem>
                        <SelectItem value="PARENT">Parent</SelectItem>
                        <SelectItem value="PRIVATE_TUTOR">Private Tutor</SelectItem>
                        <SelectItem value="SCHOOL_TUTOR">Teacher (at a School)</SelectItem>
                        <SelectItem value="SCHOOL_ADMIN">School Administrator</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>              
              <Input id="email" type="email" name="email" placeholder="m@example.com" required disabled={isSubmitting || isGoogleSubmitting} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" name="password" required disabled={isSubmitting || isGoogleSubmitting}/>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <SubmitButton isSubmitting={isSubmitting} />
          </CardFooter>
        </form>

        <Separator className="my-4" />
        <CardContent className="flex flex-col gap-4">
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting || isGoogleSubmitting}>
                 {isGoogleSubmitting ? 'Please wait...' : 'Sign up with Google'}
            </Button>
            <div className="text-center text-sm">
                Already have an account?{" "}
                <Link href="/login" className="underline">
                    Login
                </Link>
             </div>
        </CardContent>
      </Card>
    </div>
  );
}
