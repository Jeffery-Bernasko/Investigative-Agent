/**
 * SearchProvider — pluggable web search abstraction.
 *
 * Implementations: TavilyProvider (default), SerpApiProvider, BingProvider.
 * Configure the active provider via the SEARCH_PROVIDER env var.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchOptions {
  /** Restrict results to these domains (if provider supports it). */
  includeDomains?: string[];
  /** Maximum number of results (default: 10). */
  maxResults?: number;
}

export interface SearchProvider {
  /** Display name used in logs and metadata. */
  readonly name: string;
  /** Returns true when the provider is properly configured (e.g. has API key). */
  isAvailable(): boolean;
  /** Execute a web search and return normalised results. */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}
