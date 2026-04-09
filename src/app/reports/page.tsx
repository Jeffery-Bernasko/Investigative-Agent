"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  Filter,
  Plus,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  Download,
  RefreshCw,
  X,
  Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/layout";
import { cn, formatRelativeTime } from "@/lib/utils";
import { authClient } from "@/lib/auth/client";

interface Report {
  id: number;
  title: string;
  content: string;
  summary?: string | null;
  status: string;
  threatLevel: string;
  source?: string | null;
  sourceUrl?: string | null;
  tags?: string[] | null;
  aiInsights?: unknown;
  userId?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const threatConfig = {
  unknown: { icon: CheckCircle, color: "text-text-muted", bg: "bg-glass-bg", label: "Unknown" },
  low: { icon: CheckCircle, color: "text-safe", bg: "bg-safe/10", label: "Low" },
  medium: { icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Medium" },
  high: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "High" },
  critical: { icon: XCircle, color: "text-critical", bg: "bg-critical/10", label: "Critical" },
} as const;

type ThreatLevel = keyof typeof threatConfig;

function getThreatConfig(level: string) {
  return threatConfig[level as ThreatLevel] || threatConfig.unknown;
}

interface NewReportForm {
  title: string;
  content: string;
  threatLevel: ThreatLevel;
  source: string;
  tags: string;
}

export default function ReportsPage() {
  const { data: session } = authClient.useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThreatLevel, setSelectedThreatLevel] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newForm, setNewForm] = useState<NewReportForm>({
    title: "",
    content: "",
    threatLevel: "unknown",
    source: "",
    tags: "",
  });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: "100",
      });
      if (searchQuery) params.set("search", searchQuery);
      if (selectedThreatLevel) params.set("threatLevel", selectedThreatLevel);
      if (session?.user?.id) params.set("userId", session.user.id);

      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedThreatLevel, session?.user?.id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/reports?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      console.error("Failed to delete report:", err);
      alert("Failed to delete report.");
    }
  };

  const handleCreateReport = async () => {
    if (!newForm.title.trim() || !newForm.content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newForm.title.trim(),
          content: newForm.content.trim(),
          threatLevel: newForm.threatLevel,
          source: newForm.source.trim() || null,
          tags: newForm.tags.trim()
            ? newForm.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : null,
          userId: session?.user?.id || null,
          status: "draft",
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      setShowNewModal(false);
      setNewForm({ title: "", content: "", threatLevel: "unknown", source: "", tags: "" });
      fetchReports();
    } catch (err) {
      console.error("Failed to create report:", err);
      alert("Failed to create report.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesThreat = !selectedThreatLevel || r.threatLevel === selectedThreatLevel;
    return matchesSearch && matchesThreat;
  });

  const threatCounts = reports.reduce(
    (acc, r) => {
      const lvl = r.threatLevel as ThreatLevel;
      acc[lvl] = (acc[lvl] || 0) + 1;
      return acc;
    },
    {} as Record<ThreatLevel, number>
  );

  return (
    <DashboardShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-electric/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-electric" />
              </div>
              Intelligence Reports
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Threat intelligence feed and analysis reports.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchReports}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sync
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Report
            </button>
          </div>
        </motion.div>

        {/* Threat Level Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {(["critical", "high", "medium", "low"] as const).map((level) => {
            const config = threatConfig[level];
            const Icon = config.icon;
            return (
              <button
                key={level}
                onClick={() =>
                  setSelectedThreatLevel(selectedThreatLevel === level ? null : level)
                }
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  selectedThreatLevel === level
                    ? `${config.bg} border-current`
                    : "glass-panel glass-panel-hover"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-5 h-5", config.color)} />
                  <div className="text-left">
                    <p
                      className={cn(
                        "text-xl font-bold font-mono",
                        selectedThreatLevel === level ? config.color : "text-white"
                      )}
                    >
                      {threatCounts[level] || 0}
                    </p>
                    <p className="text-xs text-text-muted capitalize">{level}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-void border border-glass-border text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-matrix/50"
            />
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </motion.div>

        {/* Reports List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="glass-panel rounded-xl p-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-matrix mx-auto" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="glass-panel rounded-xl p-12 text-center">
                <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Reports Found
                </h3>
                <p className="text-sm text-text-secondary">
                  {searchQuery || selectedThreatLevel
                    ? "Try adjusting your search or filters."
                    : "Create your first report to get started."}
                </p>
              </div>
            ) : (
              filteredReports.map((report, index) => {
                const config = getThreatConfig(report.threatLevel);
                const Icon = config.icon;

                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    onClick={() => setSelectedReport(report)}
                    className={cn(
                      "p-5 rounded-xl border cursor-pointer transition-all",
                      selectedReport?.id === report.id
                        ? "glass-panel border-matrix/30 shadow-glow"
                        : "glass-panel glass-panel-hover"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          config.bg
                        )}
                      >
                        <Icon className={cn("w-5 h-5", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-base font-semibold text-white">
                            {report.title}
                          </h3>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium capitalize flex-shrink-0",
                              config.bg,
                              config.color
                            )}
                          >
                            {report.threatLevel}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                          {report.summary || report.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {(report.tags || []).slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded text-2xs font-mono bg-graphite text-text-secondary"
                              >
                                {tag}
                              </span>
                            ))}
                            {(report.tags?.length || 0) > 3 && (
                              <span className="text-2xs text-text-muted">
                                +{report.tags!.length - 3} more
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-text-muted">
                            {report.source && <span>{report.source}</span>}
                            {report.source && <span>•</span>}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(report.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Detail Panel */}
          <div className="space-y-4">
            {selectedReport ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-panel rounded-xl p-5 sticky top-24"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Report Details
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-glass-bg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(selectedReport.id)}
                      className="p-2 rounded-lg text-text-muted hover:text-critical hover:bg-critical/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text-muted">Title</label>
                    <p className="text-sm text-white mt-1">{selectedReport.title}</p>
                  </div>

                  <div>
                    <label className="text-xs text-text-muted">Content</label>
                    <p className="text-sm text-text-secondary mt-1 max-h-48 overflow-y-auto">
                      {selectedReport.content}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-text-muted">Threat Level</label>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs font-medium capitalize",
                          getThreatConfig(selectedReport.threatLevel).bg,
                          getThreatConfig(selectedReport.threatLevel).color
                        )}
                      >
                        {selectedReport.threatLevel}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted">Status</label>
                      <p className="text-sm text-white mt-1 capitalize">{selectedReport.status}</p>
                    </div>
                  </div>

                  {selectedReport.source && (
                    <div>
                      <label className="text-xs text-text-muted">Source</label>
                      <p className="text-sm text-white mt-1">{selectedReport.source}</p>
                    </div>
                  )}

                  {selectedReport.tags && selectedReport.tags.length > 0 && (
                    <div>
                      <label className="text-xs text-text-muted">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedReport.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 rounded-lg text-xs font-mono bg-graphite text-text-secondary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-glass-border">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-text-muted">Created</span>
                        <p className="text-white font-mono mt-1">
                          {new Date(selectedReport.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-muted">Updated</span>
                        <p className="text-white font-mono mt-1">
                          {new Date(selectedReport.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="glass-panel rounded-xl p-8 text-center">
                <FileText className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-muted">
                  Select a report to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Report Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-2xl p-6 w-full max-w-lg mx-4 border border-glass-border"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">New Report</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-glass-bg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-muted mb-1 block">Title *</label>
                <input
                  type="text"
                  value={newForm.title}
                  onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Report title..."
                  className="w-full px-3 py-2 rounded-lg bg-void border border-glass-border text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-matrix/50"
                />
              </div>

              <div>
                <label className="text-xs text-text-muted mb-1 block">Content *</label>
                <textarea
                  value={newForm.content}
                  onChange={(e) => setNewForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Report content..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-void border border-glass-border text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-matrix/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Threat Level</label>
                  <select
                    value={newForm.threatLevel}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, threatLevel: e.target.value as ThreatLevel }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-void border border-glass-border text-sm text-white focus:outline-none focus:border-matrix/50"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Source</label>
                  <input
                    type="text"
                    value={newForm.source}
                    onChange={(e) => setNewForm((f) => ({ ...f, source: e.target.value }))}
                    placeholder="e.g. Internal, OSINT..."
                    className="w-full px-3 py-2 rounded-lg bg-void border border-glass-border text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-matrix/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-text-muted mb-1 block">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newForm.tags}
                  onChange={(e) => setNewForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="phishing, apt, malware..."
                  className="w-full px-3 py-2 rounded-lg bg-void border border-glass-border text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-matrix/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReport}
                disabled={!newForm.title.trim() || !newForm.content.trim() || submitting}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Report
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardShell>
  );
}
