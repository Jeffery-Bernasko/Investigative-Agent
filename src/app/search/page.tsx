"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  FileText,
  Users,
  Filter,
  Clock,
  Tag,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Database,
  Zap,
} from "lucide-react";
import { DashboardShell } from "@/components/layout";
import { cn, formatRelativeTime, getSeverityColor, getThreatLevel } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "report" | "entity";
  title: string;
  content: string;
  similarity?: number;
  severity?: string;
  threatScore?: number;
  entityType?: string;
  tags?: string[];
  createdAt: string;
}

// Mock search function
const performSearch = async (query: string): Promise<SearchResult[]> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return [
    {
      id: "1",
      type: "report",
      title: "Phishing Campaign Targeting Financial Sector",
      content:
        "A sophisticated phishing campaign has been detected targeting employees of major financial institutions using lookalike domains.",
      similarity: 0.94,
      severity: "high",
      tags: ["phishing", "financial", "apt"],
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: "2",
      type: "entity",
      title: "TechCorp Industries",
      content: "Technology company based in Palo Alto, CA with 5000+ employees.",
      similarity: 0.87,
      threatScore: 25,
      entityType: "organization",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: "3",
      type: "report",
      title: "New Ransomware Variant Discovered",
      content:
        "Security researchers have identified a new ransomware variant dubbed 'CryptoShade' targeting healthcare organizations.",
      similarity: 0.82,
      severity: "critical",
      tags: ["ransomware", "healthcare", "malware"],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: "4",
      type: "entity",
      title: "John Doe",
      content: "Software Developer at TechCorp Industries. Active on multiple social platforms.",
      similarity: 0.78,
      threatScore: 15,
      entityType: "person",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
    {
      id: "5",
      type: "report",
      title: "Supply Chain Attack Analysis",
      content:
        "Analysis of recent supply chain attacks reveals new patterns in dependency compromises.",
      similarity: 0.75,
      severity: "medium",
      tags: ["supply-chain", "npm", "dependency"],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    },
  ];
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"all" | "report" | "entity">("all");

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    const startTime = Date.now();

    try {
      const searchResults = await performSearch(query);
      setResults(searchResults);
      setSearchTime(Date.now() - startTime);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredResults = results.filter(
    (result) => filterType === "all" || result.type === filterType
  );

  const reportCount = results.filter((r) => r.type === "report").length;
  const entityCount = results.filter((r) => r.type === "entity").length;

  return (
    <DashboardShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-purple-400" />
            </div>
            Vector Search
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Semantic search across all intelligence data using AI embeddings.
          </p>
        </motion.div>

        {/* Search Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-2xl p-6"
        >
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search for threats, entities, or patterns using natural language..."
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-void border border-glass-border text-lg text-white placeholder:text-text-muted focus:outline-none focus:border-matrix/50 focus:shadow-glow transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!query.trim() || isSearching}
              className={cn(
                "px-8 py-4 rounded-xl font-medium flex items-center gap-2 transition-all",
                query.trim() && !isSearching
                  ? "bg-matrix text-black hover:bg-matrix-dim"
                  : "bg-graphite text-text-muted cursor-not-allowed"
              )}
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
          </div>

          {/* Info */}
          <div className="mt-4 flex items-center gap-6 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Database className="w-4 h-4 text-matrix" />
              Vector search with cosine similarity
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-electric" />
              Powered by OpenAI embeddings
            </span>
          </div>
        </motion.div>

        {/* Results */}
        {hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-white">Results</h2>
                {!isSearching && (
                  <>
                    <span className="px-2 py-1 rounded-lg bg-glass-bg text-sm text-text-secondary">
                      {results.length} matches
                    </span>
                    {searchTime && (
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {searchTime}ms
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterType("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm transition-all",
                    filterType === "all"
                      ? "bg-matrix/20 text-matrix"
                      : "text-text-secondary hover:text-white"
                  )}
                >
                  All ({results.length})
                </button>
                <button
                  onClick={() => setFilterType("report")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all",
                    filterType === "report"
                      ? "bg-electric/20 text-electric"
                      : "text-text-secondary hover:text-white"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  Reports ({reportCount})
                </button>
                <button
                  onClick={() => setFilterType("entity")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all",
                    filterType === "entity"
                      ? "bg-purple-500/20 text-purple-400"
                      : "text-text-secondary hover:text-white"
                  )}
                >
                  <Users className="w-4 h-4" />
                  Entities ({entityCount})
                </button>
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {isSearching ? (
                  // Loading skeletons
                  Array.from({ length: 3 }).map((_, i) => (
                    <motion.div
                      key={`skeleton-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass-panel rounded-xl p-5 animate-pulse"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-graphite" />
                        <div className="flex-1 space-y-3">
                          <div className="w-1/3 h-5 bg-graphite rounded" />
                          <div className="w-full h-4 bg-graphite rounded" />
                          <div className="w-2/3 h-4 bg-graphite rounded" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  filteredResults.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass-panel glass-panel-hover rounded-xl p-5 cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div
                          className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                            result.type === "report"
                              ? "bg-electric/10"
                              : "bg-purple-500/10"
                          )}
                        >
                          {result.type === "report" ? (
                            <FileText className="w-6 h-6 text-electric" />
                          ) : (
                            <Users className="w-6 h-6 text-purple-400" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h3 className="text-base font-semibold text-white">
                                {result.title}
                              </h3>
                              <span className="text-xs text-text-muted capitalize">
                                {result.type === "entity"
                                  ? result.entityType
                                  : "Intelligence Report"}
                              </span>
                            </div>

                            {/* Similarity Score */}
                            {result.similarity && (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-sm font-mono text-matrix">
                                  {(result.similarity * 100).toFixed(0)}%
                                </span>
                                <div className="w-16 h-2 bg-graphite rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-matrix rounded-full"
                                    style={{
                                      width: `${result.similarity * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                            {result.content}
                          </p>

                          <div className="flex items-center justify-between">
                            {/* Tags or Threat Score */}
                            <div className="flex items-center gap-2">
                              {result.type === "report" && result.tags ? (
                                result.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 rounded text-2xs font-mono bg-graphite text-text-secondary"
                                  >
                                    {tag}
                                  </span>
                                ))
                              ) : result.threatScore !== undefined ? (
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "text-xs font-mono",
                                      getThreatLevel(result.threatScore).color
                                    )}
                                  >
                                    Threat: {result.threatScore}
                                  </span>
                                </div>
                              ) : null}
                            </div>

                            {/* Meta */}
                            <span className="text-xs text-text-muted flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(result.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>

              {!isSearching && filteredResults.length === 0 && hasSearched && (
                <div className="glass-panel rounded-xl p-12 text-center">
                  <Search className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No Results Found
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Try adjusting your search query or filters.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-2xl p-16 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              AI-Powered Intelligence Search
            </h2>
            <p className="text-text-secondary max-w-lg mx-auto mb-8">
              Use natural language to search across all your threat intelligence
              data. Our vector search finds semantically similar results, not just
              keyword matches.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setQuery("Recent phishing attacks on financial sector")}
                className="px-4 py-2 rounded-lg bg-glass-bg border border-glass-border text-sm text-text-secondary hover:text-white hover:border-matrix/30 transition-all"
              >
                Phishing attacks on financial sector
              </button>
              <button
                onClick={() => setQuery("High-risk entities connected to TechCorp")}
                className="px-4 py-2 rounded-lg bg-glass-bg border border-glass-border text-sm text-text-secondary hover:text-white hover:border-matrix/30 transition-all"
              >
                High-risk entities connected to TechCorp
              </button>
              <button
                onClick={() => setQuery("Ransomware targeting healthcare")}
                className="px-4 py-2 rounded-lg bg-glass-bg border border-glass-border text-sm text-text-secondary hover:text-white hover:border-matrix/30 transition-all"
              >
                Ransomware targeting healthcare
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardShell>
  );
}

