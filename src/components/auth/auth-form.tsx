"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "sign-up") {
        await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        });
        
        toast.success("Account created successfully!");
        
        // Sign in after signup
        await authClient.signIn.email({
          email,
          password,
        });
        
        router.push("/dashboard");
      } else {
        await authClient.signIn.email({
          email,
          password,
        });
        
        toast.success("Signed in successfully!");
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "sign-up" && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={8}
          className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-primary to-green-500 text-black font-semibold py-3 rounded-lg hover:shadow-lg hover:shadow-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {mode === "sign-up" ? "Create Account" : "Sign In"}
      </button>

      <div className="text-center text-sm text-gray-400">
        {mode === "sign-up" ? (
          <p>
            Already have an account?{" "}
            <a href="/auth/sign-in" className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        ) : (
          <p>
            Don't have an account?{" "}
            <a href="/auth/sign-up" className="text-primary hover:underline">
              Sign up
            </a>
          </p>
        )}
      </div>
    </form>
  );
}