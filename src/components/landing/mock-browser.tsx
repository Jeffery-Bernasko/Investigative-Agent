"use client";
import { motion } from "framer-motion";
import {
    Shield,
    Search,
    Network,
    Lock,
    TrendingUp,
    Database,
    Activity,
    Terminal,
    Eye,
    BarChart3,
} from "lucide-react";

// Mock Browser Component showing the Septo Dashboard
export function MockBrowser() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative w-full max-w-5xl mx-auto mt-8"
        >
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 via-cyan-500/20 to-purple-500/30 rounded-3xl blur-3xl opacity-60" />

            {/* Browser frame */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-2xl">
                {/* Browser header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-black/40 rounded-lg text-sm text-gray-400 border border-white/5">
                            <Lock className="w-3 h-3 text-green-500" />
                            <span className="font-mono text-xs">septo.app/dashboard</span>
                        </div>
                    </div>
                    <div className="w-16" />
                </div>

                {/* Dashboard content */}
                <div className="relative aspect-[16/10] overflow-hidden bg-[#050505]">
                    {/* Sidebar */}
                    <div className="absolute left-0 top-0 bottom-0 w-48 bg-[#0a0a0a] border-r border-white/5 p-3">
                        <div className="flex items-center gap-2 mb-6 px-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                                <Shield className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-bold text-white text-sm tracking-wider">SEPTO</span>
                        </div>
                        <nav className="space-y-1">
                            {[
                                { name: "Dashboard", icon: BarChart3, active: true },
                                { name: "Entities", icon: Database },
                                { name: "Graph", icon: Network },
                                { name: "Reports", icon: Terminal },
                                { name: "OSINT", icon: Search },
                                { name: "Tracking", icon: Eye },
                            ].map((item) => (
                                <div
                                    key={item.name}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${item.active
                                        ? "bg-primary/10 text-primary border border-primary/20"
                                        : "text-gray-500 hover:text-gray-300"
                                        }`}
                                >
                                    <item.icon className="w-3.5 h-3.5" />
                                    {item.name}
                                </div>
                            ))}
                        </nav>
                    </div>

                    {/* Main content */}
                    <div className="absolute left-48 right-0 top-0 bottom-0 p-4 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-white text-sm font-semibold">Welcome back, Operator</h3>
                                <p className="text-gray-500 text-xs">Your threat intelligence overview</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs text-gray-400 font-mono">LIVE</span>
                            </div>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {[
                                { label: "Entities", value: "2,847", trend: "+12%", color: "text-primary" },
                                { label: "Reports", value: "523", trend: "+8%", color: "text-cyan-400" },
                                { label: "Threats", value: "17", trend: "-3%", color: "text-yellow-400" },
                                { label: "Critical", value: "3", trend: "+1", color: "text-red-400" },
                            ].map((stat) => (
                                <div key={stat.label} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                                    <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-0.5">{stat.label}</p>
                                    <div className="flex items-baseline gap-1">
                                        <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                                        <span className="text-[8px] text-green-400">{stat.trend}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Chart area */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white text-[10px] font-medium uppercase tracking-wider">Threat Analytics</span>
                                    <Activity className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <div className="flex items-end gap-0.5 h-20">
                                    {[35, 55, 40, 70, 50, 65, 75, 55, 80, 65, 85, 70].map((h, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ height: 0 }}
                                            animate={{ height: `${h}%` }}
                                            transition={{ delay: 0.8 + i * 0.05, type: "spring" }}
                                            className={`flex-1 rounded-t ${i === 11 ? "bg-primary" : "bg-white/10"}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Mini graph */}
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white text-[10px] font-medium uppercase tracking-wider">Network</span>
                                    <Network className="w-3.5 h-3.5 text-cyan-400" />
                                </div>
                                <div className="relative h-20 flex items-center justify-center">
                                    {/* Simple node visualization */}
                                    <div className="relative w-16 h-16">
                                        <motion.div
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary shadow-[0_0_15px_rgba(0,255,65,0.5)]"
                                        />
                                        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 1 + i * 0.1 }}
                                                className="absolute w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,212,255,0.6)]"
                                                style={{
                                                    top: `${50 + 40 * Math.sin(angle * Math.PI / 180)}%`,
                                                    left: `${50 + 40 * Math.cos(angle * Math.PI / 180)}%`,
                                                    transform: "translate(-50%, -50%)",
                                                }}
                                            />
                                        ))}
                                        {/* Connection lines */}
                                        <svg className="absolute inset-0 w-full h-full">
                                            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                                                <motion.line
                                                    key={i}
                                                    x1="50%"
                                                    y1="50%"
                                                    x2={`${50 + 40 * Math.cos(angle * Math.PI / 180)}%`}
                                                    y2={`${50 + 40 * Math.sin(angle * Math.PI / 180)}%`}
                                                    stroke="rgba(0, 212, 255, 0.3)"
                                                    strokeWidth="1"
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ delay: 1.2 + i * 0.1 }}
                                                />
                                            ))}
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating elements */}
            <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute -right-4 top-24 px-3 py-2 rounded-xl bg-[#0a0a0a]/90 border border-primary/30 backdrop-blur-sm shadow-[0_0_30px_rgba(0,255,65,0.2)]"
            >
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-xs text-white font-medium">+23% detected</span>
                </div>
            </motion.div>

            <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 4, delay: 1 }}
                className="absolute -left-4 bottom-24 px-3 py-2 rounded-xl bg-[#0a0a0a]/90 border border-cyan-500/30 backdrop-blur-sm shadow-[0_0_30px_rgba(0,212,255,0.2)]"
            >
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-white font-medium">3 new alerts</span>
                </div>
            </motion.div>
        </motion.div>
    );
}
