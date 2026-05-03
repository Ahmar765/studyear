
// src/app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client-app";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { handleSocialSignIn, handleEmailLogin } from "@/server/actions/auth-actions";
import { Loader } from "lucide-react";


export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  
  useEffect(() => {
    if (user && !loading) {
        router.replace('/');
    }
  }, [user, loading, router]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
        const userCredential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
        const { sessionId } = await handleEmailLogin(
            userCredential.user.uid,
            userCredential.user.email,
        );
        await userCredential.user.getIdToken(true);
        if (sessionId) {
            sessionStorage.setItem('sessionId', sessionId);
        }
        // The useEffect above will handle the redirect
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Login Failed",
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
        const result = await signInWithPopup(getFirebaseAuth(), provider);
        const { newUser, sessionId } = await handleSocialSignIn(
            result.user.uid,
            result.user.email,
            result.user.displayName,
            result.user.photoURL,
        );
         if (sessionId) {
            sessionStorage.setItem('sessionId', sessionId);
        }
        if (newUser) {
            router.push('/profile-setup');
        }
        // Existing users will be redirected by the useEffect
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Google Sign-In Failed",
            description: error.message || "Could not sign in with Google.",
        });
    } finally {
        setIsGoogleSubmitting(false);
    }
  }

  // Hide the page content if we are loading or already have a user.
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
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" name="email" placeholder="m@example.com" required disabled={isSubmitting || isGoogleSubmitting} />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" prefetch={false} className="ml-auto inline-block text-sm underline">
                  Forgot your password?
                </Link>
              </div>
              <Input id="password" type="password" name="password" required disabled={isSubmitting || isGoogleSubmitting} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={isSubmitting || isGoogleSubmitting}>
                {isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </CardFooter>
        </form>

        <Separator className="my-4" />
        <CardContent>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting || isGoogleSubmitting}>
                {isGoogleSubmitting ? 'Please wait...' : 'Sign in with Google'}
            </Button>
            <div className="mt-4 text-center text-sm">
            Don't have an account?{" "}
            <Link href="/signup" className="underline">
                Sign up
            </Link>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
