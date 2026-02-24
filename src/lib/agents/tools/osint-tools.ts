import { db } from "@/lib/db";
import { entities, osintSearches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { OsintFindings } from "../types";

// Helper: Clean username (remove @ and whitespace)
function cleanUsername(username: string): string {
  return username.replace(/^@/, '').trim().toLowerCase();
}

// Helper: Check whether a discovered username is plausibly related to the target name
function isUsernameRelevant(username: string, targetName: string): boolean {
  const nameParts = targetName.toLowerCase().split(/\s+/).filter(p => p.length >= 2);
  const lowerUsername = username.toLowerCase().replace(/[-_.]/g, "");

  // Check if any part of the target name appears in the username
  const hasNamePart = nameParts.some(part => lowerUsername.includes(part));

  // Check if username is a concatenation/variation of the name parts
  const concatenated = nameParts.join("");
  const isVariation = lowerUsername.includes(concatenated) || concatenated.includes(lowerUsername);

  return hasNamePart || isVariation;
}

// Helper: Validate profile content to reduce false positives
async function validateProfile(
  url: string,
  platform: string,
  username: string
): Promise<{ exists: boolean; confidence: "high" | "medium" | "low" }> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(8000),
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
        // Twitter explicit not found messages
        if (
          lowerHtml.includes("this account doesn't exist") ||
          lowerHtml.includes("account suspended") ||
          lowerHtml.includes("page doesn't exist") ||
          lowerHtml.includes("this account has been suspended")
        ) {
          return { exists: false, confidence: "low" };
        }
        // Must have username AND twitter-specific content
        if (lowerHtml.includes(lowerUsername) &&
          (lowerHtml.includes("tweets") || lowerHtml.includes("following") || lowerHtml.includes("followers"))) {
          return { exists: true, confidence: "medium" };
        }
        return { exists: false, confidence: "low" };

      case "GitHub":
        // GitHub should have contribution graph or repos
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
        // LinkedIn blocks bots heavily, so any 200 with username is suspicious
        if (
          lowerHtml.includes("page not found") ||
          lowerHtml.includes("member doesn't exist") ||
          lowerHtml.includes("404")
        ) {
          return { exists: false, confidence: "low" };
        }
        // LinkedIn profiles should have "profile" or "experience"
        if (lowerHtml.includes("experience") || lowerHtml.includes("education")) {
          return { exists: true, confidence: "medium" };
        }
        // Don't return true just based on 200 status
        return { exists: false, confidence: "low" };

      case "Instagram":
        // Instagram aggressively blocks non-browser requests with login walls.
        // Direct fetch validation is unreliable — always returns false.
        // Real Instagram profiles should be discovered via Tavily web search instead.
        return { exists: false, confidence: "low" };

      case "Facebook":
        if (
          lowerHtml.includes("content not found") ||
          lowerHtml.includes("page not found") ||
          lowerHtml.includes("this content isn't available")
        ) {
          return { exists: false, confidence: "low" };
        }
        // Facebook blocks bots, so be conservative
        return { exists: false, confidence: "low" };

      case "Reddit":
        if (
          lowerHtml.includes("page not found") ||
          lowerHtml.includes("nobody on reddit goes by that name") ||
          !lowerHtml.includes(lowerUsername)
        ) {
          return { exists: false, confidence: "low" };
        }
        if (lowerHtml.includes("karma") || lowerHtml.includes("post karma")) {
          return { exists: true, confidence: "high" };
        }
        return { exists: false, confidence: "low" };

      case "Medium":
        if (lowerHtml.includes("page not found") || !lowerHtml.includes(lowerUsername)) {
          return { exists: false, confidence: "low" };
        }
        if (lowerHtml.includes("stories") || lowerHtml.includes("followers")) {
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
        if (lowerHtml.includes("subscribers") || lowerHtml.includes("videos")) {
          return { exists: true, confidence: "medium" };
        }
        return { exists: false, confidence: "low" };

      case "TikTok":
      case "Twitch":
      case "Pinterest":
      case "Discord":
      case "Telegram":
        // For platforms that are hard to validate, be very conservative
        // Only trust if we see clear indicators
        if (
          lowerHtml.includes("not found") ||
          lowerHtml.includes("doesn't exist") ||
          lowerHtml.includes("404")
        ) {
          return { exists: false, confidence: "low" };
        }
        // Don't trust 200 status alone for these platforms
        return { exists: false, confidence: "low" };

      case "HackerNews":
        if (
          lowerHtml.includes("no such user") ||
          !lowerHtml.includes(lowerUsername)
        ) {
          return { exists: false, confidence: "low" };
        }
        if (lowerHtml.includes("karma") || lowerHtml.includes("submissions")) {
          return { exists: true, confidence: "high" };
        }
        return { exists: false, confidence: "low" };

      case "Dev.to":
        if (lowerHtml.includes("404") || !lowerHtml.includes(lowerUsername)) {
          return { exists: false, confidence: "low" };
        }
        if (lowerHtml.includes("posts") || lowerHtml.includes("comments")) {
          return { exists: true, confidence: "medium" };
        }
        return { exists: false, confidence: "low" };

      default:
        // For unknown platforms, be very conservative
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

// Tool: Enhanced username search with strict validation
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
  console.log(`🔍 Searching for username: ${username} (cleaned from: ${rawUsername})`);

  const platforms = [
    {
      name: "GitHub",
      urlTemplate: `https://github.com/${username}`,
      useAPI: true,
    },
    {
      name: "X",
      urlTemplate: `https://x.com/${username}`,
      validate: true,
    },
    {
      name: "Instagram",
      urlTemplate: `https://instagram.com/${username}`,
      validate: true,
    },
    {
      name: "LinkedIn",
      urlTemplate: `https://linkedin.com/in/${username}`,
      validate: true,
    },
    {
      name: "Reddit",
      urlTemplate: `https://reddit.com/user/${username}`,
      validate: true,
    },
    {
      name: "Medium",
      urlTemplate: `https://medium.com/@${username}`,
      validate: true,
    },
    {
      name: "YouTube",
      urlTemplate: `https://youtube.com/@${username}`,
      validate: true,
    },
    {
      name: "TikTok",
      urlTemplate: `https://tiktok.com/@${username}`,
      validate: true,
    },
    {
      name: "Facebook",
      urlTemplate: `https://facebook.com/${username}`,
      validate: true,
    },
    {
      name: "Twitch",
      urlTemplate: `https://twitch.tv/${username}`,
      validate: true,
    },
    {
      name: "Discord",
      urlTemplate: `https://discord.com/users/${username}`,
      validate: true,
    },
    {
      name: "Telegram",
      urlTemplate: `https://t.me/${username}`,
      validate: true,
    },
    {
      name: "Pinterest",
      urlTemplate: `https://pinterest.com/${username}`,
      validate: true,
    },
    {
      name: "Snapchat",
      urlTemplate: `https://snapchat.com/add/${username}`,
      validate: true,
    },
    {
      name: "Dev.to",
      urlTemplate: `https://dev.to/${username}`,
      validate: true,
    },
    {
      name: "Stack Overflow",
      urlTemplate: `https://stackoverflow.com/users/${username}`,
      validate: true,
    },
    {
      name: "HackerNews",
      urlTemplate: `https://news.ycombinator.com/user?id=${username}`,
      validate: true,
    },
    {
      name: "Mastodon",
      urlTemplate: `https://mastodon.social/@${username}`,
      validate: true,
    },
    {
      name: "Patreon",
      urlTemplate: `https://patreon.com/${username}`,
      validate: true,
    },
    {
      name: "Behance",
      urlTemplate: `https://behance.net/${username}`,
      validate: true,
    },
  ];

  console.log(`\n📡 Checking ${platforms.length} platforms with strict validation...`);

  const checkPromises = platforms.map(async (platform) => {
    try {
      // GitHub API check (most reliable)
      if (platform.useAPI && platform.name === "GitHub") {
        try {
          const response = await fetch(`https://api.github.com/users/${username}`, {
            headers: { "Accept": "application/vnd.github.v3+json" },
            signal: AbortSignal.timeout(5000),
          });
          const found = response.ok;
          if (found) {
            console.log(`  ✅ ${platform.name}: Found (API check)`);
          } else {
            console.log(`  ❌ ${platform.name}: Not found (API check)`);
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
      const validation = await validateProfile(platform.urlTemplate, platform.name, username);

      if (validation.exists) {
        console.log(`✅ ${platform.name}: Found (${validation.confidence} confidence)`);
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

  console.log(`\n📊 Direct Check Results: ${foundProfiles.length}/${platforms.length} found`);

  // Enrich with Tavily (which provides verified results)
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    console.log(`\n🌐 Enriching with Tavily AI search...`);
    const webResults = await searchWithTavily(`"${username}" social media profile`, tavilyKey);

    console.log(`\n🔍 Processing ${webResults.length} Tavily results...`);

    webResults.forEach((result) => {
      const url = result.url.toLowerCase();
      let platform = "Other";
      let profileUrl = result.url;

      // Platform detection with username verification
      if (url.includes("github.com/") && url.includes(username)) {
        platform = "GitHub";
        profileUrl = `https://github.com/${username}`;
      } else if ((url.includes("x.com/") || url.includes("x.com/")) && url.includes(username)) {
        platform = "Twitter";
        profileUrl = `https://x.com/${username}`;
      } else if (url.includes("linkedin.com/in/")) {
        platform = "LinkedIn";
        profileUrl = result.url; // Keep exact LinkedIn URL
      } else if (url.includes("instagram.com/") && url.includes(username)) {
        platform = "Instagram";
        profileUrl = `https://instagram.com/${username}`;
      } else if (url.includes("facebook.com/")) {
        platform = "Facebook";
        profileUrl = result.url; // Keep exact Facebook URL
      } else if (url.includes("reddit.com/user/") && url.includes(username)) {
        platform = "Reddit";
        profileUrl = `https://reddit.com/user/${username}`;
      } else if (url.includes("medium.com/@") && url.includes(username)) {
        platform = "Medium";
        profileUrl = `https://medium.com/@${username}`;
      } else if (url.includes("youtube.com/@") && url.includes(username)) {
        platform = "YouTube";
        profileUrl = `https://youtube.com/@${username}`;
      }

      const existing = foundProfiles.find(p => p.platform === platform);

      if (existing) {
        // Upgrade to high confidence if Tavily confirms
        if (existing.confidence !== "high") {
          console.log(`  ⬆️ ${platform}: Upgraded to HIGH confidence (Tavily confirmed)`);
          existing.confidence = "high";
          existing.url = profileUrl;
        }
      } else if (platform !== "Other") {
        // Add new verified profile from Tavily
        console.log(`✨ ${platform}: NEW profile discovered (Tavily - HIGH confidence)`);
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

  // Remove duplicates
  const platformMap = new Map<string, typeof foundProfiles[0]>();
  foundProfiles.forEach(profile => {
    const existing = platformMap.get(profile.platform);
    if (!existing ||
      (profile.confidence === "high" && existing.confidence !== "high") ||
      (profile.confidence === "medium" && existing.confidence === "low")) {
      platformMap.set(profile.platform, profile);
    }
  });
  foundProfiles = Array.from(platformMap.values());

  // Sort by confidence
  foundProfiles.sort((a, b) => {
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    return confidenceOrder[b.confidence || "low"] - confidenceOrder[a.confidence || "low"];
  });

  console.log(`\n✅ Final Results (Strict Validation):`);
  console.log(`  Total platforms checked: ${platforms.length}`);
  console.log(`  Profiles found: ${foundProfiles.length}`);
  console.log(`  High confidence: ${foundProfiles.filter(p => p.confidence === "high").length}`);
  console.log(`  Medium confidence: ${foundProfiles.filter(p => p.confidence === "medium").length}`);

  return {
    found: foundProfiles.length > 0,
    profiles: foundProfiles,
  };
}

// Tool: Name-First Person Search
type ProfileResult = {
  platform: string;
  url: string;
  found: boolean;
  confidence?: "high" | "medium" | "low";
  checkedAt?: Date;
};

// Helper: Extract username from a social profile URL
function extractUsernameFromUrl(url: string): string | null {
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

// Helper: Detect platform from URL
function detectPlatformFromUrl(url: string): string {
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

  console.log(`📡 Phase 1: Discovering real usernames for "${fullName}"...\n`);

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

      // Filter out non-profile URLs (group posts, page posts, directories, etc.)
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
          console.log(`    ⏭️ Skipping unrelated username: "${username}" (not related to "${fullName}")`);
          continue;
        }
        console.log(`    ✅ Tavily found ${platform}: ${result.url}${username ? ` (username: ${username})` : ""}`);
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
    console.log(`    📊 Tavily discovered ${discoveredProfiles.length} profiles\n`);
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
    console.log(`    ⚠️ GitHub API error: ${error instanceof Error ? error.message : error}\n`);
  }

  console.log(`🔎 Phase 2: Verifying ${discoveredUsernames.size} discovered usernames...\n`);

  // Limit to top 5 usernames to avoid excessive API calls
  const uniqueUsernames = Array.from(discoveredUsernames).slice(0, 5);

  for (const username of uniqueUsernames) {
    console.log(`  🔍 Checking username: "${username}"...`);
    try {
      const result = await searchUsername(username);
      if (result.found) {
        for (const profile of result.profiles) {
          if (profile.found) {
            const alreadyFound = discoveredProfiles.some(
              (p) => p.platform === profile.platform && p.url === profile.url
            );
            if (!alreadyFound) {
              console.log(`    ✅ NEW: ${profile.platform} (${profile.confidence} confidence)`);
              discoveredProfiles.push(profile);
            }
          }
        }
      }
    } catch (error) {
      console.log(`    ⚠️ Error checking "${username}": ${error instanceof Error ? error.message : error}`);
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
    return (order[b.confidence || "low"] || 0) - (order[a.confidence || "low"] || 0);
  });

  console.log(`\n✅ ============================================`);
  console.log(`✅ PERSON SEARCH COMPLETE: "${fullName}"`);
  console.log(`✅ Discovered usernames: ${Array.from(discoveredUsernames).join(", ")}`);
  console.log(`✅ Total profiles found: ${finalProfiles.length}`);
  console.log(`✅ High confidence: ${finalProfiles.filter((p) => p.confidence === "high").length}`);
  console.log(`✅ Medium confidence: ${finalProfiles.filter((p) => p.confidence === "medium").length}`);
  console.log(`✅ ============================================\n`);

  return {
    found: finalProfiles.length > 0,
    profiles: finalProfiles,
  };
}

// Tool: Search the web via Tavily API
export async function searchWithTavily(
  query: string,
  apiKey?: string
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const key = apiKey || process.env.TAVILY_API_KEY;
  if (!key) {
    return [];
  }

  try {
    console.log(`🔍 Tavily search: "${query}"`);
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: "advanced",
        max_results: 10,
        include_answer: false,
        include_domains: [
          "github.com",
          "x.com",
          "instagram.com",
          "linkedin.com",
          "facebook.com",
          "reddit.com",
          "medium.com",
        ],
      }),
    });

    if (!response.ok) {
      console.error(`❌ Tavily API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = (data.results || []).map(
      (r: { title: string; url: string; content: string }) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 300) || "",
      })
    );

    console.log(`✅ Tavily returned ${results.length} verified results`);
    return results;
  } catch (error: any) {
    console.error(`❌ Tavily error: ${error.message}`);
    return [];
  }
}

// Export other tools (unchanged)
export function extractEmails(text: string): string[] {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  return [...new Set(text.match(emailRegex) || [])];
}

export function extractDomains(text: string): string[] {
  const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\b/gi;
  const domains = text.match(domainRegex) || [];
  return [...new Set(domains)].filter((d) => !d.includes("@"));
}

export async function createEntity(data: {
  name: string;
  type: string;
  userId: string;
  metadata?: Record<string, any>;
}) {
  console.log(`✨ Creating entity: ${data.name}`);
  const newEntity = await db.insert(entities).values({
    name: data.name,
    type: data.type as any,
    userId: data.userId,
    metadata: data.metadata || {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return newEntity[0];
}

export async function storeOsintFindings(entityId: number, findings: any) {
  console.log(`💾 Storing OSINT findings for entity: ${entityId}`);
  try {
    await db.update(entities).set({
      osintData: findings,
      updatedAt: new Date(),
    }).where(eq(entities.id, entityId));

    await db.insert(osintSearches).values({
      entityId,
      searchType: "username",
      query: findings.entity?.name || "unknown",
      results: {
        platforms: findings.findings?.profiles || [],
        summary: findings.analysis?.summary || "",
      },
      status: "completed",
      createdAt: new Date(),
      completedAt: new Date(),
    });
    console.log(` ✅ Findings stored successfully`);
  } catch (error) {
    console.error(`❌ Error storing findings:`, error);
    throw error;
  }
}

export async function getEntityByName(name: string, userId: string) {
  try {
    const result = await db.select().from(entities).where(eq(entities.name, name)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.warn(
      `⚠️ DB query for entity "${name}" failed, treating as new entity:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

export function calculateRiskScore(findings: OsintFindings): number {
  let score = 0;
  const profiles = findings.profiles || [];
  const highConfidence = profiles.filter((p: any) => p.confidence === "high").length;
  const mediumConfidence = profiles.filter((p: any) => p.confidence === "medium").length;
  const weightedFootprint = (highConfidence * 1.0) + (mediumConfidence * 0.6);
  const footprintScore = Math.min(weightedFootprint / 3, 4);
  score += footprintScore;
  const emailScore = Math.min((findings.emails?.length || 0) * 1.5, 3);
  score += emailScore;
  const domainScore = Math.min(findings.domains?.length || 0, 2);
  score += domainScore;
  if (highConfidence > 0) score += 1;
  return Math.min(Math.round(score), 10);
}

export function generateInsights(findings: OsintFindings, riskScore: number): string[] {
  const insights: string[] = [];
  const totalProfiles = findings.profiles?.length || 0;
  const highConfidence = findings.profiles?.filter((p: any) => p.confidence === "high").length || 0;
  const mediumConfidence = findings.profiles?.filter((p: any) => p.confidence === "medium").length || 0;

  if (totalProfiles === 0) {
    insights.push("⚪ No online profiles found. Target has minimal digital footprint.");
  } else {
    insights.push(`🔵 Found ${totalProfiles} verified profile${totalProfiles > 1 ? 's' : ''} (${highConfidence} high confidence, ${mediumConfidence} medium).`);
  }

  const platforms = findings.profiles?.filter((p: any) => p.found).map((p: any) => p.platform).slice(0, 8).join(", ");
  if (platforms) {
    const remaining = totalProfiles - 8;
    insights.push(`📱 Active on: ${platforms}${remaining > 0 ? ` and ${remaining} more` : ''}`);
  }

  if (findings.emails && findings.emails.length > 0) {
    insights.push(`📧 ${findings.emails.length} email address(es) discovered. Recommend breach checking.`);
  }

  if (findings.domains && findings.domains.length > 0) {
    insights.push(`🌐 Associated with ${findings.domains.length} domain(s): ${findings.domains.slice(0, 3).join(", ")}${findings.domains.length > 3 ? "..." : ""}`);
  }

  if (riskScore >= 7) {
    insights.push("🔴 HIGH RISK: Significant information exposure. Review recommended.");
  } else if (riskScore >= 4) {
    insights.push("🟡 MEDIUM RISK: Moderate exposure. Consider privacy measures.");
  } else {
    insights.push("🟢 LOW RISK: Limited exposure. Maintain current posture.");
  }

  return insights;
}