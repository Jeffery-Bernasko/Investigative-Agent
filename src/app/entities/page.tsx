"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
  Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/layout";
import { cn, formatRelativeTime, getThreatLevel } from "@/lib/utils";
import { authClient } from "@/lib/auth/client";
import Link from "next/link";

interface Entity {
  id: number;
  type: string;
  name: string;
  threatLevel: string;
  threatScore: number;
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  tags?: string[] | null;
  description?: string | null;
  updatedAt: string;
  createdAt: string;
}

// type values match the DB enum
const entityTypes = [
  { type: "all", label: "All Types", icon: Users },
  { type: "person", label: "Persons", icon: Users },
  { type: "organization", label: "Organizations", icon: Building2 },
  { type: "domain", label: "Domains", icon: Globe },
  { type: "ip_address", label: "IP Addresses", icon: Server },
  { type: "email", label: "Emails", icon: Mail },
  { type: "phone", label: "Phones", icon: Phone },
];

const typeIcons: Record<string, React.ElementType> = {
  person: Users,
  organization: Building2,
  domain: Globe,
  ip_address: Server,
  email: Mail,
  phone: Phone,
  username: Users,
  other: Users,
};

const typeColors: Record<string, { bg: string; text: string }> = {
  person: { bg: "bg-electric/10", text: "text-electric" },
  organization: { bg: "bg-matrix/10", text: "text-matrix" },
  domain: { bg: "bg-purple-500/10", text: "text-purple-400" },
  ip_address: { bg: "bg-orange-500/10", text: "text-orange-400" },
  email: { bg: "bg-pink-500/10", text: "text-pink-400" },
  phone: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  username: { bg: "bg-cyan-500/10", text: "text-cyan-400" },
  other: { bg: "bg-graphite", text: "text-text-secondary" },
};

const PAGE_SIZE = 50;

export default function EntitiesPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortField, setSortField] = useState<"name" | "threatScore" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: sortField,
        sortOrder,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (searchQuery) params.set("search", searchQuery);
      if (selectedType !== "all") params.set("type", selectedType);
      if (session?.user?.id) params.set("userId", session.user.id);

      const res = await fetch(`/api/entities?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEntities(data.entities || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error("Failed to load entities:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedType, sortField, sortOrder, page, session?.user?.id]);

  const fetchTypeCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/entities", { method: "OPTIONS" });
      if (!res.ok) return;
      const data = await res.json();
      const counts: Record<string, number> = {};
      for (const row of data.byType || []) {
        counts[row.type] = Number(row.count);
      }
      setTypeCounts(counts);
    } catch {}
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  useEffect(() => {
    fetchTypeCounts();
  }, [fetchTypeCounts]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, selectedType, sortField, sortOrder]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this entity? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/entities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchEntities();
      fetchTypeCounts();
    } catch (err) {
      console.error("Failed to delete entity:", err);
      alert("Failed to delete entity.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageNumbers = Array.from(
    { length: Math.min(3, totalPages) },
    (_, i) => i + Math.max(0, Math.min(page - 1, totalPages - 3))
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
          {entityTypes.map((type) => {
            const count = type.type === "all" ? total : (typeCounts[type.type] || 0);
            return (
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
                <span className="text-xs opacity-60">({count})</span>
              </button>
            );
          })}
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
                  Tags
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => toggleSort("updatedAt")}
                    className="flex items-center gap-2 text-xs font-medium text-text-muted uppercase tracking-wider hover:text-white"
                  >
                    Last Updated
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-matrix mx-auto" />
                  </td>
                </tr>
              ) : entities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Users className="w-10 h-10 text-text-muted mx-auto mb-3" />
                    <p className="text-sm text-text-muted">
                      {searchQuery || selectedType !== "all"
                        ? "No entities match your filters."
                        : "No entities yet. Add one to get started."}
                    </p>
                  </td>
                </tr>
              ) : (
                entities.map((entity, index) => {
                  const Icon = typeIcons[entity.type] || Users;
                  const colors = typeColors[entity.type] || typeColors.other;
                  const threat = getThreatLevel(entity.threatScore);

                  return (
                    <motion.tr
                      key={entity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
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
                            {(entity.username || entity.email) && (
                              <p className="text-xs text-text-muted">
                                {entity.username || entity.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2 py-1 rounded-md text-xs font-medium capitalize", colors.bg, colors.text)}>
                          {entity.type.replace("_", " ")}
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
                        <div className="flex items-center gap-1 flex-wrap">
                          {(entity.tags || []).slice(0, 2).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 rounded text-2xs font-mono bg-graphite text-text-secondary">
                              {tag}
                            </span>
                          ))}
                          {(entity.tags?.length || 0) > 2 && (
                            <span className="text-2xs text-text-muted">+{entity.tags!.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-text-secondary">
                          {formatRelativeTime(entity.updatedAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/entities/${entity.id}`}>
                            <button className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-glass-bg transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() => router.push(`/entities/${entity.id}`)}
                            className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-glass-bg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entity.id)}
                            className="p-2 rounded-lg text-text-muted hover:text-critical hover:bg-critical/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-glass-border flex items-center justify-between">
            <p className="text-sm text-text-muted">
              Showing <span className="font-medium text-white">{entities.length}</span> of{" "}
              <span className="font-medium text-white">{total}</span> entities
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded-lg text-sm bg-glass-bg border border-glass-border text-text-secondary hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-sm",
                    p === page
                      ? "bg-matrix text-black font-medium"
                      : "bg-glass-bg border border-glass-border text-text-secondary hover:text-white transition-colors"
                  )}
                >
                  {p + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 rounded-lg text-sm bg-glass-bg border border-glass-border text-text-secondary hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardShell>
  );
}
