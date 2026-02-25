/**
 * Name-first person search — discover social profiles by full name.
 */

import { searchUsername } from "./username-search";
import { searchWithTavily } from "./tavily-search";

export type ProfileResult = {
    platform: string;
    url: string;
    found: boolean;
    confidence?: "high" | "medium" | "low";
    checkedAt?: Date;
};

/** Check whether a discovered username is plausibly related to the target name. */
export function isUsernameRelevant(
    username: string,
    targetName: string
): boolean {
    const nameParts = targetName
        .toLowerCase()
        .split(/\s+/)
        .filter((p) => p.length >= 2);
    const lowerUsername = username.toLowerCase().replace(/[-_.]/g, "");

    const hasNamePart = nameParts.some((part) => lowerUsername.includes(part));

    const concatenated = nameParts.join("");
    const isVariation =
        lowerUsername.includes(concatenated) ||
        concatenated.includes(lowerUsername);

    return hasNamePart || isVariation;
}

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
    return "Other";
}

export async function searchPersonByName(
    fullName: string
): Promise<{
    found: boolean;
    profiles: ProfileResult[];
}> {
    console.log(`\n🧑 ============================================`);
    console.log(`🧑 PERSON SEARCH: "${fullName}"`);
    console.log(`🧑 Strategy: Name-First Discovery → Username Verification`);
    console.log(`🧑 ============================================\n`);

    const discoveredProfiles: ProfileResult[] = [];
    const discoveredUsernames = new Set<string>();

    console.log(
        `📡 Phase 1: Discovering real usernames for "${fullName}"...\n`
    );

    // 1A: Tavily name search
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey) {
        console.log(`  🔍 1A: Tavily name search...`);
        const tavilyResults = await searchWithTavily(
            `"${fullName}" social media profile site:linkedin.com OR site:instagram.com OR site:x.com OR site:github.com OR site:facebook.com OR site:tiktok.com`,
            tavilyKey
        );

        for (const result of tavilyResults) {
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
                    console.log(
                        `    ⏭️ Skipping non-profile Facebook URL: ${result.url}`
                    );
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
                    console.log(
                        `    ⏭️ Skipping non-profile LinkedIn URL: ${result.url}`
                    );
                    continue;
                }
            }

            if (platform !== "Other") {
                if (username && !isUsernameRelevant(username, fullName)) {
                    console.log(
                        `    ⏭️ Skipping unrelated username: "${username}" (not related to "${fullName}")`
                    );
                    continue;
                }
                console.log(
                    `    ✅ Tavily found ${platform}: ${result.url}${username ? ` (username: ${username})` : ""}`
                );
                if (username) {
                    discoveredUsernames.add(username.toLowerCase());
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
        console.log(
            `    📊 Tavily discovered ${discoveredProfiles.length} profiles\n`
        );
    } else {
        console.log(`  ⚠️ 1A: Tavily API key not set, skipping\n`);
    }

    // 1B: GitHub API user search by name
    console.log(`  🔍 1B: GitHub API user search...`);
    try {
        const ghResponse = await fetch(
            `https://api.github.com/search/users?q=${encodeURIComponent(fullName)}&per_page=5`,
            {
                headers: { Accept: "application/vnd.github.v3+json" },
                signal: AbortSignal.timeout(8000),
            }
        );
        if (ghResponse.ok) {
            const ghData = await ghResponse.json();
            const users = ghData.items || [];
            for (const user of users) {
                console.log(`    ✅ GitHub user: ${user.login} (${user.html_url})`);
                discoveredUsernames.add(user.login.toLowerCase());
                discoveredProfiles.push({
                    platform: "GitHub",
                    url: user.html_url,
                    found: true,
                    confidence: "high",
                    checkedAt: new Date(),
                });
            }
            console.log(`    📊 GitHub found ${users.length} users\n`);
        } else {
            console.log(`    ⚠️ GitHub API returned ${ghResponse.status}\n`);
        }
    } catch (error) {
        console.log(
            `    ⚠️ GitHub API error: ${error instanceof Error ? error.message : error}\n`
        );
    }

    // Collect platforms already confirmed in Phase 1
    const confirmedPlatforms = new Set<string>(
        discoveredProfiles.filter((p) => p.found).map((p) => p.platform)
    );

    // Filter usernames: remove LinkedIn slugs (contain random IDs like a617b6197)
    const verifiableUsernames = Array.from(discoveredUsernames)
        .filter((u) => {
            if (/[a-f0-9]{6,}$/i.test(u)) {
                console.log(`  ⏭️ Skipping LinkedIn slug: "${u}"`);
                return false;
            }
            return true;
        })
        .slice(0, 5);

    console.log(
        `🔎 Phase 2: Verifying ${verifiableUsernames.length} usernames (${confirmedPlatforms.size} platforms already confirmed)...\n`
    );

    for (const username of verifiableUsernames) {
        console.log(`  🔍 Checking username: "${username}"...`);
        try {
            const result = await searchUsername(username);
            if (result.found) {
                for (const profile of result.profiles) {
                    if (!profile.found) continue;

                    // Skip platforms already confirmed in Phase 1
                    if (confirmedPlatforms.has(profile.platform)) continue;

                    const alreadyFound = discoveredProfiles.some(
                        (p) => p.platform === profile.platform && p.url === profile.url
                    );
                    if (!alreadyFound) {
                        console.log(
                            `    ✅ NEW: ${profile.platform} (${profile.confidence} confidence)`
                        );
                        discoveredProfiles.push(profile);
                        confirmedPlatforms.add(profile.platform);
                    }
                }
            }
        } catch (error) {
            console.log(
                `    ⚠️ Error checking "${username}": ${error instanceof Error ? error.message : error}`
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

    console.log(`\n✅ ============================================`);
    console.log(`✅ PERSON SEARCH COMPLETE: "${fullName}"`);
    console.log(
        `✅ Discovered usernames: ${Array.from(discoveredUsernames).join(", ")}`
    );
    console.log(`✅ Total profiles found: ${finalProfiles.length}`);
    console.log(
        `✅ High confidence: ${finalProfiles.filter((p) => p.confidence === "high").length}`
    );
    console.log(
        `✅ Medium confidence: ${finalProfiles.filter((p) => p.confidence === "medium").length}`
    );
    console.log(`✅ ============================================\n`);

    return {
        found: finalProfiles.length > 0,
        profiles: finalProfiles,
    };
}