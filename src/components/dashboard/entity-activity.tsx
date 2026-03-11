"use client";

import { motion } from "framer-motion";
import {
  User,
  Building2,
  Globe,
  Server,
  ArrowRight,
  ExternalLink,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn, formatRelativeTime, getEntityTypeConfig, getThreatLevel } from "@/lib/utils";
import Link from "next/link";

interface Entity {
  id: string;
  name: string;
  type: "person" | "organization" | "domain" | "ip";
  threatScore: number;
  lastSeen: string;
  tags?: string[];
}

// No mock data - start fresh

const typeIcons = {
  person: User,
  organization: Building2,
  domain: Globe,
  ip: Server,
};

function EntityRow({ entity, index }: { entity: Entity; index: number }) {
  const Icon = typeIcons[entity.type];
  const threatLevel = getThreatLevel(entity.threatScore);
  const config = getEntityTypeConfig(entity.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group flex items-center gap-3 p-3 rounded-lg hover:bg-glass-bg transition-colors cursor-pointer"
    >
      {/* Icon */}
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
          config.bgColor
        )}
      >
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate group-hover:text-matrix transition-colors">
            {entity.name}
          </span>
          {entity.threatScore > 70 && (
            <AlertCircle className="w-3 h-3 text-critical flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-2xs text-text-muted capitalize">
            {entity.type}
          </span>
          <span className="text-text-muted">•</span>
          <span className="text-2xs text-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(entity.lastSeen)}
          </span>
        </div>
      </div>

      {/* Threat Score */}
      <div className="flex flex-col items-end gap-1">
        <span
          className={cn(
            "text-xs font-mono font-medium",
            threatLevel.color
          )}
        >
          {entity.threatScore}
        </span>
        <div className="w-12 h-1.5 bg-graphite rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${entity.threatScore}%` }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={cn(
              "h-full rounded-full",
              entity.threatScore >= 75 && "bg-critical",
              entity.threatScore >= 50 && entity.threatScore < 75 && "bg-warning",
              entity.threatScore >= 25 && entity.threatScore < 50 && "bg-yellow-400",
              entity.threatScore < 25 && "bg-safe"
            )}
          />
        </div>
      </div>

      {/* Arrow */}
      <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

export function EntityActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="glass-panel rounded-2xl overflow-hidden h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <User className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Recent Entities
            </h3>
            <p className="text-xs text-text-muted">
              Latest profile activity
            </p>
          </div>
        </div>
        <Link
          href="/entities"
          className="text-xs text-matrix hover:underline font-medium"
        >
          View All
        </Link>
      </div>

      {/* Entity List */}
      <div className="p-2 space-y-1 max-h-[320px] overflow-y-auto no-scrollbar">
        {/* No entities yet - start fresh */}
      </div>

      {/* Stats Footer */}
      <div className="px-5 py-3 border-t border-glass-border bg-void/50 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-lg font-mono font-semibold text-white">0</p>
          <p className="text-2xs text-text-muted">Total</p>
        </div>
        <div>
          <p className="text-lg font-mono font-semibold text-warning">0</p>
          <p className="text-2xs text-text-muted">High Risk</p>
        </div>
        <div>
          <p className="text-lg font-mono font-semibold text-safe">+0</p>
          <p className="text-2xs text-text-muted">This Week</p>
        </div>
      </div>
    </motion.div>
  );
}

