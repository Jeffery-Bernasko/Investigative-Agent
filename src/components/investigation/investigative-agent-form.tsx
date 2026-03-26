"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  User,
  MapPin,
  Briefcase,
  AtSign,
  FileDown,
  Globe,
  Shield,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { generateInvestigativeReport } from "@/lib/investigative/pdf-report";
import type { InvestigativeReportData } from "@/lib/investigative/pdf-report";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileCandidate {
  platform: string;
  url: string;
  displayName: string;
  username: string;
  confidence: number;
  confidenceLabel: "high" | "medium" | "low";
  evidence: string[];
  pageTitle?: string;
  description?: string;
  avatarUrl?: string;
  avatarData?: string;
}

interface WebsiteCandidate {
  url: string;
  title: string;
  description: string;
  siteType: "personal" | "portfolio" | "blog" | "organization" | "other";
  confidence: number;
  confidenceLabel: "high" | "medium" | "low";
  evidence: string[];
}

// ── Confidence badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ label }: { label: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  const icons = { high: "🟢", medium: "🟡", low: "⚪" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${styles[label]}`}>
      {icons[label]} {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InvestigativeAgentForm() {
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [employer, setEmployer] = useState("");
  const [usernameHints, setUsernameHints] = useState<string[]>([""]);
  const [includeRawPii, setIncludeRawPii] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvestigativeReportData | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Username hints helpers
  const addHint = () => setUsernameHints((prev) => [...prev, ""]);
  const removeHint = (i: number) =>
    setUsernameHints((prev) => prev.filter((_, idx) => idx !== i));
  const updateHint = (i: number, val: string) =>
    setUsernameHints((prev) => prev.map((h, idx) => (idx === i ? val : h)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const hints = usernameHints.map((h) => h.trim()).filter(Boolean);
      const response = await fetch("/api/investigative-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          location: location.trim() || undefined,
          employer: employer.trim() || undefined,
          usernameHints: hints.length ? hints : undefined,
          includeRawPii,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Investigation failed");
      }

      const data = await response.json();
      if (data.success) {
        setResult(data as InvestigativeReportData);
        toast.success("Investigation complete!", {
          description: `Found ${data.profiles.length} profiles and ${data.websites.length} websites`,
        });
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err: any) {
      toast.error("Investigation failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    setGeneratingPdf(true);
    try {
      generateInvestigativeReport(result);
      toast.success("PDF report downloaded!");
    } catch (err: any) {
      toast.error("PDF generation failed", { description: err.message });
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-400" />
          Investigative Agent
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Discover social profiles, websites, and digital footprint for a person using public OSINT sources.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex gap-2 text-xs text-blue-300">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          <strong>OSINT Disclaimer:</strong> All data is gathered from publicly available sources only.
          No authentication is bypassed. For authorised security research purposes only.
          Sensitive PII is redacted by default.
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full name (required) */}
        <div>
          <label className="text-sm text-gray-400 mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Full Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Jane Doe"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 text-sm"
            required
          />
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Location (optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. New York, USA"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Employer (optional)
            </label>
            <input
              type="text"
              value={employer}
              onChange={(e) => setEmployer(e.target.value)}
              placeholder="e.g. Acme Corporation"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 text-sm"
            />
          </div>
        </div>

        {/* Username hints */}
        <div>
          <label className="text-sm text-gray-400 mb-1 flex items-center gap-1.5">
            <AtSign className="w-3.5 h-3.5" /> Username Hints (optional, up to 5)
          </label>
          <div className="space-y-2">
            {usernameHints.map((hint, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => updateHint(i, e.target.value)}
                  placeholder={`e.g. janedoe${i > 0 ? i + 1 : ""}`}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 text-sm"
                />
                {usernameHints.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeHint(i)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {usernameHints.length < 5 && (
              <button
                type="button"
                onClick={addHint}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add username hint
              </button>
            )}
          </div>
        </div>

        {/* PII toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeRawPii"
            checked={includeRawPii}
            onChange={(e) => setIncludeRawPii(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="includeRawPii" className="text-xs text-gray-400 cursor-pointer">
            Include unredacted PII in report (email/phone — use responsibly)
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !fullName.trim()}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Investigating...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Investigate
            </>
          )}
        </button>
      </form>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Summary bar */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-gray-400">Profiles</span>
                  <span className="ml-2 text-white font-bold">{result.profiles.length}</span>
                </div>
                <div>
                  <span className="text-gray-400">Websites</span>
                  <span className="ml-2 text-white font-bold">{result.websites.length}</span>
                </div>
                <div>
                  <span className="text-gray-400">Provider</span>
                  <span className="ml-2 text-white font-bold">{result.meta.searchProvider}</span>
                </div>
                <div>
                  <span className="text-gray-400">Duration</span>
                  <span className="ml-2 text-white font-bold">{result.meta.duration}s</span>
                </div>
              </div>
              <button
                onClick={handleDownloadPdf}
                disabled={generatingPdf}
                className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {generatingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                Download PDF Report
              </button>
            </div>

            {/* Executive summary */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                Executive Summary
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                {result.footprintAnalysis.executiveSummary}
              </p>
            </div>

            {/* Profiles */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                Discovered Profiles ({result.profiles.length})
              </h3>
              {result.profiles.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No social profiles discovered.</p>
              ) : (
                <div className="space-y-2">
                  {result.profiles.map((p, i) => (
                    <div
                      key={i}
                      className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-start gap-3"
                    >
                      {p.avatarData && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.avatarData}
                          alt={`${p.platform} avatar`}
                          className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-sm">{p.platform}</span>
                          <span className="text-gray-400 text-xs">@{p.username}</span>
                          <ConfidenceBadge label={p.confidenceLabel} />
                        </div>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs truncate flex items-center gap-1 mt-0.5"
                        >
                          {p.url}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                        {p.evidence.length > 0 && (
                          <p className="text-gray-500 text-xs mt-1 italic">
                            {p.evidence.slice(0, 2).join(" • ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Websites */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                Discovered Websites ({result.websites.length})
              </h3>
              {result.websites.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No personal websites discovered.</p>
              ) : (
                <div className="space-y-2">
                  {result.websites.map((w, i) => (
                    <div
                      key={i}
                      className="bg-white/5 border border-white/10 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{w.title}</span>
                        <span className="text-gray-400 text-xs bg-white/5 px-2 py-0.5 rounded">{w.siteType}</span>
                        <ConfidenceBadge label={w.confidenceLabel} />
                      </div>
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs truncate flex items-center gap-1 mt-0.5"
                      >
                        {w.url}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                      {w.description && (
                        <p className="text-gray-400 text-xs mt-1 line-clamp-2">{w.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Risk signals */}
            {result.footprintAnalysis.riskSignals.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  Risk Signals ({result.footprintAnalysis.riskSignals.length})
                </h3>
                <div className="space-y-2">
                  {result.footprintAnalysis.riskSignals.map((r, i) => {
                    const colors = {
                      high: "border-red-500/30 bg-red-500/5",
                      medium: "border-yellow-500/30 bg-yellow-500/5",
                      low: "border-gray-500/30 bg-gray-500/5",
                    };
                    const textColors = {
                      high: "text-red-400",
                      medium: "text-yellow-400",
                      low: "text-gray-400",
                    };
                    return (
                      <div key={i} className={`border rounded-lg p-3 ${colors[r.severity]}`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold uppercase ${textColors[r.severity]}`}>
                            [{r.severity}]
                          </span>
                          <span className="text-sm text-white">{r.signal}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{r.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sensitive exposure */}
            {result.footprintAnalysis.sensitiveExposure.found && (
              <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Sensitive Data Exposure
                </h3>
                <ul className="text-xs text-gray-300 space-y-1">
                  {result.footprintAnalysis.sensitiveExposure.items.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 mt-2 italic">
                  {result.footprintAnalysis.sensitiveExposure.cautionNote}
                </p>
              </div>
            )}

            {/* Recommendations */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Recommendations
              </h3>
              <ul className="space-y-1.5">
                {result.footprintAnalysis.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-green-400 flex-shrink-0">→</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            {/* Limitations */}
            <div className="bg-white/3 border border-white/5 rounded-lg p-3">
              <p className="text-xs text-gray-500 italic">{result.footprintAnalysis.limitations}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
