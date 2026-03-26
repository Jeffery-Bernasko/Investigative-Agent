"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { authClient } from "@/lib/auth/client";
import {
  LayoutDashboard,
  Users,
  Network,
  FileText,
  Search,
  Bot,
  Link2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  Database,
  Crosshair,
  Fingerprint,
  LogOut,
  User,
  Brain,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

function UserSection({ isCollapsed }: { isCollapsed: boolean }) {
  const { data: session, isPending } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  if (isPending) {
    return (
      <div className="glass-panel rounded-lg p-3 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-matrix/30 border-t-matrix rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <AnimatePresence>
      {!isCollapsed ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="glass-panel rounded-lg p-3 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-matrix/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-matrix" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {session.user.name || "Operator"}
              </p>
              <p className="text-xs text-text-muted truncate">
                {session.user.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </motion.div>
      ) : (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleSignOut}
          className="w-full flex items-center justify-center p-3 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview & metrics",
  },
  {
    name: "Investigation",
    href: "/investigation",
    icon: Brain,
    description: "AI-powered OSINT",
    badge: "AI",
    highlight: true, // New feature highlight
  },
  {
    name: "Investigative Agent",
    href: "/investigative-agent",
    icon: Fingerprint,
    description: "Person OSINT + PDF",
    badge: "NEW",
    highlight: true,
  },
  {
    name: "Entities",
    href: "/entities",
    icon: Users,
    description: "Manage profiles",
  },
  {
    name: "Graph",
    href: "/graph",
    icon: Network,
    description: "Relationship map",
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
    description: "Intelligence feed",
  },
  {
    name: "Search",
    href: "/search",
    icon: Search,
    description: "Vector search",
  },
  {
    name: "AI Analysis",
    href: "/analysis",
    icon: Bot,
    description: "Query assistant",
  },
  {
    name: "OSINT Tools",
    href: "/osint",
    icon: Crosshair,
    description: "Manual searches",
  },
  {
    name: "Tracking",
    href: "/tracking",
    icon: Link2,
    description: "Link generator",
  },
];

const secondaryNav = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Account", href: "/account/settings", icon: User },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative h-screen flex flex-col glass-panel border-r border-glass-border"
    >
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-glass-border">
        <Link href="/" className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-matrix/10 flex items-center justify-center hover:bg-matrix/20 transition-colors">
            <Shield className="w-6 h-6 text-matrix" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-matrix status-dot-active" />
        </Link>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              <span className="font-bold text-lg tracking-tight text-white">
                SEPTO
              </span>
              <span className="text-2xs text-text-muted font-mono uppercase tracking-widest">
                Threat Intel
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 no-scrollbar">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 mb-2 text-2xs font-medium text-text-muted uppercase tracking-widest"
            >
              Main
            </motion.p>
          )}
        </AnimatePresence>

        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-matrix/10 text-matrix"
                  : "text-text-secondary hover:text-white hover:bg-glass-bg"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  isActive ? "text-matrix" : "text-text-muted group-hover:text-white"
                )}
              />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {item.name}
                      </span>
                      <span className="text-2xs text-text-muted truncate">
                        {item.description}
                      </span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-2xs font-bold rounded bg-matrix/20 text-matrix border border-matrix/30">
                        {item.badge}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute right-0 w-1 h-8 bg-matrix rounded-l-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              {item.highlight && !isCollapsed && !isActive && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-matrix"
                />
              )}
            </Link>
          );
        })}

        {/* Secondary Navigation */}
        <div className="pt-4 mt-4 border-t border-glass-border">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-3 mb-2 text-2xs font-medium text-text-muted uppercase tracking-widest"
              >
                System
              </motion.p>
            )}
          </AnimatePresence>

          {secondaryNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-matrix/10 text-matrix"
                    : "text-text-secondary hover:text-white hover:bg-glass-bg"
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    isActive ? "text-matrix" : "text-text-muted group-hover:text-white"
                  )}
                />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm truncate"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-glass-border">
        <UserSection isCollapsed={isCollapsed} />
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-graphite border border-glass-border flex items-center justify-center text-text-muted hover:text-white hover:border-matrix/30 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </motion.aside>
  );
}