"use client";
import { motion } from "framer-motion";
// Feature Card Component
export function FeatureCard({
    icon: Icon,
    title,
    description,
    accentColor,
    delay,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    accentColor: string;
    delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay }}
            className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-white/[0.04]"
        >
            <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${accentColor} to-transparent`} />
            <div className="relative">
                <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-white/5`}>
                    <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
            </div>
        </motion.div>
    );
}
