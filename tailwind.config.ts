import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base Colors - The Void
        void: "#050505",
        obsidian: "#0a0a0a",
        carbon: "#111111",
        graphite: "#1a1a1a",
        slate: "#2a2a2a",
        smoke: "#3a3a3a",

        // Primary Accent - Matrix Green
        matrix: {
          DEFAULT: "#00ff41",
          dim: "#00cc33",
          dark: "#009922",
          glow: "rgba(0, 255, 65, 0.4)",
          subtle: "rgba(0, 255, 65, 0.1)",
        },

        // Secondary Accents
        electric: {
          DEFAULT: "#00d4ff",
          dim: "#00a8cc",
          glow: "rgba(0, 212, 255, 0.4)",
        },
        
        warning: {
          DEFAULT: "#ff9500",
          dim: "#cc7700",
          glow: "rgba(255, 149, 0, 0.4)",
        },
        
        critical: {
          DEFAULT: "#ff3b3b",
          dim: "#cc2f2f",
          glow: "rgba(255, 59, 59, 0.4)",
        },
        
        safe: {
          DEFAULT: "#00ff88",
          dim: "#00cc6a",
          glow: "rgba(0, 255, 136, 0.4)",
        },

        // Glass Effects
        glass: {
          bg: "rgba(255, 255, 255, 0.02)",
          "bg-hover": "rgba(255, 255, 255, 0.04)",
          border: "rgba(255, 255, 255, 0.06)",
          "border-hover": "rgba(255, 255, 255, 0.1)",
        },

        // Text Colors
        text: {
          primary: "#ffffff",
          secondary: "#888888",
          muted: "#555555",
          ghost: "#333333",
        },

        // Primary (alias for matrix - needed for Tailwind classes like bg-primary)
        primary: {
          DEFAULT: "#00ff41",
          foreground: "#000000",
        },

        // Semantic
        border: "rgba(255, 255, 255, 0.06)",
        input: "rgba(255, 255, 255, 0.02)",
        ring: "rgba(0, 255, 65, 0.5)",
        background: "#0a0a0a",
        foreground: "#ffffff",

        // Chart Colors
        chart: {
          1: "#00ff41",
          2: "#00d4ff",
          3: "#ff9500",
          4: "#ff3b3b",
          5: "#a855f7",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "Menlo", "monospace"],
        display: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "6px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        "glass-lg": "0 12px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        glow: "0 0 40px rgba(0, 255, 65, 0.15)",
        "glow-lg": "0 0 60px rgba(0, 255, 65, 0.2)",
        "glow-electric": "0 0 40px rgba(0, 212, 255, 0.15)",
        "glow-critical": "0 0 40px rgba(255, 59, 59, 0.15)",
        "inner-glow": "inset 0 0 30px rgba(0, 255, 65, 0.05)",
      },
      backdropBlur: {
        xs: "2px",
        glass: "20px",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "fade-up": "fadeUp 0.6s ease-out forwards",
        "slide-in-left": "slideInLeft 0.4s ease-out forwards",
        "slide-in-right": "slideInRight 0.4s ease-out forwards",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "scan-line": "scanLine 3s linear infinite",
        shimmer: "shimmer 2s linear infinite",
        "count-up": "countUp 1s ease-out forwards",
        float: "float 6s ease-in-out infinite",
        "grid-flow": "gridFlow 20s linear infinite",
        blink: "blink 1s step-end infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0, 255, 65, 0.1)" },
          "50%": { boxShadow: "0 0 40px rgba(0, 255, 65, 0.3)" },
        },
        scanLine: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        gridFlow: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "50px 50px" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      backgroundImage: {
        "grid-pattern": `
          linear-gradient(rgba(0, 255, 65, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 255, 65, 0.03) 1px, transparent 1px)
        `,
        "radial-glow": "radial-gradient(ellipse at center, rgba(0, 255, 65, 0.1) 0%, transparent 70%)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        shimmer: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
      },
      backgroundSize: {
        grid: "50px 50px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

