/**
 * Search provider factory — resolves the active provider from env configuration.
 *
 * Priority: SEARCH_PROVIDER env var → first available provider (Tavily → SerpAPI → Bing).
 * Falls back to a no-op provider when none are configured.
 */

export type { SearchProvider, SearchResult, SearchOptions } from "./provider";
export { TavilyProvider } from "./tavily-provider";
export { SerpApiProvider } from "./serp-provider";
export { BingProvider } from "./bing-provider";

import type { SearchProvider } from "./provider";
import { TavilyProvider } from "./tavily-provider";
import { SerpApiProvider } from "./serp-provider";
import { BingProvider } from "./bing-provider";

/** A no-op provider returned when no configured provider is available. */
class NoOpProvider implements SearchProvider {
  readonly name = "None";
  isAvailable(): boolean {
    return false;
  }
  async search(): Promise<[]> {
    console.warn("[Search] No search provider configured. Set TAVILY_API_KEY, SERPAPI_API_KEY, or BING_SEARCH_API_KEY.");
    return [];
  }
}

/**
 * Returns the best available search provider.
 * Reads `SEARCH_PROVIDER` env var to force a specific provider
 * ("tavily" | "serpapi" | "bing"), otherwise picks the first available one.
 */
export function getSearchProvider(): SearchProvider {
  const forced = (process.env.SEARCH_PROVIDER || "").toLowerCase();

  const providers: SearchProvider[] = [
    new TavilyProvider(),
    new SerpApiProvider(),
    new BingProvider(),
  ];

  if (forced) {
    const match = providers.find((p) => p.name.toLowerCase() === forced);
    if (match && match.isAvailable()) return match;
    if (match) {
      console.warn(`[Search] Forced provider "${forced}" is configured but missing API key.`);
    }
  }

  const available = providers.find((p) => p.isAvailable());
  if (available) return available;

  return new NoOpProvider();
}
