/**
 * Phone Intelligence Tools
 * Validate, parse, and gather intelligence on phone numbers
 */

export interface PhoneIntelligence {
  phone: string;
  cleaned: string;
  isValid: boolean;
  country?: {
    code: string;
    name: string;
    flag: string;
  };
  carrier?: {
    name: string;
    type: "mobile" | "landline" | "voip" | "unknown";
  };
  format: {
    international: string;
    national: string;
    e164: string;
  };
  confidence: "high" | "medium" | "low";
}

// Country code mappings
const COUNTRY_CODES: Record<string, { name: string; flag: string }> = {
  "+1": { name: "United States/Canada", flag: "🇺🇸/🇨🇦" },
  "+44": { name: "United Kingdom", flag: "🇬🇧" },
  "+60": { name: "Malaysia", flag: "🇲🇾" },
  "+91": { name: "India", flag: "🇮🇳" },
  "+86": { name: "China", flag: "🇨🇳" },
  "+81": { name: "Japan", flag: "🇯🇵" },
  "+61": { name: "Australia", flag: "🇦🇺" },
  "+33": { name: "France", flag: "🇫🇷" },
  "+49": { name: "Germany", flag: "🇩🇪" },
  "+39": { name: "Italy", flag: "🇮🇹" },
  "+34": { name: "Spain", flag: "🇪🇸" },
  "+7": { name: "Russia", flag: "🇷🇺" },
  "+82": { name: "South Korea", flag: "🇰🇷" },
  "+55": { name: "Brazil", flag: "🇧🇷" },
  "+27": { name: "South Africa", flag: "🇿🇦" },
  "+234": { name: "Nigeria", flag: "🇳🇬" },
  "+233": { name: "Ghana", flag: "🇬🇭" },
  "+20": { name: "Egypt", flag: "🇪🇬" },
  "+52": { name: "Mexico", flag: "🇲🇽" },
  "+62": { name: "Indonesia", flag: "🇮🇩" },
  "+63": { name: "Philippines", flag: "🇵🇭" },
};

// Clean phone number
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9+]/g, "");
}

// Validate phone number format
export function validatePhoneFormat(phone: string): boolean {
  const cleaned = cleanPhoneNumber(phone);
  // Basic E.164 format: +[country code][number] (6-15 digits total)
  return /^\+?[1-9]\d{6,14}$/.test(cleaned);
}

// Detect country from phone number
export function detectCountry(phone: string): {
  code: string;
  name: string;
  flag: string;
} | null {
  const cleaned = cleanPhoneNumber(phone);

  // Check for country codes (longest first)
  const sortedCodes = Object.keys(COUNTRY_CODES).sort((a, b) => b.length - a.length);

  for (const code of sortedCodes) {
    if (cleaned.startsWith(code)) {
      return {
        code,
        ...COUNTRY_CODES[code],
      };
    }
  }

  return null;
}

// Format phone number
export function formatPhoneNumber(phone: string): {
  international: string;
  national: string;
  e164: string;
} {
  const cleaned = cleanPhoneNumber(phone);

  // E.164 format
  const e164 = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;

  // International format (add spaces for readability)
  const international = e164.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{4})/, "$1 $2 $3 $4");

  // National format (without country code)
  const country = detectCountry(cleaned);
  const national = country
    ? cleaned.substring(country.code.length)
    : cleaned;

  return {
    international,
    national,
    e164,
  };
}

// Main phone intelligence gathering function
export async function gatherPhoneIntelligence(
  phone: string
): Promise<PhoneIntelligence> {
  console.log(`\n📱 Gathering phone intelligence: ${phone}`);

  const cleaned = cleanPhoneNumber(phone);
  const isValid = validatePhoneFormat(cleaned);

  if (!isValid) {
    console.log(`❌ Invalid phone number format`);
    return {
      phone,
      cleaned,
      isValid: false,
      format: {
        international: phone,
        national: phone,
        e164: phone,
      },
      confidence: "low",
    };
  }

  // Detect country
  const country = detectCountry(cleaned);
  console.log(`${country ? "✅" : "❌"} Country: ${country?.name || "Unknown"}`);

  // Format number
  const format = formatPhoneNumber(cleaned);
  console.log(`📞 Format: ${format.international}`);

  // Determine type (basic heuristic - real implementation would use carrier API)
  const carrier = {
    name: "Unknown",
    type: "unknown" as const,
  };

  // Calculate confidence
  const confidence: "high" | "medium" | "low" = country ? "medium" : "low";

  const result: PhoneIntelligence = {
    phone,
    cleaned,
    isValid,
    country: country || undefined,
    carrier,
    format,
    confidence,
  };

  console.log(`✅ Phone intelligence complete`);
  console.log(` Valid: ${isValid}`);
  console.log(` Country: ${country?.name || "Unknown"}`);
  console.log(` Confidence: ${confidence}`);

  return result;
}