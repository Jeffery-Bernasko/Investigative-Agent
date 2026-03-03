/**
 * Recent Activity Extractor
 *
 * Extracts and aggregates the last 3 posts chronologically across
 * all social platforms found for a target.
 *
 * Platforms supported:
 *   Twitter/X, LinkedIn, GitHub, Medium/Blog, Reddit
 *
 * Because most platforms don't expose public APIs without auth,
 * this module attempts:
 *   1. GitHub public events API (no auth required)
 *   2. Tavily web-search snippets as a proxy for recent activity on other platforms
 */

import { searchWithTavily } from "./tavily-search";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PostType = "post" | "tweet" | "commit" | "article" | "comment";

export interface RecentPost {
  platform: string;
  content: string;
  url: string;
  timestamp: Date;
  type: PostType;
  engagement: {
    likes?: number;
    shares?: number;
    comments?: number;
  };
}

export interface RecentActivityResult {
  posts: RecentPost[];
  /** Platforms where activity could not be retrieved (private / rate-limited / dormant). */
  unavailable: string[];
  /** Platforms with no activity in the last 6 months. */
  dormant: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
const GITHUB_API_TIMEOUT_MS = 8_000;

function isDormant(ts: Date): boolean {
  return Date.now() - ts.getTime() > SIX_MONTHS_MS;
}

function detectPlatform(url: string): string {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "Other";
  }
  if (hostname === "github.com") return "GitHub";
  if (hostname === "x.com" || hostname === "twitter.com") return "X";
  if (hostname === "instagram.com") return "Instagram";
  if (hostname === "linkedin.com") return "LinkedIn";
  if (hostname === "facebook.com") return "Facebook";
  if (hostname === "reddit.com") return "Reddit";
  if (hostname === "medium.com") return "Medium";
  if (hostname === "youtube.com") return "YouTube";
  if (hostname === "tiktok.com") return "TikTok";
  return "Other";
}

// ── GitHub public events ──────────────────────────────────────────────────────

async function fetchGitHubActivity(username: string): Promise<RecentPost[]> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=5`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        signal: AbortSignal.timeout(GITHUB_API_TIMEOUT_MS),
      }
    );
    if (!res.ok) return [];

    const events: any[] = await res.json();
    const posts: RecentPost[] = [];

    for (const ev of events) {
      const ts = ev.created_at ? new Date(ev.created_at) : new Date();
      let content = "";
      let url = `https://github.com/${username}`;
      let type: PostType = "commit";

      if (ev.type === "PushEvent") {
        const commits: any[] = ev.payload?.commits ?? [];
        content =
          commits[0]?.message ??
          `Pushed ${commits.length} commit(s) to ${ev.repo?.name}`;
        url = `https://github.com/${ev.repo?.name}/commits`;
        type = "commit";
      } else if (ev.type === "CreateEvent") {
        content = `Created ${ev.payload?.ref_type} "${ev.payload?.ref}" in ${ev.repo?.name}`;
        url = `https://github.com/${ev.repo?.name}`;
        type = "post";
      } else if (ev.type === "IssuesEvent") {
        content = `${ev.payload?.action} issue: ${ev.payload?.issue?.title}`;
        url = ev.payload?.issue?.html_url ?? url;
        type = "post";
      } else if (ev.type === "PullRequestEvent") {
        content = `${ev.payload?.action} PR: ${ev.payload?.pull_request?.title}`;
        url = ev.payload?.pull_request?.html_url ?? url;
        type = "post";
      } else {
        content = `${ev.type} on ${ev.repo?.name}`;
      }

      posts.push({
        platform: "GitHub",
        content,
        url,
        timestamp: ts,
        type,
        engagement: {},
      });
    }

    return posts;
  } catch {
    return [];
  }
}

// ── Tavily-based recent activity ──────────────────────────────────────────────

async function fetchTavilyRecentActivity(
  targetName: string,
  platform: string,
  tavilyKey: string
): Promise<RecentPost[]> {
  const platformQuery: Record<string, string> = {
    X: `"${targetName}" recent tweets site:x.com OR site:twitter.com`,
    LinkedIn: `"${targetName}" recent posts site:linkedin.com`,
    Medium: `"${targetName}" recent articles site:medium.com`,
    Reddit: `"${targetName}" recent comments site:reddit.com`,
    Instagram: `"${targetName}" recent posts site:instagram.com`,
  };

  const query = platformQuery[platform];
  if (!query) return [];

  try {
    const results = await searchWithTavily(query, tavilyKey);
    return results.slice(0, 3).map((r: any) => ({
      platform,
      content: r.snippet ?? r.title ?? "",
      url: r.url ?? "",
      // Prefer the published date; fall back to now() rather than epoch so the
      // post is not incorrectly treated as dormant / sorted to the bottom.
      timestamp: r.publishedDate ? new Date(r.publishedDate) : new Date(),
      type: platform === "X" ? ("tweet" as PostType) :
            platform === "Medium" ? ("article" as PostType) :
            platform === "Reddit" ? ("comment" as PostType) :
            ("post" as PostType),
      engagement: {},
    }));
  } catch {
    return [];
  }
}

// ── Main extractor ────────────────────────────────────────────────────────────

/**
 * Extract and aggregate the last 3 posts chronologically across all platforms.
 *
 * @param targetName - Full name of the investigation target.
 * @param profiles   - Profiles already discovered by the OSINT agent.
 */
export async function extractRecentActivities(
  targetName: string,
  profiles: Array<{ platform: string; url: string; username?: string; found?: boolean }>
): Promise<RecentActivityResult> {
  console.log(`\n📅 RECENT ACTIVITY: Extracting for "${targetName}"...`);

  const allPosts: RecentPost[] = [];
  const unavailable: string[] = [];
  const dormantPlatforms: string[] = [];

  const tavilyKey = process.env.TAVILY_API_KEY;

  // Deduplicate platforms from found profiles
  const platformProfiles = new Map<string, string | undefined>();
  for (const p of profiles) {
    if (p.found !== false && !platformProfiles.has(p.platform)) {
      platformProfiles.set(p.platform, p.username);
    }
  }

  const fetchPromises: Promise<void>[] = [];

  for (const [platform, username] of platformProfiles) {
    const task = async () => {
      let posts: RecentPost[] = [];

      if (platform === "GitHub" && username) {
        posts = await fetchGitHubActivity(username);
      } else if (tavilyKey) {
        posts = await fetchTavilyRecentActivity(targetName, platform, tavilyKey);
      } else {
        unavailable.push(platform);
        return;
      }

      if (posts.length === 0) {
        unavailable.push(platform);
      } else {
        // Flag dormant if all posts are older than 6 months
        const hasRecent = posts.some((p) => !isDormant(p.timestamp));
        if (!hasRecent) {
          dormantPlatforms.push(platform);
        }
        allPosts.push(...posts);
      }
    };
    fetchPromises.push(task());
  }

  await Promise.all(fetchPromises);

  // Sort all posts chronologically (most recent first) and take top 3
  const sortedPosts = allPosts
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 3);

  console.log(
    `📅 RECENT ACTIVITY: ${sortedPosts.length} post(s) found, ${unavailable.length} platform(s) unavailable, ${dormantPlatforms.length} dormant`
  );

  return {
    posts: sortedPosts,
    unavailable,
    dormant: dormantPlatforms,
  };
}
