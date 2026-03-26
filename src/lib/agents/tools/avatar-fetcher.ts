/**
 * Avatar fetcher — downloads profile pictures from public APIs and returns them
 * as base64 data URLs suitable for embedding in PDF reports.
 * Only platforms with freely accessible APIs are supported.
 *
 * Security:
 *  - All image URLs are validated before fetching (SSRF protection).
 *  - Only http/https protocols are allowed.
 *  - Private/loopback IP ranges are blocked.
 *  - Maximum response size is enforced (2 MB).
 */

export interface AvatarResult {
    avatarUrl: string;
    avatarData: string; // base64 data URL, e.g. "data:image/jpeg;base64,..."
}

// ── SSRF protection ────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Return true when the URL is safe to fetch (public http/https, no private IPs).
 * Blocks file://, data://, localhost, and RFC-1918 / loopback ranges.
 */
function isSafeImageUrl(url: string): boolean {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return false;
    }

    // Only allow http and https
    if (!["http:", "https:"].includes(parsed.protocol)) return false;

    const host = parsed.hostname.toLowerCase();

    // Block loopback and localhost
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;

    // Block link-local (169.254.x.x)
    if (/^169\.254\./.test(host)) return false;

    // Block RFC-1918 private ranges: 10.x, 172.16-31.x, 192.168.x
    if (/^10\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;

    // Block IPv6 private/loopback
    if (/^\[?::1\]?$/.test(host)) return false;
    if (/^\[?fc[0-9a-f]{2}:/i.test(host)) return false; // ULA

    return true;
}

/** Fetch a remote image URL and return it as a base64 data URL. */
async function fetchImageAsBase64(url: string): Promise<string | null> {
    if (!isSafeImageUrl(url)) {
        console.warn(`[AvatarFetcher] Blocked unsafe URL: ${url}`);
        return null;
    }
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return null;

        // Validate content type
        const contentType = response.headers.get("content-type") || "";
        const mimeType = contentType.split(";")[0].trim();
        if (!mimeType.startsWith("image/")) {
            console.warn(`[AvatarFetcher] Non-image content-type: ${mimeType}`);
            return null;
        }

        // Reject if Content-Length is already known to exceed the limit
        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_BYTES) {
            console.warn(`[AvatarFetcher] Content-Length too large: ${contentLength}`);
            return null;
        }

        // Enforce size limit after buffering
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > MAX_IMAGE_BYTES) {
            console.warn(`[AvatarFetcher] Image too large: ${buffer.byteLength} bytes`);
            return null;
        }

        const base64 = Buffer.from(buffer).toString("base64");
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
 * Returns null if the platform is unsupported or the request fails.
 */
export async function fetchPlatformAvatar(
    platform: string,
    username: string,
): Promise<AvatarResult | null> {
    const key = platform.toLowerCase();
    if (key === "github") return fetchGitHubAvatar(username);
    if (key === "reddit") return fetchRedditAvatar(username);
    if (key === "mastodon") return fetchMastodonAvatar(username);
    if (key === "dev.to") return fetchDevtoAvatar(username);
    return null;
}
