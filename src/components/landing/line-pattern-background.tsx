"use client";
import { motion } from "framer-motion";

// Line pattern background component
export function LinePatternBackground() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {/* Gradient orbs */}
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[150px]" />
            <div className="absolute bottom-0 right-1/4 w-[700px] h-[700px] bg-cyan-500/10 rounded-full blur-[180px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-purple-500/5 rounded-full blur-[200px]" />

            {/* Line patterns - diagonal */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="diagonal-lines" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M-10,10 l20,-20 M0,40 l40,-40 M30,50 l20,-20" stroke="rgba(0, 255, 65, 0.5)" strokeWidth="0.5" fill="none" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#diagonal-lines)" />
            </svg>

            {/* Horizontal scan lines */}
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 255, 65, 0.1) 2px,
            rgba(0, 255, 65, 0.1) 4px
          )`,
                }}
            />

            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(0, 255, 65, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 65, 0.1) 1px, transparent 1px)
          `,
                    backgroundSize: "60px 60px",
                }}
            />

            {/* Animated scan line */}
            <motion.div
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                initial={{ top: "0%" }}
                animate={{ top: "100%" }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
}
