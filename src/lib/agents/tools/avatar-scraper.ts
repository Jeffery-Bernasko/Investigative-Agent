/**
 * Generic avatar scraper — extracts profile pictures from any platform's
 * profile page using Cheerio-based HTML parsing.
 *
 * Strategy (cascade, stop at first match):
 * 1. Platform-specific CSS selectors for known platforms
 * 2. Generic meta tag extraction (og:image, twitter:image)
 * 3. Avatar-class img tags (class/id containing avatar, profile, etc.)
 */

import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

/** Platform-specific selectors ordered by reliability. */
const PLATFORM_SELECTORS: Record<string, string[]> = {
    x: [
        'img[src*="pbs.twimg.com/profile_images"]',
        'meta[property="og:image"]',
    ],
    twitter: [
        'img[src*="pbs.twimg.com/profile_images"]',
        'meta[property="og:image"]',
    ],
    instagram: [
        'meta[property="og:image"]',
    ],
    linkedin: [
        'meta[property="og:image"]',
        'img[class*="profile"]',
    ],
    facebook: [
        'meta[property="og:image"]',
    ],
    youtube: [
        'link[rel="image_src"]',
        'meta[property="og:image"]',
    ],
    tiktok: [
        'meta[property="og:image"]',
    ],
    twitch: [
        'meta[property="og:image"]',
    ],
    behance: [
        'meta[property="og:image"]',
        'img[class*="avatar"]',
    ],
    pinterest: [
        'meta[property="og:image"]',
    ],
    dribbble: [
        'meta[property="og:image"]',
        'img[class*="avatar"]',
    ],
    soundcloud: [
        'meta[property="og:image"]',
    ],
    "stack overflow": [
        'img.s-avatar--image',
        'meta[property="og:image"]',
    ],
    stackoverflow: [
        'img.s-avatar--image',
        'meta[property="og:image"]',
    ],
    quora: [
        'meta[property="og:image"]',
    ],
    medium: [
        'meta[property="og:image"]',
        'img[class*="avatar"]',
    ],
    threads: [
        'meta[property="og:image"]',
    ],
    snapchat: [
        'meta[property="og:image"]',
    ],
    telegram: [
        'meta[property="og:image"]',
    ],
};

/** Generic fallback selectors tried in order for unknown platforms. */
const GENERIC_SELECTORS: string[] = [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
    'link[rel="image_src"]',
    // Avatar-class img tags
    'img[class*="avatar"]',
    'img[class*="profile-pic"]',
    'img[class*="profile_pic"]',
    'img[class*="user-pic"]',
    'img[class*="user_pic"]',
    'img[class*="headshot"]',
    'img[class*="photo"]',
    'img[id*="avatar"]',
    'img[id*="profile"]',
    // img within avatar containers
    '[class*="avatar"] img',
    '[class*="profile-pic"] img',
    '[class*="profile-image"] img',
    '[class*="user-image"] img',
];

const REJECT_PATTERNS = [
    "default",
    "placeholder",
    "missing",
    "generic",
    "blank",
    "silhouette",
    "no-avatar",
    "noavatar",
    "anonymous",
    "nophoto",
];

/**
 * Validate whether a candidate URL is likely to be a real profile picture.
 */
function isValidAvatarUrl(url: string): boolean {
    const lower = url.toLowerCase();

    // Reject SVGs (usually icons, not photos)
    if (lower.endsWith(".svg") || lower.includes("image/svg")) return false;

    // Reject known placeholder patterns
    for (const pattern of REJECT_PATTERNS) {
        if (lower.includes(pattern)) return false;
    }

    // Must look like a URL
    if (!lower.startsWith("http://") && !lower.startsWith("https://") && !lower.startsWith("//")) {
        return false;
    }

    return true;
}

/**
 * Resolve a potentially relative URL against the page base URL.
 */
function resolveUrl(candidate: string, baseUrl: string): string {
    if (candidate.startsWith("//")) {
        return `https:${candidate}`;
    }
    if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
        return candidate;
    }
    try {
        return new URL(candidate, baseUrl).href;
    } catch {
        return candidate;
    }
}

/**
 * Extract an image URL from a matched Cheerio element based on its tag name.
 */
function extractUrlFromElement(
    $el: cheerio.Cheerio<AnyNode>,
    tagName: string,
): string | null {
    if (tagName === "meta") {
        return $el.attr("content") || null;
    }
    if (tagName === "link") {
        return $el.attr("href") || null;
    }
    // img or other elements
    return $el.attr("src") || $el.attr("data-src") || null;
}

/**
 * Try to extract an avatar URL from raw HTML using the given selector list.
 */
function trySelectors(
    $: cheerio.CheerioAPI,
    selectors: string[],
    baseUrl: string,
): string | null {
    for (const selector of selectors) {
        const $els = $(selector);
        for (let i = 0; i < $els.length; i++) {
            const el = $els.eq(i);
            const node = $els[i];
            const tagName = node.type === "tag" ? node.tagName?.toLowerCase() : "";

            const url = extractUrlFromElement(el, tagName);
            if (!url) continue;

            const resolved = resolveUrl(url, baseUrl);
            if (isValidAvatarUrl(resolved)) return resolved;
        }
    }
    return null;
}

/**
 * Scrape a profile page and attempt to extract the user's avatar/profile
 * picture URL.
 *
 * @param profileUrl  The full URL of the user's profile page.
 * @param platform    Optional platform name (e.g. "GitHub", "X") to select
 *                    platform-specific selectors first.
 * @returns The avatar URL, or null if none could be extracted.
 */
export async function scrapeAvatarFromPage(
    profileUrl: string,
    platform?: string,
): Promise<{ avatarUrl: string } | null> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        const response = await fetch(profileUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            redirect: "follow",
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) return null;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
            return null;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // 1. Try platform-specific selectors first
        if (platform) {
            const key = platform.toLowerCase();
            const platformSelectors = PLATFORM_SELECTORS[key];
            if (platformSelectors) {
                const url = trySelectors($, platformSelectors, profileUrl);
                if (url) return { avatarUrl: url };
            }
        }

        // 2. Try generic selectors
        const url = trySelectors($, GENERIC_SELECTORS, profileUrl);
        if (url) return { avatarUrl: url };

        return null;
    } catch {
        // Network errors, timeouts, parse errors — all non-fatal
        return null;
    }
}
