"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Activity, TrendingUp, BarChart3, PieChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Mock data for the charts
const threatTrendData = [
  { name: "Jan", threats: 45, resolved: 40, critical: 5 },
  { name: "Feb", threats: 52, resolved: 48, critical: 8 },
  { name: "Mar", threats: 38, resolved: 35, critical: 3 },
  { name: "Apr", threats: 65, resolved: 58, critical: 12 },
  { name: "May", threats: 48, resolved: 45, critical: 6 },
  { name: "Jun", threats: 72, resolved: 65, critical: 15 },
  { name: "Jul", threats: 58, resolved: 52, critical: 9 },
  { name: "Aug", threats: 85, resolved: 78, critical: 18 },
  { name: "Sep", threats: 62, resolved: 58, critical: 7 },
  { name: "Oct", threats: 78, resolved: 70, critical: 14 },
  { name: "Nov", threats: 55, resolved: 50, critical: 8 },
  { name: "Dec", threats: 68, resolved: 62, critical: 11 },
];

const entityDistributionData = [
  { name: "Persons", value: 1245, color: "#00d4ff" },
  { name: "Organizations", value: 523, color: "#00ff41" },
  { name: "Domains", value: 687, color: "#a855f7" },
  { name: "IPs", value: 392, color: "#ff9500" },
];

const threatTypeData = [
  { name: "Phishing", count: 156 },
  { name: "Malware", count: 89 },
  { name: "Ransomware", count: 45 },
  { name: "Data Breach", count: 78 },
  { name: "DDoS", count: 34 },
  { name: "APT", count: 23 },
];

// Custom Tooltip Component
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel rounded-lg p-3 border border-glass-border shadow-lg">
        <p className="text-sm font-medium text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-text-secondary capitalize">{entry.name}:</span>
            <span className="font-mono text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

type ChartView = "area" | "bar" | "pie";

export function ThreatChart() {
  const [chartView, setChartView] = useState<ChartView>("area");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-panel rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-matrix/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-matrix" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Threat Analytics
            </h3>
            <p className="text-xs text-text-muted">
              12-month trend analysis
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-void">
          <button
            onClick={() => setChartView("area")}
            className={cn(
              "p-2 rounded-md transition-colors",
              chartView === "area"
                ? "bg-matrix/20 text-matrix"
                : "text-text-muted hover:text-white"
            )}
          >
            <TrendingUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => setChartView("bar")}
            className={cn(
              "p-2 rounded-md transition-colors",
              chartView === "bar"
                ? "bg-matrix/20 text-matrix"
                : "text-text-muted hover:text-white"
            )}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setChartView("pie")}
            className={cn(
              "p-2 rounded-md transition-colors",
              chartView === "pie"
                ? "bg-matrix/20 text-matrix"
                : "text-text-muted hover:text-white"
            )}
          >
            <PieChartIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 h-[300px]">
        {chartView === "area" && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={threatTrendData}>
              <defs>
                <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff41" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff41" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="name"
                stroke="#555555"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#555555"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="threats"
                stroke="#00ff41"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorThreats)"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                stroke="#00d4ff"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorResolved)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {chartView === "bar" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={threatTypeData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="name"
                stroke="#555555"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="#555555"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#00ff41" radius={[4, 4, 0, 0]}>
                {threatTypeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`rgba(0, 255, 65, ${0.4 + (index * 0.1)})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartView === "pie" && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={entityDistributionData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {entityDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-glass-border bg-void/50 flex items-center justify-center gap-6 text-xs">
        {chartView !== "pie" ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-matrix" />
              <span className="text-text-secondary">Threats Detected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-electric" />
              <span className="text-text-secondary">Resolved</span>
            </div>
          </>
        ) : (
          entityDistributionData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-text-secondary">{item.name}</span>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

