"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";

/**
 * Wrapper component that checks email verification status after sign-in
 * and redirects to verify-email page if email is not verified
 */
export function SignInWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const hasCheckedRef = useRef(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    // Wait for session to load
    if (isPending) return;

    // Prevent multiple redirects
    if (redirectingRef.current) return;

    // Only check once per session change
    if (hasCheckedRef.current && session?.user) return;

    if (session?.user) {
      hasCheckedRef.current = true;
      
      // Check if email is verified
      const emailVerified = session.user.emailVerified ?? false;
      const userEmail = session.user.email;

      // If email is not verified, redirect to verify-email page
      if (!emailVerified && userEmail) {
        redirectingRef.current = true;
        
        toast.info("Email verification required", {
          description: "Please verify your email to continue accessing your account.",
          duration: 4000,
        });
        
        // Small delay to show toast, then redirect
        setTimeout(() => {
          router.push(`/auth/verify-email?email=${encodeURIComponent(userEmail)}`);
        }, 500);
      }
    } else {
      // Reset check flag when user signs out
      hasCheckedRef.current = false;
      redirectingRef.current = false;
    }
  }, [session, isPending, router]);

  // Listen for successful sign-in via custom events or storage changes
  useEffect(() => {
    const checkSessionAfterSignIn = async () => {
      // Small delay to ensure session is updated after sign-in
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      try {
        const currentSession = await authClient.getSession();
        
        if (currentSession?.user && !redirectingRef.current) {
          const emailVerified = currentSession.user.emailVerified ?? false;
          const userEmail = currentSession.user.email;

          if (!emailVerified && userEmail && window.location.pathname === "/auth/sign-in") {
            redirectingRef.current = true;
            
            toast.info("Email verification required", {
              description: "Please verify your email to continue.",
            });
            
            router.push(`/auth/verify-email?email=${encodeURIComponent(userEmail)}`);
          }
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };

    // Listen for storage events (Neon Auth updates localStorage on sign-in)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes("neon-auth") || e.key?.includes("session") || e.key?.includes("auth")) {
        checkSessionAfterSignIn();
      }
    };

    // Listen for custom sign-in success events
    const handleSignInSuccess = () => {
      checkSessionAfterSignIn();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("neon-auth:sign-in", handleSignInSuccess);

    // Poll for session changes (fallback for cases where events don't fire)
    const interval = setInterval(() => {
      if (window.location.pathname === "/auth/sign-in" && !redirectingRef.current) {
        checkSessionAfterSignIn();
      }
    }, 3000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("neon-auth:sign-in", handleSignInSuccess);
      clearInterval(interval);
    };
  }, [router]);

  return <>{children}</>;
}

