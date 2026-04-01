/**
 * Search the web via Tavily API and return normalised results.
 */

/** Default social-media domains used when no custom list is supplied. */
export const DEFAULT_SOCIAL_DOMAINS: string[] = [
    // Major social networks
    "github.com",
    "x.com",
    "twitter.com",
    "instagram.com",
    "linkedin.com",
    "facebook.com",
    "reddit.com",
    "tiktok.com",
    "medium.com",
    "youtube.com",
    "twitch.tv",
    "behance.net",
    "dribbble.com",
    "soundcloud.com",
    "pinterest.com",
    "snapchat.com",
    "threads.net",
    "mastodon.social",
    "quora.com",
    "dev.to",
    "stackoverflow.com",
    "t.me",
];

export interface TavilySearchOptions {
    /** Override the default domain whitelist. */
    includeDomains?: string[];
    /** Max results to return (default 10). */
    maxResults?: number;
}

export async function searchWithTavily(
    query: string,
    apiKey?: string,
    options?: TavilySearchOptions,
): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const key = apiKey || process.env.TAVILY_API_KEY;
    if (!key) {
        return [];
    }

    const includeDomains = options?.includeDomains ?? DEFAULT_SOCIAL_DOMAINS;
    const maxResults = options?.maxResults ?? 10;

    try {
        console.log(`🔍 Tavily search: "${query}"`);
        // Only include `include_domains` when the list is non-empty.
        // Sending an empty array causes Tavily to return an error on some plans.
        const requestBody: Record<string, unknown> = {
            query,
            search_depth: "advanced",
            max_results: maxResults,
            include_answer: false,
        };
        if (includeDomains.length > 0) {
            requestBody.include_domains = includeDomains;
        }
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`,
            },
            body: JSON.stringify(requestBody),
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

/**
 * Run a general web search (no domain filtering) to discover personal
 * websites, news articles, blog posts, and other web mentions.
 */
export async function searchWebGeneral(
    query: string,
    apiKey?: string,
    maxResults = 10,
): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const key = apiKey || process.env.TAVILY_API_KEY;
    if (!key) {
        return [];
    }

    try {
        console.log(`🌐 Tavily general web search: "${query}"`);
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`,
            },
            body: JSON.stringify({
                query,
                search_depth: "advanced",
                max_results: maxResults,
                include_answer: false,
                // No include_domains — search the entire web
            }),
        });

        if (!response.ok) {
            console.error(`❌ Tavily general search error: ${response.status}`);
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

        console.log(`✅ Tavily general search returned ${results.length} results`);
        return results;
    } catch (error: any) {
        console.error(`❌ Tavily general search error: ${error.message}`);
        return [];
    }
}
