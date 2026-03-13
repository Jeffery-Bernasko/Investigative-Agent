/**
 * Content Scraper — fetches public posts/content from discovered social profiles.
 *
 * Tier 1 (direct API/JSON — reliable):
 *   GitHub, Reddit, Medium (RSS), Dev.to
 *
 * Tier 2 (Tavily Extract — best-effort fallback):
 *   X/Twitter, LinkedIn, YouTube, and any other public profile URL
 */

const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY_LENGTH = 500;

// ── Types ───────────────────────────────────────────────────────────────

export interface ScrapedPost {
    title?: string;
    body: string;
    date?: string;
    url?: string;
    engagement?: { likes?: number; comments?: number };
}

export interface ScrapedContent {
    platform: string;
    username: string;
    url: string;
    posts: ScrapedPost[];
    bio?: string;
    topics: string[];
    fetchedAt: Date;
    error?: string;
}

export interface ContentScrapeResult {
    contents: ScrapedContent[];
    summary: {
        platformsScraped: number;
        totalPosts: number;
        errors: number;
    };
}

interface ProfileInput {
    platform: string;
    url: string;
    found: boolean;
    confidence?: string;
    username?: string;
}

// ── Platform fetchers ───────────────────────────────────────────────────

async function fetchGitHubContent(username: string): Promise<ScrapedContent> {
    const result: ScrapedContent = {
        platform: "GitHub",
        username,
        url: `https://github.com/${username}`,
        posts: [],
        topics: [],
        fetchedAt: new Date(),
    };

    try {
        // Fetch user profile for bio
        const profileRes = await fetch(
            `https://api.github.com/users/${encodeURIComponent(username)}`,
            { headers: { Accept: "application/vnd.github.v3+json" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
        );
        if (profileRes.ok) {
            const profile = await profileRes.json();
            result.bio = [profile.bio, profile.company, profile.location].filter(Boolean).join(" | ");
        }

        // Fetch recent repos
        const reposRes = await fetch(
            `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=5`,
            { headers: { Accept: "application/vnd.github.v3+json" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
        );
        if (reposRes.ok) {
            const repos = await reposRes.json();
            for (const repo of repos) {
                result.posts.push({
                    title: repo.name,
                    body: (repo.description || "No description").slice(0, MAX_BODY_LENGTH),
                    date: repo.updated_at,
                    url: repo.html_url,
                    engagement: { likes: repo.stargazers_count, comments: repo.forks_count },
                });
                if (repo.language) result.topics.push(repo.language);
                if (repo.topics) result.topics.push(...repo.topics);
            }
        }

        // Fetch recent public events (commits, issues, PRs)
        const eventsRes = await fetch(
            `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=10`,
            { headers: { Accept: "application/vnd.github.v3+json" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
        );
        if (eventsRes.ok) {
            const events = await eventsRes.json();
            for (const event of events) {
                if (event.type === "PushEvent") {
                    const commits = event.payload?.commits || [];
                    for (const commit of commits.slice(0, 2)) {
                        result.posts.push({
                            title: `Commit to ${event.repo?.name || "unknown"}`,
                            body: (commit.message || "").slice(0, MAX_BODY_LENGTH),
                            date: event.created_at,
                        });
                    }
                } else if (event.type === "IssuesEvent" || event.type === "IssueCommentEvent") {
                    const issue = event.payload?.issue;
                    if (issue) {
                        result.posts.push({
                            title: `Issue: ${issue.title || ""}`,
                            body: (issue.body || "").slice(0, MAX_BODY_LENGTH),
                            date: event.created_at,
                            url: issue.html_url,
                        });
                    }
                }
            }
        }
    } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
    }

    result.topics = [...new Set(result.topics)];
    return result;
}

async function fetchRedditContent(username: string): Promise<ScrapedContent> {
    const result: ScrapedContent = {
        platform: "Reddit",
        username,
        url: `https://www.reddit.com/user/${username}`,
        posts: [],
        topics: [],
        fetchedAt: new Date(),
    };

    try {
        const res = await fetch(
            `https://www.reddit.com/user/${encodeURIComponent(username)}.json?limit=10&raw_json=1`,
            {
                headers: { "User-Agent": "SEPTO-OSINT/1.0" },
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            },
        );

        if (res.ok) {
            const data = await res.json();
            const children = data?.data?.children || [];

            for (const child of children) {
                const post = child.data;
                if (!post) continue;

                const isComment = child.kind === "t1";
                result.posts.push({
                    title: isComment ? `Comment in r/${post.subreddit}` : post.title,
                    body: (post.selftext || post.body || "").slice(0, MAX_BODY_LENGTH),
                    date: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : undefined,
                    url: post.permalink ? `https://www.reddit.com${post.permalink}` : undefined,
                    engagement: isComment
                        ? { likes: post.score }
                        : { likes: post.score, comments: post.num_comments },
                });

                if (post.subreddit) result.topics.push(post.subreddit);
            }
        }
    } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
    }

    result.topics = [...new Set(result.topics)];
    return result;
}

async function fetchMediumContent(username: string): Promise<ScrapedContent> {
    const result: ScrapedContent = {
        platform: "Medium",
        username,
        url: `https://medium.com/@${username}`,
        posts: [],
        topics: [],
        fetchedAt: new Date(),
    };

    try {
        const res = await fetch(
            `https://medium.com/feed/@${encodeURIComponent(username)}`,
            { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
        );

        if (res.ok) {
            const xml = await res.text();

            // Simple RSS parsing — extract <item> blocks
            const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
            for (const item of items.slice(0, 5)) {
                const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
                    || item.match(/<title>(.*?)<\/title>/)?.[1]
                    || "";
                const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
                const link = item.match(/<link>(.*?)<\/link>/)?.[1];

                // Extract text content from description, strip HTML
                const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);
                const rawDesc = descMatch?.[1] || "";
                const body = rawDesc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_BODY_LENGTH);

                // Extract categories as topics
                const categories = item.match(/<category>(.*?)<\/category>/g) || [];
                for (const cat of categories) {
                    const tag = cat.replace(/<\/?category>/g, "").trim();
                    if (tag) result.topics.push(tag);
                }

                result.posts.push({ title, body, date: pubDate || undefined, url: link || undefined });
            }
        }
    } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
    }

    result.topics = [...new Set(result.topics)];
    return result;
}

async function fetchDevToContent(username: string): Promise<ScrapedContent> {
    const result: ScrapedContent = {
        platform: "Dev.to",
        username,
        url: `https://dev.to/${username}`,
        posts: [],
        topics: [],
        fetchedAt: new Date(),
    };

    try {
        const res = await fetch(
            `https://dev.to/api/articles?username=${encodeURIComponent(username)}&per_page=5`,
            { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
        );

        if (res.ok) {
            const articles = await res.json();
            for (const article of articles) {
                result.posts.push({
                    title: article.title,
                    body: (article.description || "").slice(0, MAX_BODY_LENGTH),
                    date: article.published_at,
                    url: article.url,
                    engagement: {
                        likes: article.positive_reactions_count,
                        comments: article.comments_count,
                    },
                });
                if (article.tag_list) result.topics.push(...article.tag_list);
            }
        }
    } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
    }

    result.topics = [...new Set(result.topics)];
    return result;
}

async function fetchWithTavilyExtract(
    url: string,
    platform: string,
    username: string,
): Promise<ScrapedContent> {
    const result: ScrapedContent = {
        platform,
        username,
        url,
        posts: [],
        topics: [],
        fetchedAt: new Date(),
    };

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        result.error = "Tavily API key not set";
        return result;
    }

    try {
        const res = await fetch("https://api.tavily.com/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: apiKey, urls: [url] }),
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (res.ok) {
            const data = await res.json();
            const results = data.results || [];

            for (const r of results) {
                const text = (r.raw_content || r.text || "").trim();
                if (text.length > 20) {
                    // Split into paragraph-sized chunks as pseudo-posts
                    const paragraphs = text.split(/\n{2,}/).filter((p: string) => p.trim().length > 20);
                    for (const p of paragraphs.slice(0, 5)) {
                        result.posts.push({
                            body: p.trim().slice(0, MAX_BODY_LENGTH),
                        });
                    }
                }
            }
        }
    } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
    }

    return result;
}

// ── Helpers ────────────────────────

function extractUsernameFromUrl(url: string): string | null {
    const clean = url.split(/[?#]/)[0].replace(/\/+$/, "");
    const patterns: RegExp[] = [
        /github\.com\/([A-Za-z0-9_-]+)$/i,
        /(?:twitter|x)\.com\/([A-Za-z0-9_]+)$/i,
        /instagram\.com\/([A-Za-z0-9_.]+)$/i,
        /linkedin\.com\/in\/([A-Za-z0-9_-]+)$/i,
        /reddit\.com\/user\/([A-Za-z0-9_-]+)$/i,
        /medium\.com\/@?([A-Za-z0-9_.-]+)$/i,
        /youtube\.com\/@([A-Za-z0-9_.-]+)$/i,
        /tiktok\.com\/@([A-Za-z0-9_.]+)$/i,
        /dev\.to\/([A-Za-z0-9_]+)$/i,
        /twitch\.tv\/([A-Za-z0-9_]+)$/i,
    ];
    for (const regex of patterns) {
        const match = clean.match(regex);
        if (match) return match[1];
    }
    return null;
}

/** Map platform name to the appropriate fetcher. */
const TIER1_FETCHERS: Record<string, (username: string) => Promise<ScrapedContent>> = {
    GitHub: fetchGitHubContent,
    Reddit: fetchRedditContent,
    Medium: fetchMediumContent,
    "Dev.to": fetchDevToContent,
};

const TAVILY_ELIGIBLE_PLATFORMS = new Set([
    "X", "LinkedIn", "YouTube", "Twitch", "Behance", "Stack Overflow",
]);

// ── Main entry point ────────────────────────

export async function scrapeProfileContent(
    profiles: ProfileInput[],
    options?: { maxPostsPerPlatform?: number; maxPlatforms?: number },
): Promise<ContentScrapeResult> {
    const maxPosts = options?.maxPostsPerPlatform ?? 10;
    const maxPlatforms = options?.maxPlatforms ?? 5;

    // Filter to high/medium confidence found profiles only
    const eligible = profiles.filter(
        (p) => p.found && (p.confidence === "high" || p.confidence === "medium"),
    );

    // Deduplicate by platform (keep first/highest confidence)
    const seen = new Set<string>();
    const unique: ProfileInput[] = [];
    for (const p of eligible) {
        if (!seen.has(p.platform)) {
            seen.add(p.platform);
            unique.push(p);
        }
    }

    // Prioritize Tier 1 platforms, then Tavily-eligible, then skip
    const tier1: ProfileInput[] = [];
    const tier2: ProfileInput[] = [];

    for (const p of unique) {
        if (TIER1_FETCHERS[p.platform]) {
            tier1.push(p);
        } else if (TAVILY_ELIGIBLE_PLATFORMS.has(p.platform)) {
            tier2.push(p);
        }
    }

    const toFetch = [...tier1, ...tier2].slice(0, maxPlatforms);

    console.log(`[ContentScraper] Fetching content from ${toFetch.length} platforms (${tier1.length} Tier1, ${Math.min(tier2.length, maxPlatforms - tier1.length)} Tier2)`);

    // Run all fetchers in parallel
    const promises = toFetch.map((p) => {
        const username = p.username || extractUsernameFromUrl(p.url) || "";
        if (!username) {
            return Promise.resolve({
                platform: p.platform, username: "", url: p.url,
                posts: [], topics: [], fetchedAt: new Date(),
                error: "Could not extract username",
            } as ScrapedContent);
        }

        const tier1Fetcher = TIER1_FETCHERS[p.platform];
        if (tier1Fetcher) {
            return tier1Fetcher(username);
        }
        return fetchWithTavilyExtract(p.url, p.platform, username);
    });

    const results = await Promise.allSettled(promises);

    const contents: ScrapedContent[] = [];
    let errors = 0;
    let totalPosts = 0;

    for (const r of results) {
        if (r.status === "fulfilled") {
            const content = r.value;
            // Trim to max posts
            content.posts = content.posts.slice(0, maxPosts);
            totalPosts += content.posts.length;
            if (content.error) errors++;
            contents.push(content);
            console.log(`[ContentScraper] ${content.platform}: ${content.posts.length} posts, ${content.topics.length} topics${content.error ? ` (error: ${content.error})` : ""}`);
        } else {
            errors++;
            console.warn(`[ContentScraper] Fetcher rejected: ${r.reason}`);
        }
    }

    return {
        contents,
        summary: {
            platformsScraped: contents.length,
            totalPosts,
            errors,
        },
    };
}
