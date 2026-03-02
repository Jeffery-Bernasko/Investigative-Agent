/**
 * Username search — check a username across 20 platforms with strict validation.
 */
import { validateProfile } from "./platform-validator";
import { searchWithTavily } from "./tavily-search";

type ProfileResult = {
    platform: string;
    url: string;
    found: boolean;
    confidence?: "high" | "medium" | "low";
    checkedAt?: Date;
};

interface PlatformConfig {
    name: string;
    urlTemplate: string;
    useAPI?: boolean;
    validate?: boolean;
}

/** Canonical list of all platform names this module knows about. */
export const ALL_PLATFORM_NAMES: string[] = [
    "GitHub", "X", "Instagram", "LinkedIn", "Reddit", "Medium",
    "YouTube", "TikTok", "Facebook", "Twitch", "Discord", "Telegram",
    "Pinterest", "Snapchat", "Dev.to", "Stack Overflow", "HackerNews",
    "Mastodon", "Patreon", "Behance",
];

/** Strip @ prefix and whitespace from a raw username. */
export function cleanUsername(username: string): string {
    return username.replace(/^@/, "").trim().toLowerCase();
}

/** Build platform check configs for a given username, optionally filtered to specific platforms. */
function buildPlatformConfigs(username: string, filterPlatforms?: string[]): PlatformConfig[] {
    const all: PlatformConfig[] = [
        { name: "GitHub", urlTemplate: `https://github.com/${username}`, useAPI: true },
        { name: "X", urlTemplate: `https://x.com/${username}`, validate: true },
        { name: "Instagram", urlTemplate: `https://instagram.com/${username}`, validate: true },
        { name: "LinkedIn", urlTemplate: `https://linkedin.com/in/${username}`, validate: true },
        { name: "Reddit", urlTemplate: `https://reddit.com/user/${username}`, validate: true },
        { name: "Medium", urlTemplate: `https://medium.com/@${username}`, validate: true },
        { name: "YouTube", urlTemplate: `https://youtube.com/@${username}`, validate: true },
        { name: "TikTok", urlTemplate: `https://tiktok.com/@${username}`, validate: true },
        { name: "Facebook", urlTemplate: `https://facebook.com/${username}`, validate: true },
        { name: "Twitch", urlTemplate: `https://twitch.tv/${username}`, validate: true },
        { name: "Discord", urlTemplate: `https://discord.com/users/${username}`, validate: true },
        { name: "Telegram", urlTemplate: `https://t.me/${username}`, validate: true },
        { name: "Pinterest", urlTemplate: `https://pinterest.com/${username}`, validate: true },
        { name: "Snapchat", urlTemplate: `https://snapchat.com/add/${username}`, validate: true },
        { name: "Dev.to", urlTemplate: `https://dev.to/${username}`, validate: true },
        { name: "Stack Overflow", urlTemplate: `https://stackoverflow.com/users/${username}`, validate: true },
        { name: "HackerNews", urlTemplate: `https://news.ycombinator.com/user?id=${username}`, validate: true },
        { name: "Mastodon", urlTemplate: `https://mastodon.social/@${username}`, validate: true },
        { name: "Patreon", urlTemplate: `https://patreon.com/${username}`, validate: true },
        { name: "Behance", urlTemplate: `https://behance.net/${username}`, validate: true },
    ];

    if (!filterPlatforms) return all;

    const filterSet = new Set(filterPlatforms);
    return all.filter((p) => filterSet.has(p.name));
}

/** Enhanced username search with strict validation and Tavily enrichment. */
export async function searchUsername(rawUsername: string): Promise<{
    found: boolean;
    profiles: Array<{
        platform: string;
        url: string;
        found: boolean;
        confidence?: "high" | "medium" | "low";
        checkedAt?: Date;
    }>;
}> {
    const username = cleanUsername(rawUsername);
    console.log(
        `🔍 Searching for username: ${username} (cleaned from: ${rawUsername})`
    );

    const platforms = buildPlatformConfigs(username);

    console.log(
        `\n📡 Checking ${platforms.length} platforms with strict validation...`
    );

    const checkPromises = platforms.map(async (platform) => {
        try {
            // GitHub API check (most reliable)
            if (platform.useAPI && platform.name === "GitHub") {
                try {
                    const response = await fetch(
                        `https://api.github.com/users/${username}`,
                        {
                            headers: { Accept: "application/vnd.github.v3+json" },
                            signal: AbortSignal.timeout(5000),
                        }
                    );
                    const found = response.ok;
                    if (found) {
                        console.log(`✅ ${platform.name}: Found (API check)`);
                    } else {
                        console.log(`❌ ${platform.name}: Not found (API check)`);
                    }
                    return {
                        platform: platform.name,
                        url: platform.urlTemplate,
                        found,
                        confidence: found ? ("high" as const) : ("low" as const),
                        checkedAt: new Date(),
                    };
                } catch {
                    console.log(`⚠️ ${platform.name}: API timeout`);
                    return {
                        platform: platform.name,
                        url: platform.urlTemplate,
                        found: false,
                        confidence: "low" as const,
                        checkedAt: new Date(),
                    };
                }
            }

            // Content validation for other platforms
            const validation = await validateProfile(
                platform.urlTemplate,
                platform.name,
                username
            );

            if (validation.exists) {
                console.log(
                    `✅ ${platform.name}: Found (${validation.confidence} confidence)`
                );
            } else {
                console.log(`❌ ${platform.name}: Not found`);
            }

            return {
                platform: platform.name,
                url: platform.urlTemplate,
                found: validation.exists,
                confidence: validation.confidence,
                checkedAt: new Date(),
            };
        } catch (error: any) {
            console.error(`⚠️ ${platform.name}: ${error.message}`);
            return {
                platform: platform.name,
                url: platform.urlTemplate,
                found: false,
                confidence: "low" as const,
                checkedAt: new Date(),
            };
        }
    });

    const profiles = await Promise.all(checkPromises);
    let foundProfiles = profiles.filter((p) => p.found);

    console.log(
        `\n📊 Direct Check Results: ${foundProfiles.length}/${platforms.length} found`
    );

    // Enrich with Tavily (which provides verified results)
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey) {
        console.log(`\n🌐 Enriching with Tavily AI search...`);
        const webResults = await searchWithTavily(
            `"${username}" social media profile`,
            tavilyKey
        );

        console.log(`\n🔍 Processing ${webResults.length} Tavily results...`);

        webResults.forEach((result) => {
            const url = result.url.toLowerCase();
            let platform = "Other";
            let profileUrl = result.url;

            if (url.includes("github.com/") && url.includes(username)) {
                platform = "GitHub";
                profileUrl = `https://github.com/${username}`;
            } else if (
                (url.includes("x.com/") || url.includes("x.com/")) &&
                url.includes(username)
            ) {
                platform = "Twitter";
                profileUrl = `https://x.com/${username}`;
            } else if (url.includes("linkedin.com/in/")) {
                platform = "LinkedIn";
                profileUrl = result.url;
            } else if (
                url.includes("instagram.com/") &&
                url.includes(username)
            ) {
                platform = "Instagram";
                profileUrl = `https://instagram.com/${username}`;
            } else if (url.includes("facebook.com/")) {
                platform = "Facebook";
                profileUrl = result.url;
            } else if (
                url.includes("reddit.com/user/") &&
                url.includes(username)
            ) {
                platform = "Reddit";
                profileUrl = `https://reddit.com/user/${username}`;
            } else if (
                url.includes("medium.com/@") &&
                url.includes(username)
            ) {
                platform = "Medium";
                profileUrl = `https://medium.com/@${username}`;
            } else if (
                url.includes("youtube.com/@") &&
                url.includes(username)
            ) {
                platform = "YouTube";
                profileUrl = `https://youtube.com/@${username}`;
            }

            const existing = foundProfiles.find((p) => p.platform === platform);

            if (existing) {
                if (existing.confidence !== "high") {
                    console.log(
                        `  ⬆️ ${platform}: Upgraded to HIGH confidence (Tavily confirmed)`
                    );
                    existing.confidence = "high";
                    existing.url = profileUrl;
                }
            } else if (platform !== "Other") {
                console.log(
                    `✨ ${platform}: NEW profile discovered (Tavily - HIGH confidence)`
                );
                foundProfiles.push({
                    platform,
                    url: profileUrl,
                    found: true,
                    confidence: "high",
                    checkedAt: new Date(),
                });
            }
        });
    }

    // Remove duplicates — keep highest confidence per platform
    const platformMap = new Map<string, (typeof foundProfiles)[0]>();
    foundProfiles.forEach((profile) => {
        const existing = platformMap.get(profile.platform);
        if (
            !existing ||
            (profile.confidence === "high" && existing.confidence !== "high") ||
            (profile.confidence === "medium" && existing.confidence === "low")
        ) {
            platformMap.set(profile.platform, profile);
        }
    });
    foundProfiles = Array.from(platformMap.values());

    // Sort by confidence
    foundProfiles.sort((a, b) => {
        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        return (
            confidenceOrder[b.confidence || "low"] -
            confidenceOrder[a.confidence || "low"]
        );
    });

    console.log(`\n✅ Final Results (Strict Validation):`);
    console.log(`  Total platforms checked: ${platforms.length}`);
    console.log(`  Profiles found: ${foundProfiles.length}`);
    console.log(
        `  High confidence: ${foundProfiles.filter((p) => p.confidence === "high").length}`
    );
    console.log(
        `  Medium confidence: ${foundProfiles.filter((p) => p.confidence === "medium").length}`
    );

    return {
        found: foundProfiles.length > 0,
        profiles: foundProfiles,
    };
}

/**
 * Search for a username on a SPECIFIC subset of platforms.
 * Used by person-search Phase 2 to only fill platform gaps.
 */
export async function searchUsernameOnPlatforms(
    rawUsername: string,
    targetPlatforms: string[],
): Promise<{ found: boolean; profiles: ProfileResult[] }> {
    const username = cleanUsername(rawUsername);
    console.log(
        `🔍 Targeted search: "${username}" on ${targetPlatforms.length} platform(s)`,
    );

    const platforms = buildPlatformConfigs(username, targetPlatforms);

    if (platforms.length === 0) {
        console.log(`  ⚠️ No matching platforms to check`);
        return { found: false, profiles: [] };
    }

    const checkPromises = platforms.map(async (platform) => {
        try {
            if (platform.useAPI && platform.name === "GitHub") {
                try {
                    const response = await fetch(
                        `https://api.github.com/users/${username}`,
                        {
                            headers: { Accept: "application/vnd.github.v3+json" },
                            signal: AbortSignal.timeout(5000),
                        },
                    );
                    const found = response.ok;
                    if (found) console.log(`  ✅ ${platform.name}: Found (API)`);
                    else console.log(`  ❌ ${platform.name}: Not found (API)`);
                    return {
                        platform: platform.name,
                        url: platform.urlTemplate,
                        found,
                        confidence: found ? ("high" as const) : ("low" as const),
                        checkedAt: new Date(),
                    };
                } catch {
                    return {
                        platform: platform.name,
                        url: platform.urlTemplate,
                        found: false,
                        confidence: "low" as const,
                        checkedAt: new Date(),
                    };
                }
            }

            const validation = await validateProfile(
                platform.urlTemplate,
                platform.name,
                username,
            );

            if (validation.exists) {
                console.log(`  ✅ ${platform.name}: Found (${validation.confidence})`);
            } else {
                console.log(`  ❌ ${platform.name}: Not found`);
            }

            return {
                platform: platform.name,
                url: platform.urlTemplate,
                found: validation.exists,
                confidence: validation.confidence,
                checkedAt: new Date(),
            };
        } catch (error: any) {
            console.error(`  ⚠️ ${platform.name}: ${error.message}`);
            return {
                platform: platform.name,
                url: platform.urlTemplate,
                found: false,
                confidence: "low" as const,
                checkedAt: new Date(),
            };
        }
    });

    const results = await Promise.all(checkPromises);
    const foundProfiles = results.filter((p) => p.found);

    console.log(
        `  📊 Targeted check: ${foundProfiles.length}/${platforms.length} found`,
    );

    return {
        found: foundProfiles.length > 0,
        profiles: foundProfiles,
    };
}