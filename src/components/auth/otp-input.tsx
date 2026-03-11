"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";

interface OTPInputProps {
  email?: string;
  onSuccess?: () => void;
}

export function OTPInput({ email, onSuccess }: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasAutoResentRef = useRef(false);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Auto-resend verification email if redirected from sign-in
  useEffect(() => {
    if (email && !hasAutoResentRef.current) {
      hasAutoResentRef.current = true;

      // Small delay to ensure component is mounted
      setTimeout(async () => {
        try {
          const { error } = await authClient.sendVerificationEmail({
            email,
          });

          if (!error) {
            toast.success("Verification code sent!", {
              description: "Check your email for a new 6-digit code.",
            });
          }
        } catch (error) {
          // Silent fail - user can manually resend if needed
          console.error("Auto-resend failed:", error);
        }
      }, 500);
    }
  }, [email]);

  // Handle OTP change
  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are filled
    if (newOtp.every((digit) => digit !== "") && newOtp.length === 6) {
      handleVerify(newOtp.join(""));
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d{1,6}$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || "";
    }
    setOtp(newOtp);
    setError(null);

    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();

    // Auto-submit if 6 digits pasted
    if (pastedData.length === 6) {
      handleVerify(pastedData);
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP
  const handleVerify = async (otpValue?: string) => {
    const code = otpValue || otp.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    if (!email) {
      setError("Email is required for verification");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use Neon Auth's emailOtp.verifyEmail method
      const { data, error } = await authClient.emailOtp.verifyEmail({
        email,
        otp: code,
      });

      if (error) {
        setError(error.message || "Invalid verification code. Please try again.");
        // Shake animation on error
        setOtp(Array(6).fill(""));
        inputRefs.current[0]?.focus();
      } else {
        setIsVerified(true);
        toast.success("Email verified successfully!", {
          description: "Your account has been verified.",
        });
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || "Verification failed. Please try again.");
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (!canResend || resendCooldown > 0) return;

    if (!email) {
      setError("Email is required to resend code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use Neon Auth's sendVerificationEmail method
      const { error } = await authClient.sendVerificationEmail({
        email,
      });

      if (error) {
        setError(error.message || "Failed to resend code. Please try again.");
      } else {
        toast.success("Verification code sent!", {
          description: "Check your email for a new 6-digit code.",
        });

        setCanResend(false);
        setResendCooldown(60); // 60 second cooldown

        // Countdown timer
        const interval = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setCanResend(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerified) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 border-2 border-primary"
        >
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-2">Email Verified!</h3>
        <p className="text-gray-400 text-sm">Your account has been successfully verified.</p>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => window.location.href = "/dashboard"}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 transition-all"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* OTP Input Fields */}
      <div className="space-y-4">
        <div className="flex justify-center gap-3">
          {otp.map((digit, index) => (
            <motion.input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading || isVerified}
              className={`
                w-14 h-14 text-center text-2xl font-bold
                bg-white/5 border-2 rounded-xl
                text-white placeholder:text-gray-600
                transition-all duration-200
                focus:outline-none focus:ring-0
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  error
                    ? "border-red-500/50 bg-red-500/10"
                    : digit
                    ? "border-primary/50 bg-primary/10"
                    : "border-white/15 hover:border-white/25"
                }
                focus:border-primary focus:bg-primary/15
                focus:scale-105 focus:shadow-lg focus:shadow-primary/30
              `}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            />
          ))}
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-2 text-red-400 text-sm"
            >
              <XCircle className="w-4 h-4" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Instructions */}
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-400">
          Enter the 6-digit code sent to
        </p>
        {email && (
          <p className="text-sm font-medium text-primary">{email}</p>
        )}
      </div>

      {/* Resend Button */}
      <div className="text-center">
        <button
          onClick={handleResend}
          disabled={isLoading || !canResend || resendCooldown > 0}
          className="text-sm text-primary hover:text-primary/80 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : resendCooldown > 0 ? (
            <>
              <Mail className="w-4 h-4" />
              Resend code in {resendCooldown}s
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              Resend verification code
            </>
          )}
        </button>
      </div>

      {/* Manual Submit Button (fallback) */}
      <button
        onClick={() => handleVerify()}
        disabled={isLoading || otp.some((digit) => !digit) || isVerified}
        className="w-full py-3 px-6 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            Verify Email
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </div>
  );
}

