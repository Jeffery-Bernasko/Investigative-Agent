/**
 * Email Intelligence Tools
 * Validate emails, check for breaches, find associated accounts
 */

import crypto from "crypto";

export interface EmailIntelligence {
  email: string;
  isValid: boolean;
  isDisposable: boolean;
  isWebmail: boolean;
  breaches: Array<{
    name: string;
    date: string;
    dataClasses: string[];
  }>;
  gravatar: {
    exists: boolean;
    url?: string;
  };
  hunter: {
    status?: string;
    score?: number;
    smtpCheck?: boolean;
    mxRecords?: boolean;
  };
  confidence: "high" | "medium" | "low";
}

// Validate email format
export function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Check if email is from a disposable email provider
export function isDisposableEmail(email: string): boolean {
  const disposableDomains = [
    "tempmail.com",
    "guerrillamail.com",
    "10minutemail.com",
    "mailinator.com",
    "throwaway.email",
    "temp-mail.org",
    "yopmail.com",
    "maildrop.cc",
  ];

  const domain = email.split("@")[1]?.toLowerCase();
  return disposableDomains.includes(domain);
}

// Check if email is from a webmail provider
export function isWebmail(email: string): boolean {
  const webmailDomains = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "protonmail.com",
    "aol.com",
  ];

  const domain = email.split("@")[1]?.toLowerCase();
  return webmailDomains.includes(domain);
}

// Check Gravatar
export async function checkGravatar(email: string): Promise<{
  exists: boolean;
  url?: string;
}> {
  try {
    const hash = crypto
      .createHash("md5")
      .update(email.toLowerCase().trim())
      .digest("hex");

    const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404`;

    const response = await fetch(gravatarUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });

    return {
      exists: response.ok,
      url: response.ok ? `https://en.gravatar.com/${hash}` : undefined,
    };
  } catch {
    return { exists: false };
  }
}

// Check Hunter.io for email validation
export async function checkHunterIO(
  email: string,
  apiKey?: string
): Promise<{
  status?: string;
  score?: number;
  smtpCheck?: boolean;
  mxRecords?: boolean;
}> {
  const key = apiKey || process.env.HUNTER_API_KEY;
  if (!key) {
    console.log("⚠️ Hunter.io API key not configured");
    return {};
  }

  try {
    console.log(`🔍 Hunter.io: Validating ${email}`);
    const response = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${key}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      console.log(`❌ Hunter.io API error: ${response.status}`);
      return {};
    }

    const data = await response.json();

    if (data.data) {
      console.log(`✅ Hunter.io: ${data.data.status} (score: ${data.data.score})`);
      return {
        status: data.data.status,
        score: data.data.score,
        smtpCheck: data.data.smtp_check,
        mxRecords: data.data.mx_records,
      };
    }

    return {};
  } catch (error: any) {
    console.error(`⚠️ Hunter.io error:`, error.message);
    return {};
  }
}

// Check Have I Been Pwned for breaches
export async function checkHIBP(
  email: string,
  apiKey?: string
): Promise<
  Array<{
    name: string;
    date: string;
    dataClasses: string[];
  }>
> {
  const key = apiKey || process.env.HIBP_API_KEY;
  if (!key) {
    console.log("⚠️ HIBP API key not configured");
    return [];
  }

  try {
    console.log(`🔍 HIBP: Checking breaches for ${email}`);
    const response = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`,
      {
        headers: {
          "hibp-api-key": key,
          "User-Agent": "SEPTO-OSINT",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (response.status === 404) {
      console.log(`✅ HIBP: No breaches found`);
      return [];
    }

    if (!response.ok) {
      console.log(`❌ HIBP API error: ${response.status}`);
      return [];
    }

    const breaches = await response.json();
    console.log(`🚨 HIBP: Found ${breaches.length} breaches`);

    return breaches.map((breach: any) => ({
      name: breach.Name,
      date: breach.BreachDate,
      dataClasses: breach.DataClasses || [],
    }));
  } catch (error: any) {
    console.error(`⚠️ HIBP error:`, error.message);
    return [];
  }
}

// Main email intelligence gathering function
export async function gatherEmailIntelligence(
  email: string,
  apiKeys?: {
    hunter?: string;
    hibp?: string;
  }
): Promise<EmailIntelligence> {
  console.log(`\n📧 Gathering email intelligence: ${email}`);

  // Basic validation
  const isValid = validateEmailFormat(email);
  if (!isValid) {
    console.log(`❌ Invalid email format`);
    return {
      email,
      isValid: false,
      isDisposable: false,
      isWebmail: false,
      breaches: [],
      gravatar: { exists: false },
      hunter: {},
      confidence: "low",
    };
  }

  // Gather intelligence in parallel
  const [gravatar, hunter, breaches] = await Promise.all([
    checkGravatar(email),
    checkHunterIO(email, apiKeys?.hunter),
    checkHIBP(email, apiKeys?.hibp),
  ]);

  const isDisposable = isDisposableEmail(email);
  const webmail = isWebmail(email);

  // Calculate confidence
  let confidence: "high" | "medium" | "low" = "medium";
  if (hunter.status === "valid" && hunter.score && hunter.score > 80) {
    confidence = "high";
  } else if (hunter.status === "invalid" || isDisposable) {
    confidence = "low";
  }

  const result: EmailIntelligence = {
    email,
    isValid,
    isDisposable,
    isWebmail: webmail,
    breaches,
    gravatar,
    hunter,
    confidence,
  };

  console.log(`✅ Email intelligence complete`);
  console.log(`  Valid: ${isValid}`);
  console.log(`  Disposable: ${isDisposable}`);
  console.log(`  Webmail: ${webmail}`);
  console.log(`  Breaches: ${breaches.length}`);
  console.log(`  Gravatar: ${gravatar.exists}`);
  console.log(`  Confidence: ${confidence}`);

  return result;
}