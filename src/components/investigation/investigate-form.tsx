"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  Loader2,
  Target,
  Shield,
  Brain,
  Network,
  FileText,
  CheckCircle2,
  TrendingUp,
  ExternalLink,
  Database,
  Zap,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface InvestigationResult {
  investigationId: string;
  entity: {
    id: number;
    name: string;
    type: string;
  };
  status: "completed" | "failed" | "partial";
  findings: {
    profiles: Array<{
      platform: string;
      url: string;
      found: boolean;
      confidence?: "high" | "medium" | "low";
    }>;
    emails: string[];
    domains: string[];
    metadata: Record<string, any>;
  };
  analysis?: {
    riskScore: number;
    insights: string[];
    summary: string;
  };
  recommendations: string[];
  duration: number;
  createdAt: string;
}

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

// Risk score gauge
function RiskScoreGauge({ score }: { score: number }) {
  const percentage = (score / 10) * 100;
  const color =
    score >= 7 ? "text-red-400" : score >= 4 ? "text-yellow-400" : "text-green-400";
  const bgColor =
    score >= 7 ? "stroke-red-500" : score >= 4 ? "stroke-yellow-500" : "stroke-green-500";
  const label =
    score >= 7 ? "HIGH RISK" : score >= 4 ? "MEDIUM RISK" : "LOW RISK";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className="w-32 h-32 rounded-full border-8 border-white/10 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-4xl font-bold ${color}`}>{score}</div>
            <div className="text-xs text-gray-500">/ 10</div>
          </div>
        </div>
        <svg className="absolute inset-0 w-32 h-32 -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            strokeWidth="8"
            className={bgColor}
            strokeDasharray={`${percentage * 3.52} 352`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className={`text-xs font-semibold ${color}`}>{label}</div>
    </div>
  );
}

export function InvestigateForm() {
  const [query, setQuery] = useState("");
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [progress, setProgress] = useState<string>("");

  const handleInvestigate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      toast.error("Please enter something to investigate");
      return;
    }

    setIsInvestigating(true);
    setResult(null);
    setProgress("Initializing investigation...");

    try {
      console.log(`🔍 Starting investigation: "${query}"`);
      setProgress("🧠 AI is analyzing your request...");

      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Investigation failed");
      }

      setProgress("📊 Processing results...");
      const data = await response.json();

      console.log("✅ Investigation complete:", data);

      if (data.success && data.investigation) {
        setResult(data.investigation);
        toast.success("Investigation complete!", {
          description: `Found ${data.investigation.findings.profiles.length} profiles in ${data.investigation.duration}s`,
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error: any) {
      console.error("❌ Investigation error:", error);
      toast.error("Investigation failed", {
        description: error.message,
      });
    } finally {
      setIsInvestigating(false);
      setProgress("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Autonomous Investigation
            </h1>
            <p className="text-sm text-gray-400">
              AI-powered investigation agent • Just describe what you want to investigate
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">Fully Autonomous</span>
        </div>
      </motion.div>

      {/* Investigation Form */}
      <motion.form
        onSubmit={handleInvestigate}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 rounded-2xl bg-white/5 border border-white/10"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='e.g., "Investigate @elonmusk" or "Analyze tesla.com" or "Research John Smith"'
              disabled={isInvestigating}
              className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isInvestigating || !query.trim()}
            className="w-full bg-gradient-to-r from-primary to-green-500 text-black font-semibold py-4 rounded-xl hover:shadow-lg hover:shadow-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isInvestigating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {progress || "Investigating..."}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Start Autonomous Investigation
              </>
            )}
          </button>
        </div>

        {/* Tips */}
        <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300">
              <strong>How it works:</strong> The AI agent will automatically:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Parse your intent and identify the target</li>
                <li>Search across 20+ platforms for profiles</li>
                <li>Analyze findings with AI (Mistral via Ollama)</li>
                <li>Calculate risk scores</li>
                <li>Generate actionable recommendations</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.form>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Summary Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                  <div>
                    <h3 className="text-xl font-bold text-white">Investigation Complete</h3>
                    <p className="text-sm text-gray-400">
                      Entity: <span className="text-primary font-medium">{result.entity.name}</span> •{" "}
                      Type: {result.entity.type} • Duration: {result.duration}s
                    </p>
                  </div>
                </div>

                {result.analysis && (
                  <RiskScoreGauge score={result.analysis.riskScore} />
                )}
              </div>

              {result.analysis && (
                <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI Analysis Summary
                  </h4>
                  <p className="text-gray-300 text-sm">{result.analysis.summary}</p>
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-primary">
                  {result.findings.profiles.length}
                </div>
                <div className="text-xs text-gray-400 mt-1">Profiles Found</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {result.findings.profiles.filter((p) => p.confidence === "high").length}
                </div>
                <div className="text-xs text-gray-400 mt-1">High Confidence</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {result.findings.emails?.length || 0}
                </div>
                <div className="text-xs text-gray-400 mt-1">Emails</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {result.findings.domains?.length || 0}
                </div>
                <div className="text-xs text-gray-400 mt-1">Domains</div>
              </div>
            </div>

            {/* Key Insights */}
            {result.analysis && result.analysis.insights.length > 0 && (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Key Insights
                </h3>
                <ul className="space-y-2">
                  {result.analysis.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                      <span className="text-purple-400 mt-1">→</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Profiles Found */}
            {result.findings.profiles.length > 0 && (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Network className="w-5 h-5 text-green-400" />
                  Profiles Found ({result.findings.profiles.length})
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {result.findings.profiles
                    .sort((a, b) => {
                      const order = { high: 3, medium: 2, low: 1 };
                      return (order[b.confidence || "low"] || 0) - (order[a.confidence || "low"] || 0);
                    })
                    .map((profile, i) => (
                      <a
                        key={i}
                        href={profile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-white">{profile.platform}</span>
                              <ConfidenceBadge confidence={profile.confidence} />
                            </div>
                            {profile.url && (
                              <div className="text-xs text-gray-500 truncate">{profile.url}</div>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors flex-shrink-0 ml-2" />
                      </a>
                    ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metadata */}
            {result.findings.metadata && Object.keys(result.findings.metadata).length > 0 && (
              <details className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <summary className="cursor-pointer text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-gray-400" />
                  Investigation Metadata
                </summary>
                <pre className="mt-4 p-4 rounded-xl bg-black/30 text-xs text-gray-400 font-mono overflow-x-auto">
                  {JSON.stringify(result.findings.metadata, null, 2)}
                </pre>
              </details>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Example Queries */}
      {!result && !isInvestigating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            Example Queries
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { query: "Investigate @elonmusk", desc: "Search for username across platforms" },
              { query: "Analyze Elon Musk", desc: "AI detects username from person name" },
              { query: "Research github", desc: "Analyze organization presence" },
              { query: "Investigate @torvalds", desc: "Linux creator - Linus Torvalds" },
            ].map((example) => (
              <button
                key={example.query}
                onClick={() => setQuery(example.query)}
                className="p-4 rounded-xl bg-black/30 hover:bg-black/50 border border-white/10 hover:border-primary/30 transition-all text-left group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Search className="w-4 h-4 text-primary" />
                  <span className="font-medium text-white group-hover:text-primary transition-colors">
                    {example.query}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{example.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}