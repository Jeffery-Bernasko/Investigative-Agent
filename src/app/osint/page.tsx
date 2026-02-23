"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  AtSign,
  Phone,
  Globe,
  Image,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertTriangle,
  Shield,
  Clock,
  Database,
  ChevronRight,
  Sparkles,
  Target,
} from "lucide-react";
import { DashboardShell } from "@/components/layout";

type SearchType = "username" | "email" | "phone" | "domain" | "image";

interface SearchResult {
  name: string;
  url?: string;
  exists: boolean;
  category?: string;
  confidence?: "high" | "medium" | "low";
  data?: Record<string, unknown>;
}

interface SearchResponse {
  success: boolean;
  platforms: SearchResult[];
  summary: string;
  webResults?: Array<{ title: string; url: string; snippet: string }>;
  categories?: Record<string, { name: string; color: string }>;
}

const searchTypes: { id: SearchType; label: string; icon: typeof User; placeholder: string; examples: string[] }[] = [
  { 
    id: "username", 
    label: "Username", 
    icon: AtSign, 
    placeholder: "elonmusk or @github",
    examples: ["elonmusk", "@github", "Elon Musk"]
  },
  { 
    id: "email", 
    label: "Email", 
    icon: AtSign, 
    placeholder: "john@example.com",
    examples: ["test@example.com"]
  },
  { 
    id: "phone", 
    label: "Phone", 
    icon: Phone, 
    placeholder: "+1234567890",
    examples: ["+1234567890", "+60123456789"]
  },
  { 
    id: "domain", 
    label: "Domain", 
    icon: Globe, 
    placeholder: "example.com",
    examples: ["tesla.com", "github.com"]
  },
  { 
    id: "image", 
    label: "Image", 
    icon: Image, 
    placeholder: "Paste image URL...",
    examples: []
  },
];

// Confidence badge component
function ConfidenceBadge({ confidence }: { confidence?: "high" | "medium" | "low" }) {
  if (!confidence) return null;
  
  const styles = {
    high: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  
  const icons = {
    high: "🟢",
    medium: "🟡",
    low: "⚪",
  };
  
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${styles[confidence]}`}>
      {icons[confidence]} {confidence}
    </span>
  );
}

export default function OSINTPage() {
  const [searchType, setSearchType] = useState<SearchType>("username");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<Array<{ type: SearchType; query: string; timestamp: Date }>>([]);

  const performSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/osint/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchType,
          query: query.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      setResults(data);
      setRecentSearches((prev) => [
        { type: searchType, query: query.trim(), timestamp: new Date() },
        ...prev.slice(0, 9),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      performSearch();
    }
  };

  const selectedType = searchTypes.find((t) => t.id === searchType)!;
  const foundCount = results?.platforms.filter((p) => p.exists).length || 0;
  const notFoundCount = results?.platforms.filter((p) => !p.exists).length || 0;
  const highConfidenceCount = results?.platforms.filter((p) => p.confidence === "high").length || 0;
  const mediumConfidenceCount = results?.platforms.filter((p) => p.confidence === "medium").length || 0;

  return (
    <DashboardShell>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Search className="w-6 h-6" />
                OSINT Tools
              </h1>
              <p className="text-sm text-gray-400">
                Gather intelligence from open sources across the internet.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-primary font-medium">20+ platforms • AI-powered</span>
          </div>
        </motion.div>

        {/* Search Type Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 flex-wrap"
        >
          {searchTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSearchType(type.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                searchType === type.id
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <type.icon className="w-4 h-4" />
              <span>{type.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Search Input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <div className="flex gap-3">
            <div className="relative flex-1">
              <selectedType.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={selectedType.placeholder}
                className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all font-mono"
              />
            </div>
            <button
              onClick={performSearch}
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-8 py-4 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Search
            </button>
          </div>

          {/* Tips Section */}
          <div className="mt-4 space-y-2">
            <div className="flex gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Tips:
              </span>
              <span>Use exact usernames for better results</span>
              <span>Include country code for phone lookups</span>
            </div>
            
            {searchType === "username" && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-300">
                  <strong>Pro Tip:</strong> You can search for <strong>person names</strong> like "Elon Musk" and we'll automatically find their usernames, or use <strong>@username</strong> format for direct searches.
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {selectedType.examples.map((example) => (
                      <button
                        key={example}
                        onClick={() => setQuery(example)}
                        className="px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-400">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Summary */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/20">
                      <Database className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Search Complete</h3>
                      <p className="text-gray-400">{results.summary}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{foundCount}</div>
                      <div className="text-xs text-gray-500">Found</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">{highConfidenceCount}</div>
                      <div className="text-xs text-gray-500">High Conf</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-500">{mediumConfidenceCount}</div>
                      <div className="text-xs text-gray-500">Medium</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-500">{notFoundCount}</div>
                      <div className="text-xs text-gray-500">Not Found</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Grid */}
              <div className="grid gap-4">
                {/* Found Profiles */}
                {foundCount > 0 && (
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      Found Profiles ({foundCount})
                    </h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {results.platforms
                        .filter((p) => p.exists)
                        .sort((a, b) => {
                          // Sort by confidence: high > medium > low
                          const order = { high: 3, medium: 2, low: 1 };
                          return (order[b.confidence || "low"] || 0) - (order[a.confidence || "low"] || 0);
                        })
                        .map((platform, index) => (
                          <motion.a
                            key={platform.name}
                            href={platform.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-4 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-medium text-white">{platform.name}</div>
                                  <ConfidenceBadge confidence={platform.confidence} />
                                </div>
                                {platform.url && (
                                  <div className="text-xs text-gray-500 truncate" title={platform.url}>
                                    {platform.url}
                                  </div>
                                )}
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors flex-shrink-0 ml-2" />
                          </motion.a>
                        ))}
                    </div>
                  </div>
                )}

                {/* Additional Data */}
                {results.platforms.some((p) => p.data && Object.keys(p.data).length > 0) && (
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-400" />
                      Intelligence Data
                    </h3>
                    <div className="space-y-4">
                      {results.platforms
                        .filter((p) => p.data && Object.keys(p.data).length > 0)
                        .map((platform) => (
                          <div
                            key={platform.name}
                            className="p-4 rounded-xl bg-black/30 border border-white/10"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <h4 className="font-medium text-white">{platform.name}</h4>
                              {platform.exists ? (
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <pre className="text-sm text-gray-400 font-mono overflow-x-auto">
                              {JSON.stringify(platform.data, null, 2)}
                            </pre>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Not Found */}
                {notFoundCount > 0 && (
                  <details className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <summary className="cursor-pointer text-lg font-semibold text-white flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-gray-500" />
                      Not Found ({notFoundCount})
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </summary>
                    <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-2 mt-4">
                      {results.platforms
                        .filter((p) => !p.exists)
                        .map((platform) => (
                          <div
                            key={platform.name}
                            className="flex items-center gap-2 p-2 rounded-lg bg-black/30 text-gray-500 text-sm"
                          >
                            <XCircle className="w-4 h-4" />
                            {platform.name}
                          </div>
                        ))}
                    </div>
                  </details>
                )}

                {/* Web Intelligence (Tavily Results) */}
                {results.webResults && results.webResults.length > 0 && (
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-purple-400" />
                      Web Intelligence ({results.webResults.length})
                    </h3>
                    <div className="space-y-3">
                      {results.webResults.map((result, index) => (
                        <motion.a
                          key={result.url}
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="block p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500/10 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-white group-hover:text-purple-300 transition-colors">
                                {result.title}
                              </div>
                              <div className="text-xs text-purple-400/70 truncate mt-1" title={result.url}>
                                {result.url}
                              </div>
                              {result.snippet && (
                                <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                                  {result.snippet}
                                </p>
                              )}
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors flex-shrink-0 mt-1" />
                          </div>
                        </motion.a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State / Recent Searches */}
        {!results && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
              <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Start Your Investigation</h3>
              <p className="text-gray-400 mb-4">
                Enter a username, email, phone number, or domain above to begin gathering
                intelligence from open sources.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <Sparkles className="w-4 h-4" />
                <span>Powered by AI • 20+ Platforms • Tavily Search</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Searches</h3>
                {recentSearches.length > 0 ? (
                  <div className="space-y-2">
                    {recentSearches.slice(0, 5).map((search, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchType(search.type);
                          setQuery(search.query);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-black/30 hover:bg-black/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <AtSign className="w-4 h-4 text-gray-500" />
                          <span className="text-white">{search.query}</span>
                          <span className="text-xs text-gray-500 capitalize">{search.type}</span>
                        </div>
                        <Clock className="w-4 h-4 text-gray-500" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No recent searches</p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-400">Legal Notice</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Only use OSINT tools for legitimate security research. Ensure compliance
                      with local laws and platform terms of service.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardShell>
  );
}