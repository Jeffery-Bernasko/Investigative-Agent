/**
 * Name-first person search — discover social profiles by full name.
 */

import { searchUsernameOnPlatforms, ALL_PLATFORM_NAMES } from "./username-search";
import { searchWithTavily } from "./tavily-search";

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
    personalWebsites: Array<{ url: string; title: string; snippet: string }>;
}

/**
 * Check whether a discovered username is plausibly related to the target name.
 *
 * For multi-part names (e.g. "Cedric Amoah"), a single first-name match is NOT
 * enough — we require evidence of BOTH parts to avoid false positives like
 * "Cedric Dzelu" matching when searching for "Cedric Amoah".
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

    // 1. Concatenation match — "cedricamoah" or "amoahcedric"
    const concatenated = nameParts.join("");
    if (cleaned.includes(concatenated) || concatenated.includes(cleaned)) return true;

    const reversed = [...nameParts].reverse().join("");
    if (cleaned.includes(reversed) || reversed.includes(cleaned)) return true;

    // 2. For single-part names, any substring match is fine
    if (nameParts.length === 1) {
        return cleaned.includes(nameParts[0]);
    }

    // 3. For multi-part names, require ALL parts to appear in the username
    const allPartsMatch = nameParts.every((part) => cleaned.includes(part));
    if (allPartsMatch) return true;

    // 4. Initials directly adjacent to last name — e.g. "camoah", "jbamoah"
    const initials = nameParts.map((p) => p[0]).join("");
    const lastName = nameParts[nameParts.length - 1];
    const firstName = nameParts[0];
    // "camoah" or "jbamoah" — initials immediately followed by last name
    if (cleaned.includes(initials + lastName)) return true;
    // "amoahca" or "amoahjb" — last name immediately followed by initials
    if (cleaned.includes(lastName + initials)) return true;
    // Single first initial: "camoah" — first initial directly before last name
    if (cleaned.includes(firstName[0] + lastName)) return true;
    // "amoahc" — last name directly followed by first initial
    if (cleaned.includes(lastName + firstName[0])) return true;

    return false;
}
// URL utilities
/** Extract username from a social profile URL. */
export function extractUsernameFromUrl(url: string): string | null {
    // Strip query params and hash before matching so URLs like
    // linkedin.com/in/user?trk=... still extract correctly.
    const cleanUrl = url.split(/[?#]/)[0].replace(/\/+$/, "");

    const patterns: { regex: RegExp; group: number }[] = [
        { regex: /github\.com\/([A-Za-z0-9_-]+)$/i, group: 1 },
        { regex: /(?:twitter|x)\.com\/([A-Za-z0-9_]+)$/i, group: 1 },
        { regex: /instagram\.com\/([A-Za-z0-9_.]+)$/i, group: 1 },
        { regex: /linkedin\.com\/in\/([A-Za-z0-9_-]+)$/i, group: 1 },
        { regex: /facebook\.com\/([A-Za-z0-9_.]+)$/i, group: 1 },
        { regex: /reddit\.com\/user\/([A-Za-z0-9_-]+)$/i, group: 1 },
        { regex: /medium\.com\/@?([A-Za-z0-9_.-]+)$/i, group: 1 },
        { regex: /youtube\.com\/@([A-Za-z0-9_.-]+)$/i, group: 1 },
        { regex: /tiktok\.com\/@([A-Za-z0-9_.]+)$/i, group: 1 },
        { regex: /twitch\.tv\/([A-Za-z0-9_]+)$/i, group: 1 },
        { regex: /dev\.to\/([A-Za-z0-9_]+)$/i, group: 1 },
        { regex: /behance\.net\/([A-Za-z0-9_-]+)$/i, group: 1 },
        { regex: /pinterest\.com\/([A-Za-z0-9_-]+)$/i, group: 1 },
        { regex: /snapchat\.com\/add\/([A-Za-z0-9_.-]+)$/i, group: 1 },
        { regex: /dribbble\.com\/([A-Za-z0-9_-]+)$/i, group: 1 },
        { regex: /soundcloud\.com\/([A-Za-z0-9_-]+)$/i, group: 1 },
        { regex: /mastodon\.social\/@([A-Za-z0-9_]+)$/i, group: 1 },
        { regex: /threads\.net\/@([A-Za-z0-9_.]+)$/i, group: 1 },
        { regex: /quora\.com\/profile\/([A-Za-z0-9_-]+)$/i, group: 1 },
        { regex: /stackoverflow\.com\/users\/\d+\/([A-Za-z0-9_-]+)$/i, group: 1 },
        { regex: /t\.me\/([A-Za-z0-9_]+)$/i, group: 1 },
    ];

    for (const { regex, group } of patterns) {
        const match = cleanUrl.match(regex);
        if (match) return match[group];
    }
    return null;
}

/** Check if a URL points to an actual profile page (not a post, reel, video, etc.) */
function isProfileUrl(url: string, platform: string): boolean {
    const lower = url.toLowerCase();

    if (platform === "Instagram") {
        // Only accept instagram.com/<username>/ — reject reels, posts, stories, etc.
        if (/\/(reel|reels|p|stories|tv|explore|s)\//i.test(lower)) return false;
    }
    if (platform === "TikTok") {
        // Only accept tiktok.com/@username — reject /video/, /photo/, etc.
        if (/\/@[^/]+\/(video|photo|live)/i.test(lower)) return false;
        // Reject URLs without @ (trending, discover pages)
        if (lower.includes("tiktok.com/") && !lower.includes("/@")) return false;
    }
    if (platform === "YouTube") {
        // Only accept youtube.com/@username or /channel/ — reject /watch, /shorts, /playlist
        if (/\/(watch|shorts|playlist|embed)\b/i.test(lower)) return false;
    }
    if (platform === "Facebook") {
        if (/\/(groups|posts|photos|videos|pub\/dir|watch|events|marketplace)\//i.test(lower)) return false;
    }
    if (platform === "LinkedIn") {
        if (/\/(pub\/dir|company|posts|pulse|feed|jobs)\//i.test(lower)) return false;
        if (!lower.includes("/in/")) return false;
    }
    if (platform === "Reddit") {
        // Only accept reddit.com/user/<name> — reject /r/ posts
        if (/\/r\//i.test(lower) && !/\/user\//i.test(lower)) return false;
        if (/\/comments\//i.test(lower)) return false;
    }
    if (platform === "X") {
        if (/\/status\//i.test(lower)) return false;
    }

    return true;
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
    const personalWebsites: Array<{ url: string; title: string; snippet: string }> = [];

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

        // Build name parts for content-level relevance checks
        const searchNameParts = fullName.toLowerCase().split(/\s+/).filter((p) => p.length >= 2);
        const searchLastName = searchNameParts.length >= 2 ? searchNameParts[searchNameParts.length - 1] : null;
        const fullNameLower = fullName.toLowerCase();

        for (const result of allTavilyResults) {
            const platform = detectPlatformFromUrl(result.url);
            const username = extractUsernameFromUrl(result.url);

            // Filter out non-profile URLs (reels, posts, videos, etc.)
            if (platform !== "Other" && !isProfileUrl(result.url, platform)) {
                console.log(`    ⏭️ Skipping non-profile ${platform} URL: ${result.url}`);
                continue;
            }

            // Relevance gate: require strong evidence this result belongs to the target.
            if (platform !== "Other") {
                const titleLower = result.title.toLowerCase();

                // Check 1: Does the title contain ALL name parts? (strongest signal)
                const titleHasAllParts = searchNameParts.every((part) => titleLower.includes(part));

                // Check 2: Does the URL username match the target name?
                const usernameMatches = username && isUsernameRelevant(username, fullName);

                if (!titleHasAllParts && !usernameMatches) {
                    console.log(
                        `    ⏭️ Skipping — title doesn't contain full name: "${result.title}" (${result.url})`,
                    );
                    continue;
                }

                // Skip duplicates from overlapping query groups (compare by platform, ignoring URL variants)
                const isDupe = discoveredProfiles.some((p) => {
                    if (p.platform !== platform) return false;
                    // Same URL (ignoring query params/trailing slashes)
                    const normalizeUrl = (u: string) => u.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
                    if (normalizeUrl(p.url) === normalizeUrl(result.url)) return true;
                    // Same username on the same platform
                    if (username) {
                        const existingUsername = extractUsernameFromUrl(p.url);
                        if (existingUsername?.toLowerCase() === username.toLowerCase()) return true;
                    }
                    return false;
                });
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
            } else {
                // Non-social URL — potential personal website
                const snippetLower = (result.snippet || "").toLowerCase();
                const titleLower = result.title.toLowerCase();
                // Check title or snippet contain the person's name
                const nameMatch = searchNameParts.some((part) => titleLower.includes(part) || snippetLower.includes(part));
                if (nameMatch) {
                    const isDupe = personalWebsites.some((w) => w.url === result.url);
                    if (!isDupe) {
                        console.log(`    🌐 Potential personal website: ${result.url}`);
                        personalWebsites.push({
                            url: result.url,
                            title: result.title,
                            snippet: result.snippet,
                        });
                    }
                }
            }
        }
        console.log(`    📊 Tavily discovered ${discoveredProfiles.length} profiles, ${personalWebsites.length} potential website(s)\n`);

        // ── 1A-Web: Open-web search for personal websites and social profiles ──
        console.log(`  🌐 1A-Web: Searching open web for profiles and personal websites...`);
        const webQueries = [
            `"${fullName}" official website`,
            `"${fullName}" portfolio site`,
            `"${fullName}" profiles`,
        ];
        // Use searchWithTavily with an empty includeDomains list so no domain
        // filter is sent — equivalent to a full open-web search.
        const webSearchResults = await Promise.all(
            webQueries.map((q) => searchWithTavily(q, tavilyKey, { includeDomains: [], maxResults: 5 })),
        );

        for (const result of webSearchResults.flat()) {
            const platform = detectPlatformFromUrl(result.url);
            const username = extractUsernameFromUrl(result.url);

            if (platform !== "Other") {
                // Social URL found in general search — apply same relevance + dedup logic
                if (!isProfileUrl(result.url, platform)) continue;
                const titleLower = result.title.toLowerCase();
                const snippetLower = (result.snippet || "").toLowerCase();
                const titleHasAllParts = searchNameParts.every((part) => titleLower.includes(part));
                const snippetHasAllParts = searchNameParts.every((part) => snippetLower.includes(part));
                const usernameMatches = username && isUsernameRelevant(username, fullName);
                if (!titleHasAllParts && !snippetHasAllParts && !usernameMatches) continue;

                const isDupe = discoveredProfiles.some((p) => {
                    if (p.platform !== platform) return false;
                    const normalizeUrl = (u: string) => u.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
                    if (normalizeUrl(p.url) === normalizeUrl(result.url)) return true;
                    if (username) {
                        const existingUsername = extractUsernameFromUrl(p.url);
                        if (existingUsername?.toLowerCase() === username.toLowerCase()) return true;
                    }
                    return false;
                });
                if (isDupe) continue;

                console.log(`    ✅ General search found ${platform}: ${result.url}`);
                if (username && !identityMap.has(platform)) {
                    identityMap.set(platform, { username: username.toLowerCase(), confidence: "medium", source: "tavily" });
                }
                discoveredProfiles.push({ platform, url: result.url, found: true, confidence: "medium", checkedAt: new Date() });
                continue;
            }

            // "Other" = potential personal website
            const titleLower = result.title.toLowerCase();
            const snippetLower = (result.snippet || "").toLowerCase();
            const namePartsLocal = fullName.toLowerCase().split(/\s+/).filter((p) => p.length >= 2);
            const nameMatch = namePartsLocal.some(
                (part) => titleLower.includes(part) || snippetLower.includes(part),
            );
            if (!nameMatch) continue;

            const isDupe = personalWebsites.some((w) => w.url === result.url);
            if (!isDupe) {
                console.log(`    🌐 Personal website found: ${result.url}`);
                personalWebsites.push({
                    url: result.url,
                    title: result.title,
                    snippet: result.snippet,
                });
            }
        }
        console.log(`    📊 After open-web search: ${discoveredProfiles.length} profiles, ${personalWebsites.length} website(s)\n`);
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
            let accepted = 0;
            for (const user of users) {
                // Filter: username must be relevant to the target name
                if (!isUsernameRelevant(user.login, fullName)) {
                    console.log(`    ⏭️ Skipping unrelated GitHub user: "${user.login}"`);
                    continue;
                }

                console.log(`    ✅ GitHub user: ${user.login} (${user.html_url})`);
                accepted++;

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
            console.log(`    📊 GitHub: ${accepted} relevant out of ${users.length} results\n`);
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

    // MERGE & DEDUPLICATE (by platform + normalized URL or username)
    const platformMap = new Map<string, ProfileResult>();
    for (const profile of discoveredProfiles) {
        if (!profile.found) continue;
        const normalizedUrl = profile.url.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
        const profileUsername = extractUsernameFromUrl(profile.url);
        // Prefer username-based key (catches URL variants), fall back to normalized URL
        const key = profileUsername
            ? profile.platform + ":" + profileUsername.toLowerCase()
            : profile.platform + ":" + normalizedUrl;
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
        personalWebsites,
    };
}