/**
 * PII redaction utilities.
 *
 * Redacts sensitive personal data (email, phone, address) by partially masking
 * identifiable portions. These helpers are used when generating PDF reports
 * without the opt-in `includeRawPii` flag.
 */

export type PiiType = "email" | "phone" | "address" | "generic";

/**
 * Redact a PII string by masking most of the identifiable characters.
 *
 * Examples:
 *  - email:   "john.doe@example.com"  → "j***.d**@example.com"
 *  - phone:   "+1 (555) 123-4567"     → "+1 (***) ***-4567"
 *  - generic: "some text here"        → "some t***"
 */
export function redactPii(value: string, type: PiiType = "generic"): string {
  if (!value) return value;

  switch (type) {
    case "email": {
      const [local, domain] = value.split("@");
      if (!domain) return redactGeneric(value);
      const redactedLocal = redactString(local, 1, 2);
      return `${redactedLocal}@${domain}`;
    }

    case "phone": {
      // Keep last 4 digits visible, mask the rest of the digits
      const digits = value.replace(/\D/g, "");
      const last4 = digits.slice(-4);
      const maskedDigits = "*".repeat(Math.max(digits.length - 4, 0)) + last4;

      // Rebuild with original non-digit characters (brackets, dashes, spaces) but swap digits
      let digitIndex = 0;
      const rebuilt = value
        .split("")
        .map((c) => {
          if (/\d/.test(c)) {
            const replacement = maskedDigits[digitIndex] ?? "*";
            digitIndex++;
            return replacement;
          }
          return c;
        })
        .join("");
      return rebuilt;
    }

    default:
      return redactGeneric(value);
  }
}

/** Keep the first `keepStart` and last `keepEnd` chars of a string, mask the rest. */
function redactString(s: string, keepStart: number, keepEnd: number): string {
  if (s.length <= keepStart + keepEnd) return "*".repeat(s.length);
  return (
    s.slice(0, keepStart) +
    "*".repeat(s.length - keepStart - keepEnd) +
    s.slice(s.length - keepEnd)
  );
}

function redactGeneric(value: string): string {
  if (value.length <= 4) return "*".repeat(value.length);
  return value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2);
}

/**
 * Scan a text snippet for PII patterns and return a redacted copy.
 * Optionally return the list of patterns found (without actual values).
 */
export function redactSnippet(text: string): {
  redacted: string;
  piiTypes: PiiType[];
} {
  const piiTypes: PiiType[] = [];
  let redacted = text;

  // Redact email addresses (use a single replace; track match count for piiTypes)
  let emailCount = 0;
  redacted = redacted.replace(
    /\b([\w.+-]{1,40})@([\w-]{1,30}\.[a-z]{2,6})\b/gi,
    (_, local, domain) => {
      emailCount++;
      return `${redactString(local, 1, 1)}@${domain}`;
    },
  );
  if (emailCount > 0) piiTypes.push("email");

  // Redact phone numbers (sequences of 7+ digits, possibly with separators)
  let phoneCount = 0;
  redacted = redacted.replace(/\b(\+?\d[\d\s\-().]{7,17})\b/g, (match) => {
    if (match.replace(/\D/g, "").length < 7) return match;
    phoneCount++;
    return redactPii(match, "phone");
  });
  if (phoneCount > 0) piiTypes.push("phone");

  return { redacted, piiTypes };
}
