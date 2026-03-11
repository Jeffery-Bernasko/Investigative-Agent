"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Component that intercepts "Email not verified" errors from Neon Auth
 * and redirects users to the verification page
 */
export function EmailVerificationInterceptor({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasInterceptedRef = useRef(false);

  useEffect(() => {
    // Function to check for error messages and intercept
    const interceptErrors = () => {
      // Look for error messages in the DOM with multiple selectors
      const errorSelectors = [
        '[role="alert"]',
        '.error',
        '[class*="error"]',
        '[class*="Error"]',
        '[data-error]',
        '[aria-live]',
        'p[class*="text-red"]',
        'div[class*="error"]',
        'span[class*="error"]',
      ];

      errorSelectors.forEach((selector) => {
        const errorElements = document.querySelectorAll(selector);

        errorElements.forEach((element) => {
          const errorText = element.textContent?.toLowerCase() || "";
          
          // Check if error mentions email verification
          if (
            (errorText.includes("email not verified") ||
             errorText.includes("email verification") ||
             errorText.includes("verify your email") ||
             errorText.includes("unverified") ||
             errorText.includes("email is not verified") ||
             errorText.includes("please verify")) &&
            !hasInterceptedRef.current
          ) {
            hasInterceptedRef.current = true;

            // Try to extract email from the form (multiple ways)
            const emailInput = document.querySelector<HTMLInputElement>(
              'input[type="email"], input[name="email"], input[id*="email"], input[placeholder*="email" i], input[placeholder*="m@example.com"]'
            );
            const email = emailInput?.value || "";

            // Add a "Verify Email" button to the error message
            const verifyButton = document.createElement("button");
            verifyButton.textContent = "Verify Email Now";
            verifyButton.className = "mt-3 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 transition-all text-sm";
            verifyButton.style.cssText = "margin-top: 0.75rem; padding: 0.5rem 1rem; background: #00ff41; color: black; font-weight: 600; border-radius: 0.5rem; cursor: pointer; border: none;";
            verifyButton.onclick = (e) => {
              e.preventDefault();
              if (email) {
                router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
              } else {
                router.push("/auth/verify-email");
              }
            };
            
            // Append button to error element if it doesn't already have one
            if (!element.querySelector('button[class*="verify"]')) {
              element.appendChild(verifyButton);
            }

            if (email) {
              toast.info("Email verification required", {
                description: "Please verify your email to continue. Redirecting to verification page...",
                duration: 3000,
                action: {
                  label: "Verify Now",
                  onClick: () => {
                    router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
                  },
                },
              });

              // Auto-redirect after a short delay
              setTimeout(() => {
                router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
              }, 2000);
            } else {
              // If we can't get email, still redirect and let user enter it
              toast.info("Email verification required", {
                description: "Please verify your email to continue.",
                duration: 3000,
                action: {
                  label: "Verify Now",
                  onClick: () => {
                    router.push("/auth/verify-email");
                  },
                },
              });

              setTimeout(() => {
                router.push("/auth/verify-email");
              }, 2000);
            }
          }
        });
      });
    };

    // Check for errors immediately and more frequently
    interceptErrors();
    const interval = setInterval(interceptErrors, 300); // Check every 300ms
    
    // Also check the entire page body for error text (fallback)
    const checkPageForErrors = () => {
      const bodyText = document.body.textContent?.toLowerCase() || "";
      if (
        (bodyText.includes("email not verified") ||
         bodyText.includes("email verification required") ||
         bodyText.includes("please verify your email")) &&
        !hasInterceptedRef.current &&
        window.location.pathname === "/auth/sign-in"
      ) {
        hasInterceptedRef.current = true;
        
        const emailInput = document.querySelector<HTMLInputElement>(
          'input[type="email"], input[name="email"], input[id*="email"]'
        );
        const email = emailInput?.value || "";

        toast.info("Email verification required", {
          description: "Please verify your email to continue.",
          duration: 4000,
        });

        setTimeout(() => {
          router.push(
            email
              ? `/auth/verify-email?email=${encodeURIComponent(email)}`
              : "/auth/verify-email"
          );
        }, 1500);
      }
    };
    
    const pageCheckInterval = setInterval(checkPageForErrors, 500);

    // Also listen for DOM mutations (when errors appear)
    const observer = new MutationObserver(() => {
      interceptErrors();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Intercept fetch requests to catch API errors (only for sign-in)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0]?.toString() || "";
      const isSignInRequest = url.includes("/api/auth/sign-in") || 
                              url.includes("/api/auth/signin") ||
                              (url.includes("/api/auth/") && args[1]?.method === "POST");
      
      const response = await originalFetch(...args);
      
      // Only intercept sign-in related errors
      if (isSignInRequest && !response.ok) {
        // Clone response to read it without consuming it
        const clonedResponse = response.clone();
        
        try {
          const data = await clonedResponse.json();
          
          if (data?.error || data?.message) {
            const errorMessage = (data.error || data.message || "").toLowerCase();
            
            if (
              (errorMessage.includes("email not verified") ||
               errorMessage.includes("email verification") ||
               errorMessage.includes("unverified") ||
               errorMessage.includes("verify your email") ||
               errorMessage.includes("email is not verified")) &&
              !hasInterceptedRef.current
            ) {
              hasInterceptedRef.current = true;

              // Try to get email from request body
              let email = "";
              if (args[1]?.body) {
                try {
                  const body = typeof args[1].body === "string" 
                    ? JSON.parse(args[1].body)
                    : args[1].body;
                  email = body?.email || body?.identifier || "";
                } catch (e) {
                  // If body is not JSON, try to get from form
                  const emailInput = document.querySelector<HTMLInputElement>(
                    'input[type="email"], input[name="email"], input[id*="email"]'
                  );
                  email = emailInput?.value || "";
                }
              } else {
                // Fallback: get email from form
                const emailInput = document.querySelector<HTMLInputElement>(
                  'input[type="email"], input[name="email"], input[id*="email"]'
                );
                email = emailInput?.value || "";
              }

              toast.info("Email verification required", {
                description: "Please verify your email to continue. Redirecting...",
                duration: 3000,
              });

              setTimeout(() => {
                router.push(
                  email
                    ? `/auth/verify-email?email=${encodeURIComponent(email)}`
                    : "/auth/verify-email"
                );
              }, 1000);
            }
          }
        } catch (e) {
          // Response might not be JSON, that's okay - continue with DOM-based detection
        }
      }
      
      return response;
    };

    // Listen for custom error events
    const handleError = (event: CustomEvent | Event) => {
      const errorMessage = (
        (event as CustomEvent).detail?.message ||
        (event as CustomEvent).detail ||
        (event.target as HTMLElement)?.textContent ||
        ""
      ).toLowerCase();
      
      if (
        (errorMessage.includes("email not verified") ||
         errorMessage.includes("email verification") ||
         errorMessage.includes("unverified") ||
         errorMessage.includes("verify your email")) &&
        !hasInterceptedRef.current
      ) {
        hasInterceptedRef.current = true;

        const emailInput = document.querySelector<HTMLInputElement>(
          'input[type="email"], input[name="email"], input[id*="email"]'
        );
        const email = emailInput?.value || "";

        toast.info("Email verification required", {
          description: "Please verify your email to continue.",
          duration: 3000,
        });

        setTimeout(() => {
          router.push(
            email
              ? `/auth/verify-email?email=${encodeURIComponent(email)}`
              : "/auth/verify-email"
          );
        }, 1000);
      }
    };

    window.addEventListener("neon-auth:error", handleError as EventListener);
    window.addEventListener("auth:error", handleError as EventListener);
    
    // Also listen for any error events on the document
    document.addEventListener("error", handleError, true);

    return () => {
      clearInterval(interval);
      clearInterval(pageCheckInterval);
      observer.disconnect();
      window.removeEventListener("neon-auth:error", handleError as EventListener);
      window.removeEventListener("auth:error", handleError as EventListener);
      document.removeEventListener("error", handleError, true);
      // Restore original fetch
      window.fetch = originalFetch;
    };
  }, [router]);

  return <>{children}</>;
}

