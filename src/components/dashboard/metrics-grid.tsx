"use client";

import { motion } from "framer-motion";
import {
  Users,
  FileText,
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
  Shield,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStats } from "@/hooks/useDashboardStats";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  color?: "matrix" | "electric" | "warning" | "critical";
  delay?: number;
  loading?: boolean;
}

function MetricCard({
  title,
  value,
  change,
  changeLabel = "vs last week",
  icon: Icon,
  color = "matrix",
  delay = 0,
  loading = false,
}: MetricCardProps) {
  const colorClasses = {
    matrix: {
      icon: "text-matrix bg-matrix/10",
      glow: "group-hover:shadow-glow",
    },
    electric: {
      icon: "text-electric bg-electric/10",
      glow: "group-hover:shadow-glow-electric",
    },
    warning: {
      icon: "text-warning bg-warning/10",
      glow: "group-hover:shadow-[0_0_40px_rgba(255,149,0,0.15)]",
    },
    critical: {
      icon: "text-critical bg-critical/10",
      glow: "group-hover:shadow-glow-critical",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      className={cn(
        "group glass-panel glass-panel-hover rounded-2xl p-5 cursor-pointer relative overflow-hidden",
        colorClasses[color].glow
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
            colorClasses[color].icon
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        {change !== undefined && !loading && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              change >= 0 ? "text-safe" : "text-critical"
            )}
          >
            {change >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm text-text-secondary font-medium">{title}</h3>
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            <span className="text-gray-500">Loading...</span>
          </div>
        ) : (
          <p className="text-3xl font-bold text-white font-mono tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        )}
        {changeLabel && !loading && (
          <p className="text-xs text-text-muted">{changeLabel}</p>
        )}
      </div>

      {/* Decorative Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: delay * 0.1 + 0.3 }}
          className={cn(
            "h-full origin-left",
            color === "matrix" && "bg-gradient-to-r from-matrix/50 to-transparent",
            color === "electric" &&
              "bg-gradient-to-r from-electric/50 to-transparent",
            color === "warning" &&
              "bg-gradient-to-r from-warning/50 to-transparent",
            color === "critical" &&
              "bg-gradient-to-r from-critical/50 to-transparent"
          )}
        />
      </div>
    </motion.div>
  );
}

export function MetricsGrid() {
  const { data, isLoading } = useDashboardStats();

  const metrics = [
    {
      title: "Total Entities",
      value: data?.entities.total ?? 0,
      change: 12,
      icon: Users,
      color: "matrix" as const,
    },
    {
      title: "Intelligence Reports",
      value: data?.reports.total ?? 0,
      change: 8,
      icon: FileText,
      color: "electric" as const,
    },
    {
      title: "Active Threats",
      value: data?.entities.highRisk ?? 0,
      change: -23,
      changeLabel: "high risk entities",
      icon: AlertTriangle,
      color: "warning" as const,
    },
    {
      title: "Critical Alerts",
      value: data?.entities.critical ?? 0,
      change: undefined,
      changeLabel: "threat score ≥90",
      icon: Shield,
      color: "critical" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <MetricCard key={metric.title} {...metric} delay={index} loading={isLoading} />
      ))}
    </div>
  );
}

// Secondary Stats Component
export function SecondaryStats() {
  const { data, isLoading } = useDashboardStats();

  const stats = [
    { 
      label: "Database", 
      value: data?.systemHealth.database === "connected" ? "Connected" : "Disconnected",
      status: data?.systemHealth.database === "connected" ? "active" : "error",
    },
    { 
      label: "Tracking Links", 
      value: data?.tracking.totalLinks?.toString() ?? "0",
      status: "active",
    },
    { 
      label: "Total Clicks", 
      value: data?.tracking.totalClicks?.toLocaleString() ?? "0",
      status: "active",
    },
    { 
      label: "OSINT Searches", 
      value: data?.osint.totalSearches?.toString() ?? "0",
      status: "normal",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-panel rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-matrix" />
        <span className="text-sm font-medium text-white">System Health</span>
        {data?.error && (
          <span className="text-xs text-yellow-400 ml-2">
            ⚠️ Database not connected
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="space-y-1">
            <p className="text-xs text-text-muted">{stat.label}</p>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            ) : (
              <p className={cn(
                "text-lg font-mono font-semibold",
                stat.status === "error" ? "text-red-400" : "text-white"
              )}>
                {stat.value}
              </p>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
