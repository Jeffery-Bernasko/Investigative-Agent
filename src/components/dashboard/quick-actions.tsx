"use client";

import { motion } from "framer-motion";
import {
  Search,
  UserPlus,
  FileText,
  Link2,
  Bot,
  Crosshair,
  Network,
  Camera,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: "matrix" | "electric" | "purple" | "orange";
  badge?: string;
}

const actions: QuickAction[] = [
  {
    title: "OSINT Lookup",
    description: "Search username, email, or phone",
    icon: Crosshair,
    href: "/osint",
    color: "matrix",
    badge: "Popular",
  },
  {
    title: "Add Entity",
    description: "Create new profile or organization",
    icon: UserPlus,
    href: "/entities/new",
    color: "electric",
  },
  {
    title: "AI Query",
    description: "Natural language database search",
    icon: Bot,
    href: "/analysis",
    color: "purple",
    badge: "AI",
  },
  {
    title: "Create Tracking Link",
    description: "Generate pixel or URL tracker",
    icon: Link2,
    href: "/tracking/new",
    color: "orange",
  },
];

const colorClasses = {
  matrix: {
    bg: "bg-matrix/10 group-hover:bg-matrix/20",
    text: "text-matrix",
    border: "group-hover:border-matrix/30",
  },
  electric: {
    bg: "bg-electric/10 group-hover:bg-electric/20",
    text: "text-electric",
    border: "group-hover:border-electric/30",
  },
  purple: {
    bg: "bg-purple-500/10 group-hover:bg-purple-500/20",
    text: "text-purple-400",
    border: "group-hover:border-purple-500/30",
  },
  orange: {
    bg: "bg-orange-500/10 group-hover:bg-orange-500/20",
    text: "text-orange-400",
    border: "group-hover:border-orange-500/30",
  },
};

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-panel rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Quick Actions</h3>
            <p className="text-xs text-text-muted">Common operations</p>
          </div>
        </div>
      </div>

      {/* Actions Grid */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <Link key={action.title} href={action.href}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
              className={cn(
                "group relative p-4 rounded-xl bg-glass-bg border border-glass-border transition-all cursor-pointer",
                colorClasses[action.color].border
              )}
            >
              {/* Badge */}
              {action.badge && (
                <span
                  className={cn(
                    "absolute top-2 right-2 px-2 py-0.5 rounded text-2xs font-medium",
                    colorClasses[action.color].bg,
                    colorClasses[action.color].text
                  )}
                >
                  {action.badge}
                </span>
              )}

              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                    colorClasses[action.color].bg
                  )}
                >
                  <action.icon
                    className={cn("w-5 h-5", colorClasses[action.color].text)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white group-hover:text-matrix transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-glass-border bg-void/50">
        <button className="w-full text-xs text-text-secondary hover:text-matrix transition-colors flex items-center justify-center gap-2">
          <span>View all tools</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

