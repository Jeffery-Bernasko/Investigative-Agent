"use client";

import { motion } from "framer-motion";
// Stats Component
export function StatItem({ value, label, delay }: { value: string; label: string; delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay, type: "spring" }}
            className="text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5"
        >
            <div className="text-4xl md:text-5xl font-bold text-white mb-2 font-mono">{value}</div>
            <div className="text-sm text-gray-400">{label}</div>
        </motion.div>
    );
}
