"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Search,
  Network,
  Brain,
  Link2,
  Zap,
  ArrowRight,
  Play,
  Star,
  Database,
  Sparkles,
  ChevronRight,
} from "lucide-react";

import {
  InfiniteGlitchTypewriter,
  LinePatternBackground,
  MockBrowser,
  FeatureCard,
  StatItem,
} from "@/components/landing";

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: Search,
      title: "OSINT Intelligence",
      description: "Enumerate 200+ platforms instantly. Find usernames, emails, and digital footprints across the entire internet.",
      accentColor: "from-primary/10",
    },
    {
      icon: Network,
      title: "Relationship Graphs",
      description: "Visualize complex connections between entities with interactive node-based graphs powered by React Flow.",
      accentColor: "from-cyan-500/10",
    },
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Query your intelligence database with natural language. Get instant insights powered by GPT-4 and Azure OpenAI.",
      accentColor: "from-purple-500/10",
    },
    {
      icon: Link2,
      title: "Tracking Links",
      description: "Generate stealth tracking URLs to gather IP, geolocation, device, and network intelligence from any target.",
      accentColor: "from-orange-500/10",
    },
    {
      icon: Database,
      title: "Vector Search",
      description: "Semantic search across your entire intelligence database using pgvector embeddings and cosine similarity.",
      accentColor: "from-pink-500/10",
    },
    {
      icon: Shield,
      title: "Threat Scoring",
      description: "Automated threat assessment with customizable scoring algorithms. Prioritize high-risk entities instantly.",
      accentColor: "from-red-500/10",
    },
  ];

  const testimonials = [
    {
      quote: "SEPTO transformed our security research workflow. We found threats 10x faster.",
      author: "Sarah Chen",
      role: "Security Lead, TechCorp",
      avatar: "SC",
    },
    {
      quote: "The OSINT tools are incredible. It's like having a whole team of researchers.",
      author: "Marcus Johnson",
      role: "CISO, FinanceHub",
      avatar: "MJ",
    },
    {
      quote: "The AI analysis feature alone is worth the investment. Game-changing.",
      author: "Elena Rodriguez",
      role: "Threat Analyst, SecureNet",
      avatar: "ER",
    },
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-white overflow-x-hidden">
      {/* Animated background with line patterns */}
      <LinePatternBackground />

      {/* Navigation */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-[#030303]/90 backdrop-blur-xl border-b border-white/5" : ""
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,65,0.3)]">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-wider">SEPTO</span>
              <span className="hidden sm:inline text-xs text-gray-500 ml-2 font-mono">v1.0</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How it Works</a>
            <a href="#testimonials" className="text-sm text-gray-400 hover:text-white transition-colors">Testimonials</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/sign-in"
              className="hidden sm:inline-flex px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/sign-up"
              className="px-5 py-2.5 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Now with AI-Powered Analysis</span>
              <ChevronRight className="w-4 h-4 text-primary" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            >
              The Future of
              <br />
              <span className="drop-shadow-[0_0_30px_rgba(0,255,65,0.5)]">
                <InfiniteGlitchTypewriter text="Threat Intelligence" />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              SEPTO is the all-in-one OSINT platform for security researchers.
              Gather intelligence, visualize relationships, and analyze threats
              with the power of AI.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/auth/sign-up"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold bg-primary text-black rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(0,255,65,0.4)] hover:shadow-[0_0_50px_rgba(0,255,65,0.6)]"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white">
                <Play className="w-5 h-5" />
                Watch Demo
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-6 mt-10"
            >
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <div className="w-px h-4 bg-white/10" />
              <span className="text-sm text-gray-400">Trusted by 1,000+ security researchers</span>
            </motion.div>
          </div>

          {/* Mock Browser */}
          <MockBrowser />
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-16 px-6 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm text-gray-500 mb-8 uppercase tracking-wider">Trusted by security teams at leading companies</p>
          <div className="flex flex-wrap items-center justify-center gap-12">
            {["TechCorp", "SecureNet", "CyberGuard", "InfoSec Pro", "DataShield", "NetWatch"].map((name) => (
              <motion.div
                key={name}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 0.5 }}
                viewport={{ once: true }}
                whileHover={{ opacity: 1 }}
                className="text-xl font-bold text-gray-600 transition-opacity cursor-default"
              >
                {name}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem value="200+" label="Platforms Searched" delay={0} />
            <StatItem value="1M+" label="Entities Tracked" delay={0.1} />
            <StatItem value="99.9%" label="Uptime SLA" delay={0.2} />
            <StatItem value="<100ms" label="Search Latency" delay={0.3} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need for
              <br />
              <span className="text-primary">Threat Intelligence</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              From OSINT collection to AI analysis, SEPTO provides all the tools
              you need in one powerful platform.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} {...feature} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-400">Three steps to supercharge your security research</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Collect Intelligence",
                description: "Use OSINT tools to gather data from social media, domains, emails, and more.",
                icon: Search,
              },
              {
                step: "02",
                title: "Analyze & Connect",
                description: "AI automatically finds patterns and connections between entities in your data.",
                icon: Brain,
              },
              {
                step: "03",
                title: "Take Action",
                description: "Generate reports, set up alerts, and track threats in real-time.",
                icon: Zap,
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/5"
              >
                <div className="text-6xl font-bold text-white/5 absolute top-4 right-4 font-mono">{item.step}</div>
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Loved by Security Teams</h2>
            <p className="text-xl text-gray-400">See what researchers are saying about SEPTO</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/5"
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary border border-primary/30">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-white">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative p-12 rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-cyan-500/10 to-purple-500/20" />
            <div className="absolute inset-0 bg-[#0a0a0a]/80" />
            <div className="absolute inset-0 border border-primary/20 rounded-3xl" />

            {/* Decorative lines */}
            <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="cta-lines" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M0 30 L30 0" stroke="rgba(0, 255, 65, 0.5)" strokeWidth="0.5" fill="none" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cta-lines)" />
            </svg>

            <div className="relative text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Transform Your
                <br />
                Security Research?
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                Join 1,000+ security professionals using SEPTO
              </p>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold bg-primary text-black rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(0,255,65,0.4)]"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-sm text-gray-500 mt-4">No credit card required • 14-day free trial</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <span className="font-bold tracking-wider">SEPTO</span>
              </div>
              <p className="text-sm text-gray-500">
                The all-in-one platform for threat intelligence and OSINT research.
              </p>
            </div>

            {[
              { title: "Product", links: ["Features", "API", "Integrations"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security", "GDPR"] },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold text-white mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5">
            <p className="text-sm text-gray-500">© 2024 SEPTO. All rights reserved.</p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <a href="#" className="text-gray-500 hover:text-white transition-colors">Twitter</a>
              <a href="#" className="text-gray-500 hover:text-white transition-colors">GitHub</a>
              <a href="#" className="text-gray-500 hover:text-white transition-colors">Discord</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
