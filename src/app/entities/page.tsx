"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Building2,
  Globe,
  Server,
  Mail,
  Phone,
  Search,
  Filter,
  Plus,
  ChevronDown,
  ExternalLink,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
} from "lucide-react";
import { DashboardShell } from "@/components/layout";
import { cn, formatRelativeTime, getThreatLevel } from "@/lib/utils";
import Link from "next/link";

interface Entity {
  id: string;
  type: "person" | "organization" | "domain" | "ip" | "email" | "phone";
  name: string;
  aliases: string[];
  threatScore: number;
  metadata: Record<string, any>;
  firstSeen: string;
  lastSeen: string;
  socialProfiles?: number;
  connections?: number;
}

// No mock data - start fresh

const entityTypes = [
  { type: "all", label: "All Types", icon: Users, count: 0 },
  { type: "person", label: "Persons", icon: Users, count: 0 },
  { type: "organization", label: "Organizations", icon: Building2, count: 0 },
  { type: "domain", label: "Domains", icon: Globe, count: 0 },
  { type: "ip", label: "IP Addresses", icon: Server, count: 0 },
  { type: "email", label: "Emails", icon: Mail, count: 0 },
  { type: "phone", label: "Phones", icon: Phone, count: 0 },
];

const typeIcons: Record<string, React.ElementType> = {
  person: Users,
  organization: Building2,
  domain: Globe,
  ip: Server,
  email: Mail,
  phone: Phone,
};

const typeColors: Record<string, { bg: string; text: string }> = {
  person: { bg: "bg-electric/10", text: "text-electric" },
  organization: { bg: "bg-matrix/10", text: "text-matrix" },
  domain: { bg: "bg-purple-500/10", text: "text-purple-400" },
  ip: { bg: "bg-orange-500/10", text: "text-orange-400" },
  email: { bg: "bg-pink-500/10", text: "text-pink-400" },
  phone: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
};

export default function EntitiesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortField, setSortField] = useState<"name" | "threatScore" | "lastSeen">("lastSeen");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // No entities yet - start fresh
  const filteredEntities: Entity[] = []
    .filter((entity) => {
      const matchesSearch = entity.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "all" || entity.type === selectedType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "threatScore") {
        comparison = a.threatScore - b.threatScore;
      } else {
        comparison = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
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
            <h1 className="text-2xl font-bold text-white">Entity Management</h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage profiles, organizations, domains, and other intelligence entities.
            </p>
          </div>
          <Link href="/entities/new">
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Entity
            </button>
          </Link>
        </motion.div>

        {/* Type Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar"
        >
          {entityTypes.map((type) => (
            <button
              key={type.type}
              onClick={() => setSelectedType(type.type)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                selectedType === type.type
                  ? "bg-matrix/20 text-matrix border border-matrix/30"
                  : "bg-glass-bg text-text-secondary border border-glass-border hover:border-glass-border-hover hover:text-white"
              )}
            >
              <type.icon className="w-4 h-4" />
              {type.label}
              <span className="text-xs opacity-60">({type.count})</span>
            </button>
          ))}
        </motion.div>

        {/* Search and Filters */}
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
              placeholder="Search entities by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-void border border-glass-border text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-matrix/50"
            />
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Entity Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel rounded-2xl overflow-hidden"
        >
          <table className="w-full">
            <thead className="bg-void/50 border-b border-glass-border">
              <tr>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center gap-2 text-xs font-medium text-text-muted uppercase tracking-wider hover:text-white"
                  >
                    Entity
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => toggleSort("threatScore")}
                    className="flex items-center gap-2 text-xs font-medium text-text-muted uppercase tracking-wider hover:text-white"
                  >
                    Threat Score
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  Connections
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => toggleSort("lastSeen")}
                    className="flex items-center gap-2 text-xs font-medium text-text-muted uppercase tracking-wider hover:text-white"
                  >
                    Last Seen
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filteredEntities.map((entity, index) => {
                const Icon = typeIcons[entity.type];
                const colors = typeColors[entity.type];
                const threat = getThreatLevel(entity.threatScore);

                return (
                  <motion.tr
                    key={entity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-glass-bg transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colors.bg)}>
                          <Icon className={cn("w-5 h-5", colors.text)} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-matrix transition-colors">
                            {entity.name}
                          </p>
                          {entity.aliases.length > 0 && (
                            <p className="text-xs text-text-muted">
                              aka: {entity.aliases.slice(0, 2).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-1 rounded-md text-xs font-medium capitalize", colors.bg, colors.text)}>
                        {entity.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-2 bg-graphite rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              entity.threatScore >= 75 && "bg-critical",
                              entity.threatScore >= 50 && entity.threatScore < 75 && "bg-warning",
                              entity.threatScore >= 25 && entity.threatScore < 50 && "bg-yellow-400",
                              entity.threatScore < 25 && "bg-safe"
                            )}
                            style={{ width: `${entity.threatScore}%` }}
                          />
                        </div>
                        <span className={cn("text-sm font-mono font-medium", threat.color)}>
                          {entity.threatScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-secondary font-mono">
                        {entity.connections || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-secondary">
                        {formatRelativeTime(entity.lastSeen)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/entities/${entity.id}`}>
                          <button className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-glass-bg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <button className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-glass-bg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg text-text-muted hover:text-critical hover:bg-critical/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-glass-border flex items-center justify-between">
            <p className="text-sm text-text-muted">
              Showing <span className="font-medium text-white">{filteredEntities.length}</span> of{" "}
              <span className="font-medium text-white">2,847</span> entities
            </p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 rounded-lg text-sm bg-glass-bg border border-glass-border text-text-secondary hover:text-white transition-colors">
                Previous
              </button>
              <button className="px-3 py-1 rounded-lg text-sm bg-matrix text-black font-medium">
                1
              </button>
              <button className="px-3 py-1 rounded-lg text-sm bg-glass-bg border border-glass-border text-text-secondary hover:text-white transition-colors">
                2
              </button>
              <button className="px-3 py-1 rounded-lg text-sm bg-glass-bg border border-glass-border text-text-secondary hover:text-white transition-colors">
                3
              </button>
              <button className="px-3 py-1 rounded-lg text-sm bg-glass-bg border border-glass-border text-text-secondary hover:text-white transition-colors">
                Next
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardShell>
  );
}

