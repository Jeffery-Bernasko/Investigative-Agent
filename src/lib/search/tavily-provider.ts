/**
 * TavilyProvider — web search via Tavily API.
 * Configure with TAVILY_API_KEY environment variable.
 */

import type { SearchProvider, SearchResult, SearchOptions } from "./provider";

export const DEFAULT_SOCIAL_DOMAINS: string[] = [
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

export class TavilyProvider implements SearchProvider {
  readonly name = "Tavily";
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVILY_API_KEY || "";
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const includeDomains = options?.includeDomains ?? DEFAULT_SOCIAL_DOMAINS;
    const maxResults = options?.maxResults ?? 10;

    try {
      console.log(`🔍 [Tavily] search: "${query}"`);
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          search_depth: "advanced",
          max_results: maxResults,
          include_answer: false,
          include_domains: includeDomains.length > 0 ? includeDomains : undefined,
        }),
      });

      if (!response.ok) {
        console.error(`❌ [Tavily] API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const results: SearchResult[] = (data.results || []).map(
        (r: { title: string; url: string; content: string }) => ({
          title: r.title,
          url: r.url,
          snippet: r.content?.slice(0, 300) || "",
        }),
      );

      console.log(`✅ [Tavily] ${results.length} results`);
      return results;
    } catch (error: any) {
      console.error(`❌ [Tavily] error: ${error.message}`);
      return [];
    }
  }
}
