/**
 * Name-first person search — discover social profiles by full name.
 */

import { searchUsernameOnPlatforms, ALL_PLATFORM_NAMES } from "./username-search";
import { searchWithTavily, DEFAULT_SOCIAL_DOMAINS } from "./tavily-search";

// Types
export type ProfileResult = {
    platform: string;
    url: string;
    found: boolean;
    confidence?: "high" | "medium" | "low";
    checkedAt?: Date;
};

/** Tracks a confirmed username on a specific platform. */
export interface PlatformIdentity {
    username: string;
    confidence: "high" | "medium" | "low";
    source: "tavily" | "github-api" | "phase2-check" | "pivot";
}

/**
 * Keyed by normalized platform name (e.g. "GitHub", "LinkedIn").
 * Serializable form used in the return value.
 */
export type IdentityMap = Record<string, PlatformIdentity>;

export interface PersonSearchResult {
    found: boolean;
    profiles: ProfileResult[];
    identityMap: IdentityMap;
}

/**
 * Check whether a discovered username is plausibly related to the target name.y order)
 */
export function isUsernameRelevant(
    username: string,
    targetName: string,
): boolean {
    const nameParts = targetName
        .toLowerCase()
        .split(/\s+/)
        .filter((p) => p.length >= 2);

    if (nameParts.length === 0) return false;

    const cleaned = username.toLowerCase().replace(/[-_.]/g, "");

    // 1. Substring match (original logic)
    const hasNamePart = nameParts.some((part) => cleaned.includes(part));

    // 2. Concatenation match (original logic)
    const concatenated = nameParts.join("");
    const isVariation =
        cleaned.includes(concatenated) || concatenated.includes(cleaned);

    if (hasNamePart || isVariation) return true;

    // 3. Prefix match — username starts with the first 3+ chars of any name part
    const hasPrefixMatch = nameParts.some((part) => {
        const prefix = part.slice(0, Math.max(3, Math.ceil(part.length * 0.6)));
        return cleaned.startsWith(prefix);
    });
    if (hasPrefixMatch) return true;

    // 4. Initials match — username starts with initials (e.g. "jb" for "Jeffery Bernasko")
    if (nameParts.length >= 2) {
        const initials = nameParts.map((p) => p[0]).join("");
        if (initials.length >= 2 && cleaned.startsWith(initials)) return true;
    }

    // 5. Reversed name concatenation — "bernaskojeffery"
    const reversed = [...nameParts].reverse().join("");
    if (cleaned.includes(reversed) || reversed.includes(cleaned)) return true;

    // 6. Partial overlap — at least 2 name parts appear (any order, any position)
    if (nameParts.length >= 2) {
        const matchCount = nameParts.filter((part) => cleaned.includes(part)).length;
        if (matchCount >= 2) return true;
    }

    return false;
}
// URL utilities
/** Extract username from a social profile URL. */
export function extractUsernameFromUrl(url: string): string | null {
    const patterns: { regex: RegExp; group: number }[] = [
        { regex: /github\.com\/([A-Za-z0-9_-]+)\/?$/i, group: 1 },
        { regex: /(?:twitter|x)\.com\/([A-Za-z0-9_]+)\/?$/i, group: 1 },
        { regex: /instagram\.com\/([A-Za-z0-9_.]+)\/?$/i, group: 1 },
        { regex: /linkedin\.com\/in\/([A-Za-z0-9_-]+)\/?$/i, group: 1 },
        { regex: /facebook\.com\/([A-Za-z0-9_.]+)\/?$/i, group: 1 },
        { regex: /reddit\.com\/user\/([A-Za-z0-9_-]+)\/?$/i, group: 1 },
        { regex: /medium\.com\/@?([A-Za-z0-9_.-]+)\/?$/i, group: 1 },
        { regex: /youtube\.com\/@([A-Za-z0-9_.-]+)\/?$/i, group: 1 },
        { regex: /tiktok\.com\/@([A-Za-z0-9_.]+)\/?$/i, group: 1 },
        { regex: /twitch\.tv\/([A-Za-z0-9_]+)\/?$/i, group: 1 },
        { regex: /dev\.to\/([A-Za-z0-9_]+)\/?$/i, group: 1 },
        { regex: /behance\.net\/([A-Za-z0-9_-]+)\/?$/i, group: 1 },
        { regex: /pinterest\.com\/([A-Za-z0-9_-]+)\/?$/i, group: 1 },
        { regex: /snapchat\.com\/add\/([A-Za-z0-9_.-]+)\/?$/i, group: 1 },
        { regex: /dribbble\.com\/([A-Za-z0-9_-]+)\/?$/i, group: 1 },
        { regex: /soundcloud\.com\/([A-Za-z0-9_-]+)\/?$/i, group: 1 },
        { regex: /mastodon\.social\/@([A-Za-z0-9_]+)\/?$/i, group: 1 },
        { regex: /threads\.net\/@([A-Za-z0-9_.]+)\/?$/i, group: 1 },
        { regex: /quora\.com\/profile\/([A-Za-z0-9_-]+)\/?$/i, group: 1 },
        { regex: /stackoverflow\.com\/users\/\d+\/([A-Za-z0-9_-]+)\/?$/i, group: 1 },
        { regex: /t\.me\/([A-Za-z0-9_]+)\/?$/i, group: 1 },
    ];

    for (const { regex, group } of patterns) {
        const match = url.match(regex);
        if (match) return match[group];
    }
    return null;
}

/** Detect platform from URL. */
export function detectPlatformFromUrl(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes("github.com")) return "GitHub";
    if (lower.includes("x.com") || lower.includes("twitter.com")) return "X";
    if (lower.includes("instagram.com")) return "Instagram";
    if (lower.includes("linkedin.com")) return "LinkedIn";
    if (lower.includes("facebook.com")) return "Facebook";
    if (lower.includes("reddit.com")) return "Reddit";
    if (lower.includes("medium.com")) return "Medium";
    if (lower.includes("youtube.com")) return "YouTube";
    if (lower.includes("tiktok.com")) return "TikTok";
    if (lower.includes("twitch.tv")) return "Twitch";
    if (lower.includes("dev.to")) return "Dev.to";
    if (lower.includes("behance.net")) return "Behance";
    if (lower.includes("pinterest.com")) return "Pinterest";
    if (lower.includes("mastodon.social")) return "Mastodon";
    if (lower.includes("snapchat.com")) return "Snapchat";
    if (lower.includes("dribbble.com")) return "Dribbble";
    if (lower.includes("soundcloud.com")) return "SoundCloud";
    if (lower.includes("threads.net")) return "Threads";
    if (lower.includes("quora.com")) return "Quora";
    if (lower.includes("stackoverflow.com")) return "Stack Overflow";
    if (lower.includes("t.me/")) return "Telegram";
    return "Other";
}

// Main search function
export async function searchPersonByName(
    fullName: string,
): Promise<PersonSearchResult> {
    console.log(`\n🧑 ============================================`);
    console.log(`🧑 PERSON SEARCH: "${fullName}"`);
    console.log(`🧑 Strategy: Name-First Discovery → Platform-Gap Filling`);
    console.log(`🧑 ============================================\n`);

    const discoveredProfiles: ProfileResult[] = [];
    const identityMap = new Map<string, PlatformIdentity>();

    // PHASE 1: Discover real identities (Tavily + APIs)
    console.log(`📡 Phase 1: Discovering real usernames for "${fullName}"...\n`);

    // ── 1A: Tavily name search (multiple platform-targeted queries) ──
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey) {
        console.log(`  🔍 1A: Tavily name search (multi-query strategy)...`);

        // Split into focused query groups so LinkedIn doesn't drown out other results.
        // Each group uses a neutral query (no "official OR verified" bias) and
        // restricts to specific domains so every platform gets fair coverage.
        const queryGroups: { label: string; query: string; domains: string[] }[] = [
            {
                label: "Professional & Dev",
                query: `"${fullName}" profile`,
                domains: ["linkedin.com", "github.com", "stackoverflow.com", "dev.to"],
            },
            {
                label: "Major social",
                query: `"${fullName}" profile account`,
                domains: ["instagram.com", "x.com", "twitter.com", "facebook.com", "threads.net"],
            },
            {
                label: "Video & creative",
                query: `"${fullName}" channel profile`,
                domains: ["youtube.com", "tiktok.com", "twitch.tv", "behance.net", "dribbble.com", "soundcloud.com"],
            },
            {
                label: "Forums & other",
                query: `"${fullName}" profile`,
                domains: ["reddit.com", "medium.com", "quora.com", "pinterest.com", "mastodon.social", "t.me", "snapchat.com"],
            },
        ];

        // Run all query groups in parallel for speed
        const groupResults = await Promise.all(
            queryGroups.map(async (group) => {
                console.log(`    🔍 Searching: ${group.label}...`);
                return searchWithTavily(group.query, tavilyKey, {
                    includeDomains: group.domains,
                    maxResults: 8,
                });
            }),
        );

        const allTavilyResults = groupResults.flat();
        console.log(`    📡 Total Tavily results across all groups: ${allTavilyResults.length}`);

        for (const result of allTavilyResults) {
            const platform = detectPlatformFromUrl(result.url);
            const username = extractUsernameFromUrl(result.url);
            const urlLower = result.url.toLowerCase();

            // Filter out non-profile URLs
            if (platform === "Facebook") {
                if (
                    urlLower.includes("/groups/") ||
                    urlLower.includes("/posts/") ||
                    urlLower.includes("/photos/") ||
                    urlLower.includes("/videos/") ||
                    urlLower.includes("/pub/dir/")
                ) {
                    console.log(`    ⏭️ Skipping non-profile Facebook URL: ${result.url}`);
                    continue;
                }
            }
            if (platform === "LinkedIn") {
                if (
                    urlLower.includes("/pub/dir/") ||
                    urlLower.includes("/company/") ||
                    urlLower.includes("/posts/") ||
                    !urlLower.includes("/in/")
                ) {
                    console.log(`    ⏭️ Skipping non-profile LinkedIn URL: ${result.url}`);
                    continue;
                }
            }

            if (platform !== "Other") {
                if (username && !isUsernameRelevant(username, fullName)) {
                    console.log(
                        `    ⏭️ Skipping unrelated username: "${username}" (not related to "${fullName}")`,
                    );
                    continue;
                }

                // Skip duplicates from overlapping query groups
                const isDupe = discoveredProfiles.some(
                    (p) => p.platform === platform && p.url === result.url,
                );
                if (isDupe) continue;

                console.log(
                    `    ✅ Tavily found ${platform}: ${result.url}${username ? ` (username: ${username})` : ""}`,
                );

                // Record in identity map — platform-specific
                if (username && !identityMap.has(platform)) {
                    identityMap.set(platform, {
                        username: username.toLowerCase(),
                        confidence: "high",
                        source: "tavily",
                    });
                }

                discoveredProfiles.push({
                    platform,
                    url: result.url,
                    found: true,
                    confidence: "high",
                    checkedAt: new Date(),
                });
            }
        }
        console.log(`    📊 Tavily discovered ${discoveredProfiles.length} profiles\n`);
    } else {
        console.log(`  ⚠️ 1A: Tavily API key not set, skipping\n`);
    }

    // ── 1B: GitHub API user search by name ──
    console.log(`  🔍 1B: GitHub API user search...`);
    try {
        const ghResponse = await fetch(
            `https://api.github.com/search/users?q=${encodeURIComponent(fullName)}&per_page=5`,
            {
                headers: { Accept: "application/vnd.github.v3+json" },
                signal: AbortSignal.timeout(8000),
            },
        );
        if (ghResponse.ok) {
            const ghData = await ghResponse.json();
            const users = ghData.items || [];
            for (const user of users) {
                console.log(`✅ GitHub user: ${user.login} (${user.html_url})`);

                if (!identityMap.has("GitHub")) {
                    identityMap.set("GitHub", {
                        username: user.login.toLowerCase(),
                        confidence: "high",
                        source: "github-api",
                    });
                }

                discoveredProfiles.push({
                    platform: "GitHub",
                    url: user.html_url,
                    found: true,
                    confidence: "high",
                    checkedAt: new Date(),
                });
            }
            console.log(`📊 GitHub found ${users.length} users\n`);
        } else {
            console.log(`⚠️ GitHub API returned ${ghResponse.status}\n`);
        }
    } catch (error) {
        console.log(
            `⚠️ GitHub API error: ${error instanceof Error ? error.message : error}\n`,
        );
    }

    // PHASE 2: Fill platform gaps
    const confirmedPlatforms = new Set(identityMap.keys());

    // Collect unique candidate usernames from the identity map
    const candidateUsernames = Array.from(
        new Set(Array.from(identityMap.values()).map((id) => id.username)),
    )
        .filter((u) => {
            // Remove LinkedIn slugs (contain random IDs like a617b6197)
            if (/[a-f0-9]{6,}$/i.test(u)) {
                console.log(`  ⏭️ Skipping LinkedIn slug: "${u}"`);
                return false;
            }
            return true;
        })
        .slice(0, 5);

    // Determine which platforms Phase 1 did NOT cover
    const missingPlatforms = ALL_PLATFORM_NAMES.filter(
        (p) => !confirmedPlatforms.has(p),
    );

    console.log(
        `🔎 Phase 2: Filling gaps — ${candidateUsernames.length} candidate username(s), ${missingPlatforms.length} uncovered platform(s)`,
    );
    console.log(
        `   Already confirmed: ${Array.from(confirmedPlatforms).join(", ") || "none"}`,
    );
    console.log(
        `   Missing platforms: ${missingPlatforms.join(", ") || "none"}\n`,
    );

    // Track which platforms get filled during Phase 2 so we shrink the target list
    const remainingPlatforms = new Set(missingPlatforms);

    for (const username of candidateUsernames) {
        if (remainingPlatforms.size === 0) {
            console.log(`  ✅ All platforms covered, stopping Phase 2 early`);
            break;
        }

        const targetPlatforms = Array.from(remainingPlatforms);
        console.log(
            `  🔍 Checking "${username}" on ${targetPlatforms.length} missing platform(s)...`,
        );

        try {
            const result = await searchUsernameOnPlatforms(username, targetPlatforms);
            if (result.found) {
                for (const profile of result.profiles) {
                    if (!profile.found) continue;

                    const alreadyFound = discoveredProfiles.some(
                        (p) => p.platform === profile.platform && p.url === profile.url,
                    );
                    if (!alreadyFound) {
                        console.log(
                            `    ✅ NEW: ${profile.platform} (${profile.confidence} confidence)`,
                        );
                        discoveredProfiles.push(profile);

                        // Update identity map and shrink remaining platforms
                        identityMap.set(profile.platform, {
                            username: username,
                            confidence: profile.confidence || "medium",
                            source: "phase2-check",
                        });
                        remainingPlatforms.delete(profile.platform);
                    }
                }
            }
        } catch (error) {
            console.log(
                `    ⚠️ Error checking "${username}": ${error instanceof Error ? error.message : error}`,
            );
        }
    }

    // MERGE & DEDUPLICATE
    const platformMap = new Map<string, ProfileResult>();
    for (const profile of discoveredProfiles) {
        if (!profile.found) continue;
        const key = profile.platform + ":" + profile.url;
        const existing = platformMap.get(key);
        if (
            !existing ||
            (profile.confidence === "high" && existing.confidence !== "high") ||
            (profile.confidence === "medium" && existing.confidence === "low")
        ) {
            platformMap.set(key, profile);
        }
    }

    const finalProfiles = Array.from(platformMap.values()).sort((a, b) => {
        const order = { high: 3, medium: 2, low: 1 };
        return (
            (order[b.confidence || "low"] || 0) -
            (order[a.confidence || "low"] || 0)
        );
    });

    // Convert identity map to serializable form
    const serializedIdentityMap: IdentityMap = {};
    identityMap.forEach((value, key) => {
        serializedIdentityMap[key] = value;
    });

    console.log(`\n✅ ============================================`);
    console.log(`✅ PERSON SEARCH COMPLETE: "${fullName}"`);
    console.log(
        `✅ Identity map: ${Object.entries(serializedIdentityMap).map(([p, id]) => `${p}→${id.username}`).join(", ")}`,
    );
    console.log(`✅ Total profiles found: ${finalProfiles.length}`);
    console.log(
        `✅ High confidence: ${finalProfiles.filter((p) => p.confidence === "high").length}`,
    );
    console.log(
        `✅ Medium confidence: ${finalProfiles.filter((p) => p.confidence === "medium").length}`,
    );
    console.log(`✅ ============================================\n`);

    return {
        found: finalProfiles.length > 0,
        profiles: finalProfiles,
        identityMap: serializedIdentityMap,
    };
}