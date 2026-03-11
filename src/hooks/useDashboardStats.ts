"use client";

import { useQuery } from "@tanstack/react-query";

interface DashboardStats {
  entities: {
    total: number;
    highRisk: number;
    critical: number;
    recent: Array<{
      id: number;
      name: string;
      type: string;
      threatScore: number;
      createdAt: string;
    }>;
    byType: Array<{ type: string; count: number; avg_threat_score: number }>;
    byThreatLevel: Array<{ threat_level: string; count: number }>;
  };
  reports: {
    total: number;
    recent: Array<{
      id: number;
      title: string;
      threatLevel: string;
      createdAt: string;
    }>;
  };
  tracking: {
    totalLinks: number;
    totalClicks: number;
    activeLinks: number;
  };
  osint: {
    totalSearches: number;
    completedSearches: number;
    todaySearches: number;
  };
  charts: {
    monthly: Array<{ month: string; count: number }>;
  };
  systemHealth: {
    database: string;
    api: string;
    ai: string;
  };
  error?: string;
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}


