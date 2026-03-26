/**
 * SerpApiProvider — web search via SerpAPI (Google search results).
 * Configure with SERPAPI_API_KEY environment variable.
 * See: https://serpapi.com/
 */

import type { SearchProvider, SearchResult, SearchOptions } from "./provider";

export class SerpApiProvider implements SearchProvider {
  readonly name = "SerpAPI";
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SERPAPI_API_KEY || "";
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const maxResults = options?.maxResults ?? 10;

    try {
      console.log(`🔍 [SerpAPI] search: "${query}"`);
      const params = new URLSearchParams({
        q: query,
        api_key: this.apiKey,
        num: String(Math.min(maxResults, 10)),
        engine: "google",
      });

      const response = await fetch(`https://serpapi.com/search?${params.toString()}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.error(`❌ [SerpAPI] API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const results: SearchResult[] = ((data.organic_results as any[]) || [])
        .slice(0, maxResults)
        .map((r) => ({
          title: r.title || "",
          url: r.link || "",
          snippet: (r.snippet || "").slice(0, 300),
        }));

      console.log(`✅ [SerpAPI] ${results.length} results`);
      return results;
    } catch (error: any) {
      console.error(`❌ [SerpAPI] error: ${error.message}`);
      return [];
    }
  }
}
