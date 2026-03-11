"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  Filter,
  Plus,
  ChevronDown,
  ExternalLink,
  Clock,
  Tag,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  Download,
  RefreshCw,
} from "lucide-react";
import { DashboardShell } from "@/components/layout";
import { cn, formatRelativeTime, getSeverityColor } from "@/lib/utils";

interface Report {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceUrl?: string;
  severity: "low" | "medium" | "high" | "critical";
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// No mock data - start fresh

const severityConfig = {
  low: { icon: CheckCircle, color: "text-safe", bg: "bg-safe/10", label: "Low" },
  medium: { icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Medium" },
  high: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "High" },
  critical: { icon: XCircle, color: "text-critical", bg: "bg-critical/10", label: "Critical" },
};

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const filteredReports: Report[] = [];

  const severityCounts = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

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
            <button className="btn-secondary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Sync
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Report
            </button>
          </div>
        </motion.div>

        {/* Severity Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {(["critical", "high", "medium", "low"] as const).map((severity) => {
            const config = severityConfig[severity];
            const Icon = config.icon;
            return (
              <button
                key={severity}
                onClick={() =>
                  setSelectedSeverity(
                    selectedSeverity === severity ? null : severity
                  )
                }
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  selectedSeverity === severity
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
                        selectedSeverity === severity
                          ? config.color
                          : "text-white"
                      )}
                    >
                      {severityCounts[severity] || 0}
                    </p>
                    <p className="text-xs text-text-muted capitalize">
                      {severity}
                    </p>
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
            {filteredReports.map((report, index) => {
              const config = severityConfig[report.severity];
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
                        <h3 className="text-base font-semibold text-white group-hover:text-matrix">
                          {report.title}
                        </h3>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium capitalize flex-shrink-0",
                            config.bg,
                            config.color
                          )}
                        >
                          {report.severity}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                        {report.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          {report.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded text-2xs font-mono bg-graphite text-text-secondary"
                            >
                              {tag}
                            </span>
                          ))}
                          {report.tags.length > 3 && (
                            <span className="text-2xs text-text-muted">
                              +{report.tags.length - 3} more
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-text-muted">
                          <span>{report.source}</span>
                          <span>•</span>
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
            })}

            {filteredReports.length === 0 && (
              <div className="glass-panel rounded-xl p-12 text-center">
                <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Reports Found
                </h3>
                <p className="text-sm text-text-secondary">
                  Try adjusting your search or filters.
                </p>
              </div>
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
                    <button className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-glass-bg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg text-text-muted hover:text-critical hover:bg-critical/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text-muted">Title</label>
                    <p className="text-sm text-white mt-1">
                      {selectedReport.title}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-text-muted">Content</label>
                    <p className="text-sm text-text-secondary mt-1">
                      {selectedReport.content}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-text-muted">Source</label>
                      <p className="text-sm text-white mt-1">
                        {selectedReport.source}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted">Severity</label>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs font-medium capitalize",
                          severityConfig[selectedReport.severity].bg,
                          severityConfig[selectedReport.severity].color
                        )}
                      >
                        {selectedReport.severity}
                      </span>
                    </div>
                  </div>

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

                  <div className="pt-4 border-t border-glass-border">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-text-muted">Created</span>
                        <p className="text-white font-mono mt-1">
                          {new Date(
                            selectedReport.createdAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-muted">Updated</span>
                        <p className="text-white font-mono mt-1">
                          {new Date(
                            selectedReport.updatedAt
                          ).toLocaleDateString()}
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
    </DashboardShell>
  );
}

