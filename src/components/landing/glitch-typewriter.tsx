"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
// Infinite glitch typewriter effect with random retyping for "Threat Intelligence"
export function InfiniteGlitchTypewriter({ text, className }: { text: string; className?: string }) {
    const [displayText, setDisplayText] = useState("");
    const [isTyping, setIsTyping] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [glitchIndices, setGlitchIndices] = useState<Set<number>>(new Set());
    const [glitchChars, setGlitchChars] = useState<Map<number, string>>(new Map());
    const [shouldRetype, setShouldRetype] = useState(false);
    const [typingSpeed, setTypingSpeed] = useState(80);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const glitchIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const retypeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const currentIndexRef = useRef(0);
    const glitchCharSet = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`0123456789ABCDEF";

    // Main typing/deleting logic
    useEffect(() => {
        const type = () => {
            if (currentIndexRef.current < text.length) {
                currentIndexRef.current++;
                setDisplayText(text.slice(0, currentIndexRef.current));
                // Random speed variation for more organic feel
                setTypingSpeed(60 + Math.random() * 40);
            } else {
                setIsTyping(false);
                // After typing complete, wait random time before starting to delete
                const waitTime = 2000 + Math.random() * 3000; // 2-5 seconds
                retypeTimeoutRef.current = setTimeout(() => {
                    setIsDeleting(true);
                    setIsTyping(true);
                }, waitTime);
            }
        };

        const deleteChar = () => {
            if (currentIndexRef.current > 0) {
                currentIndexRef.current--;
                setDisplayText(text.slice(0, currentIndexRef.current));
                // Faster deletion
                setTypingSpeed(30 + Math.random() * 20);
            } else {
                setIsDeleting(false);
                setIsTyping(true);
                setDisplayText("");
                currentIndexRef.current = 0;
                // Random delay before retyping
                const retypeDelay = 500 + Math.random() * 1000;
                retypeTimeoutRef.current = setTimeout(() => {
                    setShouldRetype(true);
                }, retypeDelay);
            }
        };

        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            if (isDeleting) {
                deleteChar();
            } else if (isTyping) {
                type();
            }
        }, typingSpeed);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (retypeTimeoutRef.current) clearTimeout(retypeTimeoutRef.current);
        };
    }, [displayText, isTyping, isDeleting, text, typingSpeed]);

    // Reset for retyping
    useEffect(() => {
        if (shouldRetype) {
            setShouldRetype(false);
            setIsTyping(true);
            setIsDeleting(false);
            setDisplayText("");
            currentIndexRef.current = 0;
        }
    }, [shouldRetype]);

    // Continuous glitch effect - random characters glitch at random intervals
    useEffect(() => {
        const glitch = () => {
            if (displayText.length === 0) return;

            const newGlitchIndices = new Set<number>();
            const newGlitchChars = new Map<number, string>();

            // Random number of characters to glitch (1-3)
            const numGlitches = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numGlitches; i++) {
                // Only glitch non-space characters that exist
                let randomIndex;
                let attempts = 0;
                do {
                    randomIndex = Math.floor(Math.random() * displayText.length);
                    attempts++;
                } while ((displayText[randomIndex] === " " || displayText[randomIndex] === undefined) && attempts < 10);

                if (randomIndex >= 0 && randomIndex < displayText.length && displayText[randomIndex] !== " ") {
                    newGlitchIndices.add(randomIndex);
                    newGlitchChars.set(randomIndex, glitchCharSet[Math.floor(Math.random() * glitchCharSet.length)]);
                }
            }

            setGlitchIndices(newGlitchIndices);
            setGlitchChars(newGlitchChars);

            // Random glitch duration (50-200ms)
            const glitchDuration = 50 + Math.random() * 150;
            setTimeout(() => {
                setGlitchIndices(new Set());
                setGlitchChars(new Map());
            }, glitchDuration);
        };

        if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);

        // Random glitch interval (200-800ms) - more frequent when text is complete
        const baseInterval = displayText.length === text.length ? 200 : 500;
        const glitchInterval = baseInterval + Math.random() * 400;

        glitchIntervalRef.current = setInterval(glitch, glitchInterval);

        return () => {
            if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
        };
    }, [displayText, text.length]);

    return (
        <span className={`${className} relative inline-block`}>
            {displayText.split("").map((char, i) => {
                const isGlitching = glitchIndices.has(i);
                const glitchChar = glitchChars.get(i);

                return (
                    <motion.span
                        key={`${i}-${displayText.length}-${Date.now()}`}
                        className={`${char === " " ? "inline" : "inline-block"} relative`}
                        style={{
                            width: char === " " ? "0.3em" : undefined,
                        }}
                        animate={{
                            x: isGlitching ? [0, -2, 2, -1, 1, 0] : 0,
                            y: isGlitching ? [0, 1, -1, 0.5, -0.5, 0] : 0,
                            scale: isGlitching ? [1, 1.1, 0.9, 1.05, 0.95, 1] : 1,
                        }}
                        transition={{
                            duration: 0.15,
                            ease: "easeInOut",
                        }}
                    >
                        <span
                            className={`relative ${isGlitching
                                ? "text-electric"
                                : "text-transparent bg-clip-text"
                                }`}
                            style={{
                                backgroundImage: isGlitching
                                    ? "none"
                                    : "linear-gradient(135deg, #00ff41 0%, #00ff88 25%, #00d4ff 50%, #00a8ff 75%, #a855f7 100%)",
                                backgroundSize: "200% 200%",
                                animation: isGlitching ? "none" : "gradient-shift 3s ease infinite",
                                textShadow: isGlitching
                                    ? "0 0 15px #00d4ff, 0 0 30px #00d4ff, 0 0 45px #00d4ff, 0 0 60px #00d4ff, 0 0 75px #00d4ff"
                                    : "0 0 30px rgba(0, 255, 65, 0.8), 0 0 60px rgba(0, 255, 65, 0.6), 0 0 90px rgba(0, 255, 65, 0.4), 0 0 120px rgba(0, 212, 255, 0.3), 0 0 150px rgba(168, 85, 247, 0.2)",
                                filter: isGlitching ? "blur(0.5px)" : "drop-shadow(0 0 20px rgba(0, 255, 65, 0.6))",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            {isGlitching ? glitchChar : char}
                        </span>
                        {/* Glitch overlay effect with premium RGB shift */}
                        {isGlitching && (
                            <>
                                <span
                                    className="absolute inset-0 text-electric opacity-60"
                                    style={{
                                        textShadow: "2px 0 #ff00ff, -2px 0 #00ffff, 0 2px #00ff41",
                                        clipPath: "inset(0 50% 0 0)",
                                        animation: "glitch-shift 0.1s infinite",
                                        filter: "blur(0.5px)",
                                    }}
                                >
                                    {glitchChar}
                                </span>
                                <span
                                    className="absolute inset-0 text-primary opacity-40"
                                    style={{
                                        textShadow: "-2px 0 #00ffff, 2px 0 #ff00ff, 0 -2px #a855f7",
                                        clipPath: "inset(0 0 0 50%)",
                                        animation: "glitch-shift 0.1s infinite reverse",
                                        filter: "blur(0.5px)",
                                    }}
                                >
                                    {glitchChar}
                                </span>
                            </>
                        )}
                    </motion.span>
                );
            })}
            {/* Cursor */}
            {isTyping && (
                <motion.span
                    className="inline-block w-[3px] h-[1em] bg-primary ml-1 align-middle"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                        boxShadow: "0 0 10px #00ff41, 0 0 20px #00ff41",
                    }}
                />
            )}

            {/* CSS for glitch animation and gradient */}
            <style jsx>{`
        @keyframes glitch-shift {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
        </span>
    );
}
