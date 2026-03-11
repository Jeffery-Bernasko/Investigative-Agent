"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Sparkles,
  User,
  ArrowRight,
  Loader2,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestionQueries = [
  "Show all high-risk entities",
  "Find connections to TechCorp",
  "Summarize recent threats",
  "List phishing reports",
];

export function AIChatMini() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your AI intelligence analyst. Ask me about entities, threats, or request analysis on any topic in your database.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I found relevant information about "${input}". Based on my analysis of the database, there are 3 entities matching your query with varying threat levels. Would you like me to provide more details?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestion = (query: string) => {
    setInput(query);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="glass-panel rounded-2xl overflow-hidden flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">AI Analyst</h3>
            <p className="text-xs text-text-muted">Powered by GPT-4</p>
          </div>
        </div>
        <Link
          href="/analysis"
          className="flex items-center gap-1 text-xs text-matrix hover:underline font-medium"
        >
          <Maximize2 className="w-3 h-3" />
          Expand
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar min-h-[200px]">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "flex gap-3",
                message.role === "user" && "flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                  message.role === "assistant"
                    ? "bg-purple-500/20"
                    : "bg-matrix/20"
                )}
              >
                {message.role === "assistant" ? (
                  <Bot className="w-4 h-4 text-purple-400" />
                ) : (
                  <User className="w-4 h-4 text-matrix" />
                )}
              </div>
              <div
                className={cn(
                  "flex-1 p-3 rounded-lg text-sm",
                  message.role === "assistant"
                    ? "bg-glass-bg text-text-secondary"
                    : "bg-matrix/10 text-white"
                )}
              >
                {message.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
            </div>
            <div className="flex-1 p-3 rounded-lg bg-glass-bg">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                <span
                  className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <p className="text-2xs text-text-muted mb-2">Suggested queries:</p>
          <div className="flex flex-wrap gap-2">
            {suggestionQueries.map((query) => (
              <button
                key={query}
                onClick={() => handleSuggestion(query)}
                className="px-2 py-1 text-2xs bg-glass-bg border border-glass-border rounded-md text-text-secondary hover:text-white hover:border-matrix/30 transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-glass-border">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about entities, threats, or patterns..."
            className="flex-1 px-4 py-2 rounded-lg bg-void border border-glass-border text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-matrix/50 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              "p-2 rounded-lg transition-all",
              input.trim()
                ? "bg-matrix text-black hover:bg-matrix-dim"
                : "bg-graphite text-text-muted cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

