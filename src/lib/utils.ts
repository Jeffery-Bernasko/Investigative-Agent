import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Unknown";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "Unknown";
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "Unknown";
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(date);
}

/**
 * Get severity color classes
 */
export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: "text-safe bg-safe/10 border-safe/20",
    medium: "text-warning bg-warning/10 border-warning/20",
    high: "text-warning bg-warning/10 border-warning/20",
    critical: "text-critical bg-critical/10 border-critical/20",
  };
  return colors[severity] || colors.low;
}

/**
 * Get entity type icon and color
 */
export function getEntityTypeConfig(type: string): {
  icon: string;
  color: string;
  bgColor: string;
} {
  const configs: Record<string, { icon: string; color: string; bgColor: string }> = {
    person: {
      icon: "User",
      color: "text-electric",
      bgColor: "bg-electric/10",
    },
    organization: {
      icon: "Building2",
      color: "text-matrix",
      bgColor: "bg-matrix/10",
    },
    domain: {
      icon: "Globe",
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
    },
    ip: {
      icon: "Server",
      color: "text-orange-400",
      bgColor: "bg-orange-400/10",
    },
    email: {
      icon: "Mail",
      color: "text-pink-400",
      bgColor: "bg-pink-400/10",
    },
    phone: {
      icon: "Phone",
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/10",
    },
  };
  return configs[type] || configs.person;
}

/**
 * Generate a random short code for tracking links
 */
export function generateShortCode(length: number = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Format a number with abbreviation (e.g., 1.2K, 3.4M)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

/**
 * Parse threat score to risk level
 */
export function getThreatLevel(score: number): {
  level: string;
  color: string;
} {
  if (score >= 75) return { level: "Critical", color: "text-critical" };
  if (score >= 50) return { level: "High", color: "text-warning" };
  if (score >= 25) return { level: "Medium", color: "text-yellow-400" };
  return { level: "Low", color: "text-safe" };
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Platform icons mapping
 */
export const platformIcons: Record<string, string> = {
  twitter: "Twitter",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "Linkedin",
  github: "Github",
  threads: "AtSign",
  snapchat: "Ghost",
  tiktok: "Music2",
  youtube: "Youtube",
  reddit: "MessageCircle",
};

