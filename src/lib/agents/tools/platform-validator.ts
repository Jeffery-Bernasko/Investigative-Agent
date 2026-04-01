/**
 * Platform-specific profile validation via HTML content inspection.
 */

/** Platforms that cannot be validated via HTTP scraping — return immediately. */
const UNFETCHABLE_PLATFORMS = new Set([
    "Instagram",   // Login wall blocks non-browser requests
    "TikTok",      // Blocks non-browser requests
    "Pinterest",   // Anti-bot, consistently times out
    "Snapchat",    // Requires login/app
    "Discord",     // Requires auth or app-level access
    "Telegram",    // Requires auth or app-level access
    "Facebook",    // Login wall, unreliable HTML
    "Patreon",     // Blocks scrapers
]);

export async function validateProfile(
    url: string,
    platform: string,
    username: string
): Promise<{ exists: boolean; confidence: "high" | "medium" | "low" }> {
    // Fast path: skip platforms that can't be validated via HTML scraping.
    // This avoids wasting 6s per platform on a fetch that will always fail.
    if (UNFETCHABLE_PLATFORMS.has(platform)) {
        return { exists: false, confidence: "low" };
    }

    try {
        const response = await fetch(url, {
            method: "GET",
            redirect: "follow",
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            signal: AbortSignal.timeout(6000),
        });

        // If not OK, definitely doesn't exist
        if (!response.ok) {
            return { exists: false, confidence: "low" };
        }

        // Get content for validation
        const html = await response.text();
        const lowerHtml = html.toLowerCase();
        const lowerUsername = username.toLowerCase();

        // Platform-specific validation
        switch (platform) {
            case "X":
                if (
                    lowerHtml.includes("this account doesn't exist") ||
                    lowerHtml.includes("account suspended") ||
                    lowerHtml.includes("page doesn't exist") ||
                    lowerHtml.includes("this account has been suspended")
                ) {
                    return { exists: false, confidence: "low" };
                }
                if (
                    lowerHtml.includes(lowerUsername) &&
                    (lowerHtml.includes("tweets") ||
                        lowerHtml.includes("following") ||
                        lowerHtml.includes("followers"))
                ) {
                    return { exists: true, confidence: "medium" };
                }
                return { exists: false, confidence: "low" };

            case "GitHub":
                if (
                    lowerHtml.includes("not found") ||
                    lowerHtml.includes("404") ||
                    !lowerHtml.includes(lowerUsername)
                ) {
                    return { exists: false, confidence: "low" };
                }
                if (
                    lowerHtml.includes("contributions") ||
                    lowerHtml.includes("repositories") ||
                    lowerHtml.includes("repo")
                ) {
                    return { exists: true, confidence: "high" };
                }
                return { exists: false, confidence: "low" };

            case "LinkedIn":
                if (
                    lowerHtml.includes("page not found") ||
                    lowerHtml.includes("member doesn't exist") ||
                    lowerHtml.includes("404")
                ) {
                    return { exists: false, confidence: "low" };
                }
                if (
                    lowerHtml.includes("experience") ||
                    lowerHtml.includes("education")
                ) {
                    return { exists: true, confidence: "medium" };
                }
                return { exists: false, confidence: "low" };

            case "Reddit":
                if (
                    lowerHtml.includes("page not found") ||
                    lowerHtml.includes("nobody on reddit goes by that name") ||
                    !lowerHtml.includes(lowerUsername)
                ) {
                    return { exists: false, confidence: "low" };
                }
                if (
                    lowerHtml.includes("karma") ||
                    lowerHtml.includes("post karma")
                ) {
                    return { exists: true, confidence: "high" };
                }
                return { exists: false, confidence: "low" };

            case "Medium":
                if (
                    lowerHtml.includes("page not found") ||
                    !lowerHtml.includes(lowerUsername)
                ) {
                    return { exists: false, confidence: "low" };
                }
                if (
                    lowerHtml.includes("stories") ||
                    lowerHtml.includes("followers")
                ) {
                    return { exists: true, confidence: "medium" };
                }
                return { exists: false, confidence: "low" };

            case "YouTube":
                if (
                    lowerHtml.includes("this page isn't available") ||
                    lowerHtml.includes("404")
                ) {
                    return { exists: false, confidence: "low" };
                }
                if (
                    lowerHtml.includes("subscribers") ||
                    lowerHtml.includes("videos")
                ) {
                    return { exists: true, confidence: "medium" };
                }
                return { exists: false, confidence: "low" };

            case "Twitch":
                if (
                    lowerHtml.includes("not found") ||
                    lowerHtml.includes("sorry. unless you've got a time machine") ||
                    lowerHtml.includes("404")
                ) {
                    return { exists: false, confidence: "low" };
                }
                if (
                    lowerHtml.includes(lowerUsername) &&
                    (lowerHtml.includes("followers") ||
                        lowerHtml.includes("videos") ||
                        lowerHtml.includes("streaming"))
                ) {
                    return { exists: true, confidence: "medium" };
                }
                return { exists: false, confidence: "low" };

            case "Behance":
                if (
                    lowerHtml.includes("not found") ||
                    lowerHtml.includes("404") ||
                    !lowerHtml.includes(lowerUsername)
                ) {
                    return { exists: false, confidence: "low" };
                }
                if (
                    lowerHtml.includes("projects") ||
                    lowerHtml.includes("appreciations") ||
                    lowerHtml.includes("followers")
                ) {
                    return { exists: true, confidence: "medium" };
                }
                return { exists: false, confidence: "low" };

            case "Mastodon":
                if (
                    lowerHtml.includes("not found") ||
                    lowerHtml.includes("404") ||
                    !lowerHtml.includes(lowerUsername)
                ) {
                    return { exists: false, confidence: "low" };
                }
                if (
                    lowerHtml.includes("toots") ||
                    lowerHtml.includes("followers") ||
                    lowerHtml.includes("following")
                ) {
                    return { exists: true, confidence: "medium" };
                }
                return { exists: false, confidence: "low" };

            case "HackerNews":
                if (
                    lowerHtml.includes("no such user") ||
                    !lowerHtml.includes(lowerUsername)
                ) {
                    return { exists: false, confidence: "low" };
                }
                if (
                    lowerHtml.includes("karma") ||
                    lowerHtml.includes("submissions")
                ) {
                    return { exists: true, confidence: "high" };
                }
                return { exists: false, confidence: "low" };

            case "Dev.to":
                if (
                    lowerHtml.includes("404") ||
                    !lowerHtml.includes(lowerUsername)
                ) {
                    return { exists: false, confidence: "low" };
                }
                if (
                    lowerHtml.includes("posts") ||
                    lowerHtml.includes("comments")
                ) {
                    return { exists: true, confidence: "medium" };
                }
                return { exists: false, confidence: "low" };

            default:
                if (
                    lowerHtml.includes("not found") ||
                    lowerHtml.includes("404") ||
                    !lowerHtml.includes(lowerUsername)
                ) {
                    return { exists: false, confidence: "low" };
                }
                return { exists: false, confidence: "low" };
        }
    } catch (error: any) {
        console.error(`  ⚠️ Validation error for ${platform}:`, error.message);
        return { exists: false, confidence: "low" };
    }
}

