"use client";

//import { AuthView } from "@neondatabase/neon-js/auth/react";
import Link from "next/link";
import { Shield, Lock, Zap, Check, Mail, ArrowRight, Sparkles } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { OTPInput } from "@/components/auth/otp-input";
import { authClient } from "@/lib/auth/client";
import { SignInWrapper } from "@/components/auth/sign-in-wrapper";
import { EmailVerificationInterceptor } from "@/components/auth/email-verification-interceptor";

import { AuthForm } from "@/components/auth/auth-form";

// Line pattern background component (consistent with landing page)
function LinePatternBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-[700px] h-[700px] bg-cyan-500/10 rounded-full blur-[180px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-purple-500/5 rounded-full blur-[200px]" />

      {/* Line patterns - diagonal */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="diagonal-lines" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M-10,10 l20,-20 M0,40 l40,-40 M30,50 l20,-20" stroke="rgba(0, 255, 65, 0.5)" strokeWidth="0.5" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diagonal-lines)" />
      </svg>

      {/* Horizontal scan lines */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 255, 65, 0.1) 2px,
            rgba(0, 255, 65, 0.1) 4px
          )`,
        }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 65, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 65, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Animated scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        initial={{ top: "0%" }}
        animate={{ top: "100%" }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

export default function AuthPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const path = params.path as string;
  const email = searchParams.get("email") || undefined;

  const isSignUp = path === "sign-up";
  const isSignIn = path === "sign-in";
  const isVerifyEmail = path === "verify-email";

  const signInFeatures = [
    "Access your threat intelligence dashboard",
    "View real-time security analytics",
    "Generate OSINT reports instantly",
    "Track entities and relationships",
  ];

  const signUpFeatures = [
    "200+ OSINT platforms",
    "AI-powered analysis",
    "Real-time threat tracking",
    "Enterprise-grade security",
  ];

  return (
    <div className="min-h-screen bg-[#030303] relative overflow-hidden">
      {/* Animated background with line patterns */}
      <LinePatternBackground />

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex items-center justify-between p-6 md:p-8"
      >
        <Link href="/" className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-all duration-300 border border-primary/30 shadow-[0_0_20px_rgba(0,255,65,0.3)]"
          >
            <Shield className="w-6 h-6 text-primary" />
          </motion.div>
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight text-white">
              SEPTO
            </span>
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em]">
              Threat Intelligence
            </span>
          </div>
        </Link>
      </motion.header>

      {/* Main content */}
      <main className="relative z-10 container mx-auto flex grow flex-col items-center justify-center gap-8 px-4 py-8 md:py-12 min-h-[calc(100vh-100px)]">
        {/* Sign-up: Two column layout */}
        {isSignUp ? (
          <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left side - Value proposition */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden lg:block space-y-6"
            >
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-white leading-tight">
                  Start Your Intelligence
                  <br />
                  <span className="bg-gradient-to-r from-primary via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    Journey Today
                  </span>
                </h2>
                <p className="text-lg text-gray-400 leading-relaxed">
                  Join thousands of security researchers using SEPTO to uncover threats, analyze data, and protect their organizations.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                {signUpFeatures.map((feature, i) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 flex-shrink-0">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-gray-300">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="text-xs text-gray-500">256-bit Encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-xs text-gray-500">SOC 2 Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-xs text-gray-500">99.9% Uptime</span>
                </div>
              </div>
            </motion.div>

            {/* Right side - Auth form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="w-full flex justify-center lg:justify-end"
            >
              <div className="relative w-full max-w-md">
                {/* Glow effect behind card */}
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 via-transparent to-cyan-500/20 rounded-3xl blur-3xl opacity-60" />

                {/* Auth card wrapper with glass effect */}
                <div className="relative glass-panel rounded-2xl p-8 md:p-10 border border-white/10 backdrop-blur-xl shadow-2xl">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary/30 rounded-tl-2xl" />
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-primary/30 rounded-br-2xl" />

                  {/* Title */}
                  <div className="text-center mb-8">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4"
                    >
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-sm text-primary font-medium">Free 14-day trial</span>
                    </motion.div>
                    <motion.h1
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-3xl font-bold text-white mb-3"
                    >
                      Create Your Account
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-gray-400 text-sm leading-relaxed"
                    >
                      Join SEPTO and start gathering intelligence today
                    </motion.p>
                  </div>

                  {/* Neon Auth View component with email verification check and error interception */}
                  <div className="neon-auth-container">
                    <AuthForm mode={isSignUp ? "sign-up" : "sign-in"} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : isSignIn ? (
          /* Sign-in: Two column layout with value proposition */
          <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left side - Value proposition */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden lg:block space-y-6"
            >
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-white leading-tight">
                  Welcome Back,
                  <br />
                  <span className="bg-gradient-to-r from-primary via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    Operator
                  </span>
                </h2>
                <p className="text-lg text-gray-400 leading-relaxed">
                  Access your threat intelligence dashboard and continue your security research.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                {signInFeatures.map((feature, i) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 flex-shrink-0">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-gray-300">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* Trust badges */}
              <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="text-xs text-gray-500">256-bit Encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-xs text-gray-500">SOC 2 Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-xs text-gray-500">99.9% Uptime</span>
                </div>
              </div>
            </motion.div>

            {/* Right side - Auth form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="w-full flex justify-center lg:justify-start"
            >
              <div className="relative w-full max-w-md">
                {/* Glow effect behind card */}
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 via-transparent to-cyan-500/20 rounded-3xl blur-3xl opacity-60" />

                {/* Auth card wrapper with glass effect */}
                <div className="relative glass-panel rounded-2xl p-8 md:p-10 border border-white/10 backdrop-blur-xl shadow-2xl">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary/30 rounded-tl-2xl" />
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-primary/30 rounded-br-2xl" />

                  {/* Title */}
                  <div className="text-center mb-8">
                    <motion.h1
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-3xl font-bold text-white mb-3"
                    >
                      Welcome Back
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-gray-400 text-sm leading-relaxed"
                    >
                      Sign in to access your threat intelligence dashboard
                    </motion.p>
                  </div>

                  {/* Neon Auth View component - wrapped with verification checks */}
                  <div className="neon-auth-container">
                    <AuthForm mode={isSignUp ? "sign-up" : "sign-in"} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          /* Other pages (verify-email, forgot-password, reset-password): Centered form */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full flex justify-center"
          >
            <div className="relative w-full max-w-md">
              {/* Glow effect behind card */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 via-transparent to-cyan-500/20 rounded-3xl blur-3xl opacity-60" />

              {/* Auth card wrapper with glass effect */}
              <div className="relative glass-panel rounded-2xl p-8 md:p-10 border border-white/10 backdrop-blur-xl shadow-2xl">
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary/30 rounded-tl-2xl" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-primary/30 rounded-br-2xl" />

                {/* Title */}
                <div className="text-center mb-8">
                  {isVerifyEmail && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 border border-primary/30"
                    >
                      <Mail className="w-8 h-8 text-primary" />
                    </motion.div>
                  )}
                  <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl font-bold text-white mb-3"
                  >
                    {path === "forgot-password" && "Recover Access"}
                    {path === "reset-password" && "Reset Password"}
                    {path === "verify-email" && "Verify Your Email"}
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-400 text-sm leading-relaxed"
                  >
                    {path === "forgot-password" && "We'll send you a recovery link via email"}
                    {path === "reset-password" && "Enter your new secure password"}
                    {path === "verify-email" && "Enter the OTP code sent to your email address to verify your account"}
                  </motion.p>
                </div>

                {/* OTP Input for verify-email, AuthView for other paths */}
                {isVerifyEmail ? (
                  <OTPInput
                    email={email}
                    onSuccess={() => {
                      // Redirect to dashboard after successful verification
                      setTimeout(() => {
                        window.location.href = "/dashboard";
                      }, 2000);
                    }}
                  />
                ) : (
                  <div className="neon-auth-container">
                    <AuthForm mode={isSignUp ? "sign-up" : "sign-in"} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Security badges (bottom, mobile-friendly) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500 mt-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
            <span>256-bit Encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
            <span>SOC 2 Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
            <span>GDPR Ready</span>
          </div>
        </motion.div>
      </main>

      {/* Custom CSS for Neon Auth components */}
      <style jsx global>{`
        /* Neon Auth Container Styling */
        .neon-auth-container {
          --neon-auth-primary: #00ff41;
          --neon-auth-primary-foreground: #000000;
          --neon-auth-background: transparent;
          --neon-auth-foreground: #ffffff;
          --neon-auth-muted: rgba(255, 255, 255, 0.06);
          --neon-auth-muted-foreground: #888888;
          --neon-auth-border: rgba(255, 255, 255, 0.1);
          --neon-auth-input: rgba(255, 255, 255, 0.03);
          --neon-auth-ring: rgba(0, 255, 65, 0.5);
          --neon-auth-radius: 0.75rem;
        }

        /* Form inputs */
        .neon-auth-container input[type="text"],
        .neon-auth-container input[type="email"],
        .neon-auth-container input[type="password"],
        .neon-auth-container input[type="number"],
        .neon-auth-container input[type="tel"] {
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: white !important;
          border-radius: 0.75rem !important;
          padding: 0.75rem 1rem !important;
          font-size: 0.9375rem !important;
          transition: all 0.2s ease !important;
          width: 100% !important;
        }

        /* OTP input fields specifically - Enhanced for visibility */
        .neon-auth-container input[type="text"][maxlength="1"],
        .neon-auth-container input[type="number"][maxlength="1"],
        .neon-auth-container input[type="tel"][maxlength="1"],
        .neon-auth-container input[type="text"][maxlength="6"],
        .neon-auth-container input[type="number"][maxlength="6"],
        .neon-auth-container input[type="tel"][maxlength="6"],
        .neon-auth-container input[inputmode="numeric"],
        .neon-auth-container input[pattern="[0-9]*"] {
          text-align: center !important;
          font-size: 1.75rem !important;
          font-weight: 700 !important;
          letter-spacing: 0.15em !important;
          width: 3.5rem !important;
          height: 3.5rem !important;
          padding: 0 !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 2px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 0.875rem !important;
          color: white !important;
          transition: all 0.2s ease !important;
          display: inline-block !important;
          margin: 0 0.25rem !important;
        }

        .neon-auth-container input[type="text"][maxlength="1"]:hover,
        .neon-auth-container input[type="number"][maxlength="1"]:hover,
        .neon-auth-container input[type="tel"][maxlength="1"]:hover {
          border-color: rgba(0, 255, 65, 0.4) !important;
          background: rgba(0, 255, 65, 0.1) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 12px rgba(0, 255, 65, 0.2) !important;
        }

        .neon-auth-container input[type="text"][maxlength="1"]:focus,
        .neon-auth-container input[type="number"][maxlength="1"]:focus,
        .neon-auth-container input[type="tel"][maxlength="1"]:focus {
          outline: none !important;
          border-color: #00ff41 !important;
          background: rgba(0, 255, 65, 0.15) !important;
          box-shadow: 0 0 0 4px rgba(0, 255, 65, 0.2), 0 4px 20px rgba(0, 255, 65, 0.3) !important;
          transform: scale(1.05) !important;
        }

        .neon-auth-container input::placeholder {
          color: rgba(255, 255, 255, 0.4) !important;
        }

        .neon-auth-container input:hover {
          border-color: rgba(255, 255, 255, 0.15) !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }

        .neon-auth-container input:focus {
          outline: none !important;
          border-color: rgba(0, 255, 65, 0.5) !important;
          box-shadow: 0 0 0 3px rgba(0, 255, 65, 0.1) !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }

        /* Labels */
        .neon-auth-container label {
          color: #888888 !important;
          font-size: 0.875rem !important;
          font-weight: 500 !important;
          margin-bottom: 0.5rem !important;
          display: block !important;
        }

        /* Submit button (primary CTA) */
        .neon-auth-container button[type="submit"] {
          background: linear-gradient(135deg, #00ff41 0%, #00cc34 100%) !important;
          color: black !important;
          font-weight: 600 !important;
          border-radius: 0.75rem !important;
          padding: 0.875rem 1.5rem !important;
          width: 100% !important;
          border: none !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.3) !important;
          font-size: 0.9375rem !important;
          margin-top: 1.5rem !important;
        }

        .neon-auth-container button[type="submit"]:hover {
          background: linear-gradient(135deg, #00cc34 0%, #00ff41 100%) !important;
          box-shadow: 0 0 30px rgba(0, 255, 65, 0.5) !important;
          transform: translateY(-1px) !important;
        }

        .neon-auth-container button[type="submit"]:active {
          transform: translateY(0) !important;
        }

        .neon-auth-container button[type="submit"]:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
          transform: none !important;
        }

        /* Social login buttons */
        .neon-auth-container button:not([type="submit"]) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: white !important;
          border-radius: 0.75rem !important;
          padding: 0.75rem 1rem !important;
          font-size: 0.9375rem !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0.75rem !important;
          margin-top: 0.5rem !important;
        }

        .neon-auth-container button:not([type="submit"]):hover {
          background: rgba(255, 255, 255, 0.1) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
          transform: translateY(-1px) !important;
        }

        .neon-auth-container button:not([type="submit"]):active {
          transform: translateY(0) !important;
        }

        /* Links */
        .neon-auth-container a {
          color: #00ff41 !important;
          text-decoration: none !important;
          font-weight: 500 !important;
          transition: color 0.2s ease !important;
        }

        .neon-auth-container a:hover {
          color: #00cc34 !important;
          text-decoration: underline !important;
        }

        /* Form groups */
        .neon-auth-container form > div {
          margin-bottom: 1.25rem !important;
        }

        /* Section headers */
        .neon-auth-container h2,
        .neon-auth-container h3 {
          color: white !important;
          font-weight: 600 !important;
          margin-bottom: 0.5rem !important;
        }

        .neon-auth-container p {
          color: rgba(255, 255, 255, 0.7) !important;
          font-size: 0.875rem !important;
          margin-bottom: 1rem !important;
        }

        /* Error messages */
        .neon-auth-container [role="alert"],
        .neon-auth-container .error {
          color: #ff3b3b !important;
          font-size: 0.875rem !important;
          margin-top: 0.5rem !important;
          display: block !important;
        }

        /* Special handling for email verification errors */
        .neon-auth-container [role="alert"]:has-text("email not verified"),
        .neon-auth-container [role="alert"]:has-text("Email not verified"),
        .neon-auth-container [role="alert"]:has-text("email verification"),
        .neon-auth-container .error:has-text("email not verified"),
        .neon-auth-container .error:has-text("Email not verified") {
          background: rgba(255, 59, 59, 0.1) !important;
          border: 1px solid rgba(255, 59, 59, 0.3) !important;
          border-radius: 0.75rem !important;
          padding: 1rem !important;
          margin-top: 1rem !important;
        }

        /* Add verify email link to error messages */
        .neon-auth-container [role="alert"]:has-text("email not verified")::after,
        .neon-auth-container [role="alert"]:has-text("Email not verified")::after {
          content: " Click here to verify your email." !important;
          display: block !important;
          margin-top: 0.5rem !important;
        }

        .neon-auth-container [role="alert"] a,
        .neon-auth-container .error a {
          color: #00ff41 !important;
          text-decoration: underline !important;
          font-weight: 600 !important;
          margin-left: 0.5rem !important;
        }

        /* Ensure password input has right padding to make room for icon */
        .neon-auth-container input[type="password"] {
          padding-right: 3rem !important;
        }

        /* Password field container - make it relative for absolute positioning of button */
        .neon-auth-container form > div,
        .neon-auth-container > div > form > div {
          position: relative !important;
        }

        /* Password toggle button - position it absolutely on the right */
        /* Target button that comes after password input or is in same container */
        .neon-auth-container button[aria-label*="password"],
        .neon-auth-container button[aria-label*="Password"],
        .neon-auth-container button[aria-label*="show"],
        .neon-auth-container button[aria-label*="hide"],
        .neon-auth-container button[aria-label*="toggle"],
        .neon-auth-container input[type="password"] ~ button,
        .neon-auth-container input[type="password"] + button {
          background: transparent !important;
          border: none !important;
          color: rgba(255, 255, 255, 0.6) !important;
          padding: 0.5rem !important;
          cursor: pointer !important;
          transition: color 0.2s ease !important;
          position: absolute !important;
          right: 0.5rem !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          z-index: 10 !important;
          width: 2rem !important;
          height: 2rem !important;
          min-width: 2rem !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 !important;
          pointer-events: auto !important;
        }

        .neon-auth-container button[aria-label*="password"]:hover,
        .neon-auth-container button[aria-label*="Password"]:hover,
        .neon-auth-container button[aria-label*="show"]:hover,
        .neon-auth-container button[aria-label*="hide"]:hover,
        .neon-auth-container input[type="password"] ~ button:hover,
        .neon-auth-container input[type="password"] + button:hover {
          color: white !important;
        }

        /* Ensure the button doesn't interfere with input */
        .neon-auth-container button[aria-label*="password"]:focus,
        .neon-auth-container button[aria-label*="Password"]:focus {
          outline: none !important;
        }
        
        /* Make sure password input container allows absolute positioning */
        .neon-auth-container form > div:has(input[type="password"]),
        .neon-auth-container > div > form > div:has(input[type="password"]) {
          position: relative !important;
        }

        /* Form field wrapper improvements */
        .neon-auth-container > div > form > div,
        .neon-auth-container form > div {
          position: relative !important;
        }

        /* Specific styling for password field container */
        .neon-auth-container div:has(input[type="password"]) {
          position: relative !important;
        }

        /* Ensure password field group has relative positioning */
        .neon-auth-container label + div,
        .neon-auth-container div[class*="field"],
        .neon-auth-container div[class*="input"] {
          position: relative !important;
        }

        /* Social button icons */
        .neon-auth-container button svg {
          width: 1.25rem !important;
          height: 1.25rem !important;
        }

        /* Improve spacing and layout */
        .neon-auth-container form {
          display: flex !important;
          flex-direction: column !important;
          gap: 1rem !important;
        }

        /* OTP container styling - Enhanced for premium UX */
        .neon-auth-container [class*="otp"],
        .neon-auth-container [class*="OTP"],
        .neon-auth-container [class*="Otp"],
        .neon-auth-container div:has(input[maxlength="1"]),
        .neon-auth-container div:has(input[inputmode="numeric"]),
        .neon-auth-container form:has(input[maxlength="1"]) > div,
        .neon-auth-container > div > form > div:has(input[maxlength="1"]) {
          display: flex !important;
          gap: 0.75rem !important;
          justify-content: center !important;
          align-items: center !important;
          margin: 2rem 0 !important;
          padding: 1rem !important;
          flex-wrap: wrap !important;
        }

        /* OTP input group wrapper */
        .neon-auth-container form > div:has(input[maxlength="1"]),
        .neon-auth-container > div > form > div:has(input[maxlength="1"]) {
          background: rgba(0, 255, 65, 0.03) !important;
          border: 1px solid rgba(0, 255, 65, 0.1) !important;
          border-radius: 1rem !important;
          padding: 1.5rem !important;
          margin: 1.5rem 0 !important;
        }

        /* Ensure OTP inputs are visible and properly styled */
        .neon-auth-container input[maxlength="1"],
        .neon-auth-container input[maxlength="6"],
        .neon-auth-container input[inputmode="numeric"] {
          min-width: 3.5rem !important;
          min-height: 3.5rem !important;
          max-width: 3.5rem !important;
          max-height: 3.5rem !important;
        }

        /* OTP label styling */
        .neon-auth-container label:has(+ div input[maxlength="1"]),
        .neon-auth-container label:has(+ input[maxlength="1"]) {
          text-align: center !important;
          width: 100% !important;
          margin-bottom: 1rem !important;
          font-size: 0.9375rem !important;
          color: rgba(255, 255, 255, 0.8) !important;
        }

        /* OTP error message styling */
        .neon-auth-container [role="alert"]:has(+ div input[maxlength="1"]),
        .neon-auth-container div:has(input[maxlength="1"]) + [role="alert"] {
          text-align: center !important;
          margin-top: 1rem !important;
        }

        /* Resend button styling */
        .neon-auth-container button[type="button"]:not([aria-label*="password"]) {
          background: transparent !important;
          border: none !important;
          color: #00ff41 !important;
          font-weight: 500 !important;
          text-decoration: underline !important;
          cursor: pointer !important;
          padding: 0.5rem !important;
          font-size: 0.875rem !important;
        }

        .neon-auth-container button[type="button"]:not([aria-label*="password"]):hover {
          color: #00cc34 !important;
        }

        /* Additional OTP-specific enhancements */
        /* Target any div containing multiple single-character inputs (OTP pattern) */
        .neon-auth-container div:has(input[maxlength="1"]):has(input[maxlength="1"]:nth-of-type(2)),
        .neon-auth-container div:has(input[maxlength="1"]):has(input[maxlength="1"]:nth-of-type(3)),
        .neon-auth-container div:has(input[maxlength="1"]):has(input[maxlength="1"]:nth-of-type(4)),
        .neon-auth-container div:has(input[maxlength="1"]):has(input[maxlength="1"]:nth-of-type(5)),
        .neon-auth-container div:has(input[maxlength="1"]):has(input[maxlength="1"]:nth-of-type(6)) {
          display: flex !important;
          gap: 0.75rem !important;
          justify-content: center !important;
          align-items: center !important;
          flex-wrap: nowrap !important;
          margin: 2rem auto !important;
          padding: 1.5rem !important;
          background: rgba(0, 255, 65, 0.03) !important;
          border: 1px solid rgba(0, 255, 65, 0.15) !important;
          border-radius: 1.25rem !important;
          backdrop-filter: blur(10px) !important;
        }

        /* OTP input filled state */
        .neon-auth-container input[maxlength="1"]:not(:placeholder-shown),
        .neon-auth-container input[maxlength="1"]:valid {
          border-color: rgba(0, 255, 65, 0.6) !important;
          background: rgba(0, 255, 65, 0.1) !important;
        }

        /* OTP input error state */
        .neon-auth-container input[maxlength="1"]:invalid:not(:placeholder-shown) {
          border-color: #ff3b3b !important;
          background: rgba(255, 59, 59, 0.1) !important;
          animation: shake 0.3s ease-in-out !important;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        /* OTP success state (all fields filled) */
        .neon-auth-container div:has(input[maxlength="1"]:not(:placeholder-shown):nth-of-type(6)) {
          border-color: rgba(0, 255, 65, 0.4) !important;
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.2) !important;
        }

        /* Resend OTP button styling */
        .neon-auth-container button[type="button"]:not([aria-label*="password"]),
        .neon-auth-container a[href*="resend"],
        .neon-auth-container a[href*="Resend"] {
          background: transparent !important;
          border: 1px solid rgba(0, 255, 65, 0.3) !important;
          color: #00ff41 !important;
          padding: 0.75rem 1.5rem !important;
          border-radius: 0.75rem !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
          margin-top: 1rem !important;
          display: inline-block !important;
        }

        .neon-auth-container button[type="button"]:not([aria-label*="password"]):hover,
        .neon-auth-container a[href*="resend"]:hover,
        .neon-auth-container a[href*="Resend"]:hover {
          background: rgba(0, 255, 65, 0.1) !important;
          border-color: #00ff41 !important;
          transform: translateY(-1px) !important;
        }

        /* Ensure OTP form is visible */
        .neon-auth-container form:has(input[maxlength="1"]) {
          display: block !important;
          width: 100% !important;
        }

        /* OTP instruction text */
        .neon-auth-container p {
          text-align: center !important;
          color: rgba(255, 255, 255, 0.7) !important;
          margin-bottom: 1.5rem !important;
          font-size: 0.875rem !important;
        }

        /* Make sure all OTP-related elements are visible */
        .neon-auth-container * {
          visibility: visible !important;
        }

        /* OTP input container - ensure it's displayed */
        .neon-auth-container > div > form,
        .neon-auth-container form {
          display: flex !important;
          flex-direction: column !important;
          width: 100% !important;
        }

        /* Specific targeting for Neon Auth OTP components */
        .neon-auth-container [data-testid*="otp"],
        .neon-auth-container [data-testid*="OTP"],
        .neon-auth-container [aria-label*="otp"],
        .neon-auth-container [aria-label*="OTP"] {
          display: flex !important;
          gap: 0.75rem !important;
          justify-content: center !important;
          margin: 2rem 0 !important;
        }
      `}</style>
    </div>
  );
}
