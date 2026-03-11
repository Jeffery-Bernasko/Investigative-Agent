/**
 * Scraped Data Types
 */

export interface ScrapedData {
  profile?: {
    username?: string;
    displayName?: string;
    bio?: string;
    location?: string;
    website?: string;
    avatarUrl?: string;
    verified?: boolean;
    createdAt?: string;
  };
  stats?: {
    followers?: number;
    following?: number;
    posts?: number;
    likes?: number;
  };
  contact?: {
    email?: string;
    phone?: string;
    otherEmails?: string[];
    otherPhones?: string[];
  };
  activity?: {
    lastPost?: string;
    lastActive?: string;
    postingFrequency?: string;
  };
  metadata?: Record<string, unknown>;
  rawHtml?: string;
  rawData?: Record<string, unknown>;
}
