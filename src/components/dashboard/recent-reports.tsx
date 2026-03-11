"use client";

import { motion } from "framer-motion";
import {
  FileText,
  ExternalLink,
  Clock,
  Tag,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn, formatRelativeTime, getSeverityColor } from "@/lib/utils";

interface Report {
  id: string;
  title: string;
  content: string;
  source: string;
  severity: "low" | "medium" | "high" | "critical";
  tags: string[];
  createdAt: string;
}

// No mock data - start fresh

const severityIcons = {
  low: CheckCircle,
  medium: AlertCircle,
  high: AlertTriangle,
  critical: XCircle,
};

function ReportCard({ report, index }: { report: Report; index: number }) {
  const SeverityIcon = severityIcons[report.severity];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group p-4 rounded-xl bg-glass-bg hover:bg-glass-bg-hover border border-glass-border hover:border-matrix/20 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3">
        {/* Severity Icon */}
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
            report.severity === "low" && "bg-safe/10",
            report.severity === "medium" && "bg-warning/10",
            report.severity === "high" && "bg-warning/10",
            report.severity === "critical" && "bg-critical/10"
          )}
        >
          <SeverityIcon
            className={cn(
              "w-4 h-4",
              report.severity === "low" && "text-safe",
              report.severity === "medium" && "text-warning",
              report.severity === "high" && "text-warning",
              report.severity === "critical" && "text-critical"
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-medium text-white truncate group-hover:text-matrix transition-colors">
              {report.title}
            </h4>
            <ExternalLink className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>

          <p className="text-xs text-text-secondary line-clamp-2 mb-2">
            {report.content}
          </p>

          <div className="flex items-center justify-between">
            {/* Tags */}
            <div className="flex items-center gap-1 flex-wrap">
              {report.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded text-2xs font-mono bg-graphite text-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 text-2xs text-text-muted">
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
}

export function RecentReports() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-panel rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-electric/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-electric" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Intelligence Feed
            </h3>
            <p className="text-xs text-text-muted">
              Latest threat reports and advisories
            </p>
          </div>
        </div>
        <button className="text-xs text-matrix hover:underline font-medium">
          View All
        </button>
      </div>

      {/* Reports List */}
      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
        {/* No reports yet - start fresh */}
      </div>

      {/* Footer Stats */}
      <div className="px-5 py-3 border-t border-glass-border bg-void/50 flex items-center justify-between text-xs text-text-muted">
        <span>0 total reports</span>
        <span className="flex items-center gap-1">
          <span className="status-dot" />
          No data
        </span>
      </div>
    </motion.div>
  );
}

