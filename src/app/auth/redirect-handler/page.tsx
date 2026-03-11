"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Redirect handler that checks email verification status
 * before allowing access to the dashboard
 */
export default function RedirectHandler() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;

    if (!session?.user) {
      // No session, redirect to sign-in
      router.push("/auth/sign-in");
      return;
    }

    const emailVerified = session.user.emailVerified ?? false;
    const userEmail = session.user.email;

    if (!emailVerified && userEmail) {
      // Email not verified, redirect to verify-email
      router.push(`/auth/verify-email?email=${encodeURIComponent(userEmail)}`);
    } else {
      // Email verified, proceed to dashboard
      router.push("/dashboard");
    }
  }, [session, isPending, router]);

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Verifying access...</p>
      </motion.div>
    </div>
  );
}


