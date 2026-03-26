/**
 * BingProvider — web search via Microsoft Bing Web Search API.
 * Configure with BING_SEARCH_API_KEY environment variable.
 * See: https://www.microsoft.com/en-us/bing/apis/bing-web-search-api
 */

import type { SearchProvider, SearchResult, SearchOptions } from "./provider";

export class BingProvider implements SearchProvider {
  readonly name = "Bing";
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BING_SEARCH_API_KEY || "";
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
      console.log(`🔍 [Bing] search: "${query}"`);
      const params = new URLSearchParams({
        q: query,
        count: String(Math.min(maxResults, 50)),
        mkt: "en-US",
        safeSearch: "Moderate",
      });

      const response = await fetch(
        `https://api.bing.microsoft.com/v7.0/search?${params.toString()}`,
        {
          headers: {
            "Ocp-Apim-Subscription-Key": this.apiKey,
          },
          signal: AbortSignal.timeout(10000),
        },
      );

      if (!response.ok) {
        console.error(`❌ [Bing] API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const webPages = data?.webPages?.value as any[] | undefined;
      const results: SearchResult[] = (webPages || []).slice(0, maxResults).map((r) => ({
        title: r.name || "",
        url: r.url || "",
        snippet: (r.snippet || "").slice(0, 300),
      }));

      console.log(`✅ [Bing] ${results.length} results`);
      return results;
    } catch (error: any) {
      console.error(`❌ [Bing] error: ${error.message}`);
      return [];
    }
  }
}
