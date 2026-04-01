/**
 * Avatar fetcher — downloads profile pictures from public APIs and returns them
 * as base64 data URLs suitable for embedding in PDF reports.
 *
 * Platforms with public APIs (GitHub, Reddit, Mastodon, Dev.to) use direct API
 * calls. All other platforms fall back to a generic HTML scraper that extracts
 * avatar images from the profile page.
 */

import { scrapeAvatarFromPage } from "./avatar-scraper";

export interface AvatarResult {
    avatarUrl: string;
    avatarData: string; // base64 data URL, e.g. "data:image/jpeg;base64,..."
}

/** Fetch a remote image URL and return it as a base64 data URL. */
async function fetchImageAsBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return null;
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType = response.headers.get("content-type") || "image/jpeg";
        // Strip query params from content-type (e.g. "image/jpeg; charset=utf-8")
        const mimeType = contentType.split(";")[0].trim();
        return `data:${mimeType};base64,${base64}`;
    } catch {
        return null;
    }
}

async function fetchGitHubAvatar(username: string): Promise<AvatarResult | null> {
    try {
        const res = await fetch(`https://api.github.com/users/${username}`, {
            headers: { Accept: "application/vnd.github.v3+json" },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const avatarUrl = data.avatar_url as string;
        if (!avatarUrl) return null;
        // Request a smaller size to keep base64 payload manageable
        const sizedUrl = avatarUrl.includes("?") ? `${avatarUrl}&s=80` : `${avatarUrl}?s=80`;
        const avatarData = await fetchImageAsBase64(sizedUrl);
        if (!avatarData) return null;
        return { avatarUrl, avatarData };
    } catch {
        return null;
    }
}

async function fetchRedditAvatar(username: string): Promise<AvatarResult | null> {
    try {
        const res = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
            headers: { "User-Agent": "SEPTO-OSINT/1.0" },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const iconImg = data?.data?.icon_img as string | undefined;
        if (!iconImg || iconImg.includes("default") || iconImg.includes("placeholder")) return null;
        // Reddit URLs contain HTML-encoded ampersands
        const cleanUrl = iconImg.replace(/&amp;/g, "&");
        const avatarData = await fetchImageAsBase64(cleanUrl);
        if (!avatarData) return null;
        return { avatarUrl: cleanUrl, avatarData };
    } catch {
        return null;
    }
}

async function fetchMastodonAvatar(username: string): Promise<AvatarResult | null> {
    try {
        const res = await fetch(
            `https://mastodon.social/api/v1/accounts/lookup?acct=${encodeURIComponent(username)}`,
            { signal: AbortSignal.timeout(5000) },
        );
        if (!res.ok) return null;
        const data = await res.json();
        const avatarUrl = data?.avatar as string | undefined;
        if (!avatarUrl || avatarUrl.includes("missing") || avatarUrl.includes("default")) return null;
        const avatarData = await fetchImageAsBase64(avatarUrl);
        if (!avatarData) return null;
        return { avatarUrl, avatarData };
    } catch {
        return null;
    }
}

async function fetchDevtoAvatar(username: string): Promise<AvatarResult | null> {
    try {
        const res = await fetch(
            `https://dev.to/api/users/by_username?url=${encodeURIComponent(username)}`,
            { signal: AbortSignal.timeout(5000) },
        );
        if (!res.ok) return null;
        const data = await res.json();
        const avatarUrl = data?.profile_image as string | undefined;
        if (!avatarUrl) return null;
        const sizedUrl = avatarUrl.includes("?") ? `${avatarUrl}&w=80` : `${avatarUrl}?w=80`;
        const avatarData = await fetchImageAsBase64(sizedUrl);
        if (!avatarData) return null;
        return { avatarUrl, avatarData };
    } catch {
        return null;
    }
}

/**
 * Fetch a profile picture for the given platform/username combination.
 * Platforms with public APIs use direct calls; all others fall back to
 * scraping the profile page HTML for avatar images.
 *
 * @param platform    Platform name (e.g. "GitHub", "X", "Instagram")
 * @param username    Username on the platform
 * @param profileUrl  Optional full URL of the profile page (enables generic scraping)
 */
export async function fetchPlatformAvatar(
    platform: string,
    username: string,
    profileUrl?: string,
): Promise<AvatarResult | null> {
    const key = platform.toLowerCase();

    // Fast path: platforms with public APIs
    if (key === "github") return fetchGitHubAvatar(username);
    if (key === "reddit") return fetchRedditAvatar(username);
    if (key === "mastodon") return fetchMastodonAvatar(username);
    if (key === "dev.to") return fetchDevtoAvatar(username);

    // Generic fallback: scrape the profile page for avatar images
    if (!profileUrl) return null;

    try {
        const scraped = await scrapeAvatarFromPage(profileUrl, platform);
        if (!scraped?.avatarUrl) return null;

        const avatarData = await fetchImageAsBase64(scraped.avatarUrl);
        if (!avatarData) return null;

        return { avatarUrl: scraped.avatarUrl, avatarData };
    } catch {
        return null;
    }
}
