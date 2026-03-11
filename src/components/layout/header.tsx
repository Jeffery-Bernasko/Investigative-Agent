"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Bell,
  Command,
  Moon,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserButton } from "@neondatabase/neon-js/auth/react";

export function Header() {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [notifications] = useState(3);

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-glass-border bg-obsidian/80 backdrop-blur-lg sticky top-0 z-50">
      {/* Left Section - Page Title */}
      <div className="flex items-center gap-4">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-semibold text-white"
        >
          Dashboard
        </motion.h1>
        <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted">
          <span className="status-dot status-dot-active" />
          <span className="font-mono">Live</span>
        </div>
      </div>

      {/* Center Section - Global Search */}
      <div className="flex-1 max-w-xl mx-8">
        <motion.div
          animate={{
            scale: isSearchFocused ? 1.02 : 1,
            borderColor: isSearchFocused
              ? "rgba(0, 255, 65, 0.3)"
              : "rgba(255, 255, 255, 0.06)",
          }}
          transition={{ duration: 0.2 }}
          className={cn(
            "relative flex items-center gap-3 px-4 py-2 rounded-xl",
            "bg-void border transition-all",
            isSearchFocused && "shadow-glow"
          )}
        >
          <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
          <input
            type="text"
            placeholder="Search entities, reports, or commands..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-text-muted outline-none"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-graphite text-2xs text-text-muted font-mono">
            <Command className="w-3 h-3" />K
          </kbd>
        </motion.div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-glass-bg transition-colors">
          <Moon className="w-5 h-5" />
        </button>

        {/* Help */}
        <button className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-glass-bg transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-text-muted hover:text-white hover:bg-glass-bg transition-colors">
          <Bell className="w-5 h-5" />
          {notifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-critical text-2xs font-bold flex items-center justify-center text-white">
              {notifications}
            </span>
          )}
        </button>

        {/* Separator */}
        <div className="w-px h-8 bg-glass-border mx-2" />

        {/* User Menu from Neon Auth */}
        <UserButton />
      </div>
    </header>
  );
}
