/**
 * Analysis Tools - Focused on Behavioral Profiling and Digital Footprint
 */

export interface BehaviorProfile {
    activityLevel: "very_high" | "high" | "moderate" | "low" | "minimal";
    digitalFootprint: {
        size: "extensive" | "moderate" | "limited" | "minimal";
        platforms: Array<{
            name: string;
            category: "social" | "professional" | "tech" | "media" | "other";
            activityIndicators: string[];
            lastSeen?: Date;
        }>;
        totalPlatforms: number;
        primaryCategories: string[];
    };
    securityPosture: {
        level: "strong" | "moderate" | "weak" | "poor";
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
    };
    engagementPatterns: {
        platformDiversity: number; // 0-100
        professionalPresence: number; // 0-100
        socialPresence: number; // 0-100
        techPresence: number; // 0-100
        estimatedActiveHours: string;
    };
    behavioralFlags: Array<{
        flag: string;
        severity: "high" | "medium" | "low";
        description: string;
    }>;
    profileSummary: string;
}

export interface TimelineEvent {
    timestamp: Date | string;
    eventType: "profile_discovery" | "breach" | "relationship" | "activity" | "alert";
    title: string;
    description: string;
    platform?: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    metadata?: Record<string, any>;
}

export interface DigitalFootprintAnalysis {
    overview: {
        totalPlatforms: number;
        totalRelationships: number;
        exposureLevel: "critical" | "high" | "moderate" | "low" | "minimal";
        visibilityScore: number; // 0-100
        lastUpdated: Date;
    };
    platformBreakdown: {
        social: { count: number; platforms: string[] };
        professional: { count: number; platforms: string[] };
        technical: { count: number; platforms: string[] };
        other: { count: number; platforms: string[] };
    };
    exposureMetrics: {
        publicProfiles: number;
        privateProfiles: number;
        verifiedAccounts: number;
        dormantAccounts: number;
    };
    riskAreas: Array<{
        area: string;
        risk: "high" | "medium" | "low";
        details: string;
        mitigation: string;
    }>;
    growthTrend: {
        direction: "increasing" | "stable" | "decreasing";
        rate: string;
        analysis: string;
    };
    watchdogAlerts: Array<{
        alertType: "new_profile" | "breach" | "suspicious_activity" | "exposure_increase";
        severity: "critical" | "high" | "medium" | "low";
        message: string;
        timestamp: Date;
        actionable: boolean;
    }>;
}

export interface GeneratedInsight {
    category: "security" | "privacy" | "reputation" | "operational" | "strategic";
    priority: "critical" | "high" | "medium" | "low";
    insight: string;
    evidence: string[];
    recommendation: string;
    impact: string;
}

// Platform categorization
const PLATFORM_CATEGORIES: Record<string, string> = {
    // Social
    Twitter: "social",
    Facebook: "social",
    Instagram: "social",
    TikTok: "social",
    Snapchat: "social",
    Reddit: "social",

    // Professional
    LinkedIn: "professional",

    // Technical
    GitHub: "tech",
    "Stack Overflow": "tech",
    "Dev.to": "tech",
    GitLab: "tech",

    // Media
    YouTube: "media",
    Medium: "media",
    Twitch: "media",
    Pinterest: "media",

    // Communication
    Discord: "other",
    Telegram: "other",
    Slack: "other",
};

/**
 * Create comprehensive behavior profile
 */
export function createBehaviorProfile(data: {
    profiles: any[];
    relationships?: any;
    emailIntel?: any;
    domainIntel?: any;
}): BehaviorProfile {
    const profiles = data.profiles || [];
    const highConfidenceProfiles = profiles.filter((p) => p.confidence === "high");

    // Determine activity level
    let activityLevel: BehaviorProfile["activityLevel"];
    if (profiles.length > 15) activityLevel = "very_high";
    else if (profiles.length > 10) activityLevel = "high";
    else if (profiles.length > 5) activityLevel = "moderate";
    else if (profiles.length > 0) activityLevel = "low";
    else activityLevel = "minimal";

    // Build digital footprint
    const platformsByCategory = profiles.reduce((acc: any, profile: any) => {
        const category = PLATFORM_CATEGORIES[profile.platform] || "other";
        if (!acc[category]) acc[category] = [];
        acc[category].push({
            name: profile.platform,
            category,
            activityIndicators: [
                profile.confidence === "high" ? "Verified presence" : "Potential presence",
                profile.url ? "Profile accessible" : "Profile inactive",
            ],
            lastSeen: profile.checkedAt,
        });
        return acc;
    }, {});

    const primaryCategories = Object.entries(platformsByCategory)
        .sort(([, a]: any, [, b]: any) => b.length - a.length)
        .slice(0, 3)
        .map(([cat]) => cat);

    const size: BehaviorProfile["digitalFootprint"]["size"] =
        profiles.length > 15
            ? "extensive"
            : profiles.length > 10
                ? "moderate"
                : profiles.length > 3
                    ? "limited"
                    : "minimal";

    const digitalFootprint = {
        size,
        platforms: Object.values(platformsByCategory).flat() as any[],
        totalPlatforms: profiles.length,
        primaryCategories,
    };

    // Security posture analysis
    const securityStrengths: string[] = [];
    const securityWeaknesses: string[] = [];
    const securityRecommendations: string[] = [];

    if (data.emailIntel?.valid && data.emailIntel?.hunterScore > 80) {
        securityStrengths.push("Valid email with high deliverability score");
    } else if (data.emailIntel && !data.emailIntel.valid) {
        securityWeaknesses.push("Invalid or unverified email address");
        securityRecommendations.push("Verify and secure primary email account");
    }

    if (data.emailIntel?.breaches === 0) {
        securityStrengths.push("No known data breaches detected");
    } else if (data.emailIntel?.breaches > 0) {
        securityWeaknesses.push(
            `Email found in ${data.emailIntel.breaches} data breach(es)`
        );
        securityRecommendations.push(
            "Change passwords on affected services immediately"
        );
    }

    if (data.domainIntel?.ssl) {
        securityStrengths.push("Valid SSL certificate detected");
    } else if (data.domainIntel && !data.domainIntel.ssl) {
        securityWeaknesses.push("Missing or invalid SSL certificate");
        securityRecommendations.push("Implement valid SSL/TLS encryption");
    }

    if (highConfidenceProfiles.length / Math.max(profiles.length, 1) > 0.7) {
        securityStrengths.push("Consistent verified online presence");
    }

    if (profiles.length > 20) {
        securityWeaknesses.push(
            "Extensive digital footprint increases attack surface"
        );
        securityRecommendations.push("Consolidate and secure online accounts");
    }

    const securityLevel: "strong" | "moderate" | "weak" | "poor" =
        securityWeaknesses.length === 0 && securityStrengths.length >= 2
            ? "strong"
            : securityWeaknesses.length > 2 || data.emailIntel?.breaches > 0
                ? "poor"
                : securityWeaknesses.length > 0
                    ? "weak"
                    : "moderate";

    const securityPosture = {
        level: securityLevel,
        strengths: securityStrengths,
        weaknesses: securityWeaknesses,
        recommendations: securityRecommendations,
    };

    // Engagement patterns
    const socialPlatforms = profiles.filter(
        (p) => PLATFORM_CATEGORIES[p.platform] === "social"
    );
    const professionalPlatforms = profiles.filter(
        (p) => PLATFORM_CATEGORIES[p.platform] === "professional"
    );
    const techPlatforms = profiles.filter(
        (p) => PLATFORM_CATEGORIES[p.platform] === "tech"
    );

    const engagementPatterns = {
        platformDiversity: Math.min(
            100,
            (Object.keys(platformsByCategory).length / 4) * 100
        ),
        professionalPresence: Math.min(100, professionalPlatforms.length * 50),
        socialPresence: Math.min(100, socialPlatforms.length * 10),
        techPresence: Math.min(100, techPlatforms.length * 20),
        estimatedActiveHours:
            activityLevel === "very_high"
                ? "4-6 hours/day"
                : activityLevel === "high"
                    ? "2-4 hours/day"
                    : activityLevel === "moderate"
                        ? "1-2 hours/day"
                        : "< 1 hour/day",
    };

    // Behavioral flags
    const behavioralFlags: BehaviorProfile["behavioralFlags"] = [];

    if (data.emailIntel?.breaches > 2) {
        behavioralFlags.push({
            flag: "Multiple Breaches",
            severity: "high",
            description:
                "Email compromised multiple times - poor credential hygiene",
        });
    }

    if (profiles.length > 20 && highConfidenceProfiles.length < 5) {
        behavioralFlags.push({
            flag: "Inconsistent Presence",
            severity: "medium",
            description:
                "Many profiles but few verified - possible identity confusion",
        });
    }

    if (socialPlatforms.length > 10 && professionalPlatforms.length === 0) {
        behavioralFlags.push({
            flag: "No Professional Presence",
            severity: "low",
            description: "High social activity but no professional platforms",
        });
    }

    if (
        data.relationships?.networkAnalysis?.totalConnections === 0 &&
        profiles.length > 5
    ) {
        behavioralFlags.push({
            flag: "Network Isolation",
            severity: "medium",
            description: "Active online but no detected relationships",
        });
    }

    // Profile summary
    const profileSummary = `${activityLevel.replace("_", " ").toUpperCase()} activity level with ${digitalFootprint.size} digital footprint across ${profiles.length} platforms. Security posture is ${securityLevel.toUpperCase()}. Primary presence on ${primaryCategories.join(", ")} platforms.`;

    return {
        activityLevel,
        digitalFootprint,
        securityPosture,
        engagementPatterns,
        behavioralFlags,
        profileSummary,
    };
}

/**
 * Build detailed timeline of events
 */
export function buildTimeline(data: {
    profiles: any[];
    relationships?: any;
    emailIntel?: any;
    domainIntel?: any;
}): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const now = new Date();

    // Profile discoveries
    data.profiles.forEach((profile) => {
        events.push({
            timestamp: profile.checkedAt || now,
            eventType: "profile_discovery",
            title: `${profile.platform} Profile Detected`,
            description: `${profile.confidence.toUpperCase()} confidence profile discovery`,
            platform: profile.platform,
            severity: profile.confidence === "high" ? "medium" : "low",
            metadata: {
                url: profile.url,
                confidence: profile.confidence,
            },
        });
    });

    // Email breaches
    if (data.emailIntel?.breachDetails) {
        data.emailIntel.breachDetails.forEach((breach: any) => {
            events.push({
                timestamp: breach.date,
                eventType: "breach",
                title: `Data Breach: ${breach.name}`,
                description: `Email compromised. Data exposed: ${breach.dataClasses.join(", ")}`,
                severity: "critical",
                metadata: {
                    breachName: breach.name,
                    dataClasses: breach.dataClasses,
                },
            });
        });
    }

    // Relationship discoveries
    if (data.relationships?.relationships) {
        data.relationships.relationships.slice(0, 10).forEach((rel: any) => {
            events.push({
                timestamp: now,
                eventType: "relationship",
                title: `${rel.relationshipType} Relationship Mapped`,
                description: `Connection with ${rel.targetEntity.name} (${rel.strength}% confidence)`,
                severity: rel.strength > 70 ? "medium" : "low",
                metadata: {
                    targetEntity: rel.targetEntity.name,
                    relationshipType: rel.relationshipType,
                    strength: rel.strength,
                },
            });
        });
    }

    // Domain activities
    if (data.domainIntel) {
        if (data.domainIntel.shodanVulns > 0) {
            events.push({
                timestamp: now,
                eventType: "alert",
                title: "Domain Vulnerabilities Detected",
                description: `${data.domainIntel.shodanVulns} known vulnerabilities found`,
                severity: "high",
                metadata: {
                    vulnerabilities: data.domainIntel.shodanVulns,
                },
            });
        }

        if (!data.domainIntel.ssl) {
            events.push({
                timestamp: now,
                eventType: "alert",
                title: "SSL Certificate Issue",
                description: "Invalid or missing SSL certificate",
                severity: "medium",
            });
        }
    }

    // Sort by timestamp (most recent first)
    return events.sort((a, b) => {
        const dateA =
            typeof a.timestamp === "string" ? new Date(a.timestamp) : a.timestamp;
        const dateB =
            typeof b.timestamp === "string" ? new Date(b.timestamp) : b.timestamp;
        return dateB.getTime() - dateA.getTime();
    });
}

/**
 * Analyze digital footprint (watchdog function)
 */
export function analyzeDigitalFootprint(data: {
    profiles: any[];
    relationships?: any;
    emailIntel?: any;
    domainIntel?: any;
}): DigitalFootprintAnalysis {
    const profiles = data.profiles || [];
    const relationships = data.relationships?.relationships || [];

    // Calculate visibility score
    const highConfProfiles = profiles.filter(
        (p) => p.confidence === "high"
    ).length;
    const visibilityScore = Math.min(
        100,
        profiles.length * 3 + highConfProfiles * 5 + relationships.length * 2
    );

    // Determine exposure level
    let exposureLevel: "critical" | "high" | "moderate" | "low" | "minimal";
    if (visibilityScore > 80 || data.emailIntel?.breaches > 2) {
        exposureLevel = "critical";
    } else if (visibilityScore > 60 || profiles.length > 15) {
        exposureLevel = "high";
    } else if (visibilityScore > 40 || profiles.length > 8) {
        exposureLevel = "moderate";
    } else if (profiles.length > 3) {
        exposureLevel = "low";
    } else {
        exposureLevel = "minimal";
    }

    // Platform breakdown
    const platformBreakdown = {
        social: {
            count: profiles.filter(
                (p) => PLATFORM_CATEGORIES[p.platform] === "social"
            ).length,
            platforms: profiles
                .filter((p) => PLATFORM_CATEGORIES[p.platform] === "social")
                .map((p) => p.platform),
        },
        professional: {
            count: profiles.filter(
                (p) => PLATFORM_CATEGORIES[p.platform] === "professional"
            ).length,
            platforms: profiles
                .filter((p) => PLATFORM_CATEGORIES[p.platform] === "professional")
                .map((p) => p.platform),
        },
        technical: {
            count: profiles.filter(
                (p) => PLATFORM_CATEGORIES[p.platform] === "tech"
            ).length,
            platforms: profiles
                .filter((p) => PLATFORM_CATEGORIES[p.platform] === "tech")
                .map((p) => p.platform),
        },
        other: {
            count: profiles.filter(
                (p) =>
                    !["social", "professional", "tech"].includes(
                        PLATFORM_CATEGORIES[p.platform] || ""
                    )
            ).length,
            platforms: profiles
                .filter(
                    (p) =>
                        !["social", "professional", "tech"].includes(
                            PLATFORM_CATEGORIES[p.platform] || ""
                        )
                )
                .map((p) => p.platform),
        },
    };

    // Exposure metrics
    const exposureMetrics = {
        publicProfiles: profiles.filter((p) => p.found).length,
        privateProfiles: 0, // Would need scraping to detect
        verifiedAccounts: highConfProfiles,
        dormantAccounts: profiles.length - highConfProfiles,
    };

    // Risk areas
    const riskAreas: DigitalFootprintAnalysis["riskAreas"] = [];

    if (data.emailIntel?.breaches > 0) {
        riskAreas.push({
            area: "Credential Compromise",
            risk: "high",
            details: `Email found in ${data.emailIntel.breaches} data breach(es)`,
            mitigation: "Reset all passwords and enable 2FA",
        });
    }

    if (profiles.length > 15) {
        riskAreas.push({
            area: "Excessive Exposure",
            risk: "medium",
            details: `Active on ${profiles.length} platforms`,
            mitigation: "Consolidate accounts and delete unused profiles",
        });
    }

    if (platformBreakdown.social.count > 10) {
        riskAreas.push({
            area: "Social Media Overexposure",
            risk: "medium",
            details: `High social media presence (${platformBreakdown.social.count} platforms)`,
            mitigation: "Review privacy settings on all social platforms",
        });
    }

    if (data.domainIntel?.shodanVulns > 0) {
        riskAreas.push({
            area: "Infrastructure Vulnerabilities",
            risk: "high",
            details: `${data.domainIntel.shodanVulns} vulnerabilities detected`,
            mitigation: "Apply security patches immediately",
        });
    }

    // Growth trend (simplified - would need historical data)
    const growthTrend = {
        direction: "stable" as const,
        rate: "No recent changes detected",
        analysis: "Baseline established. Future scans will detect changes.",
    };

    // Watchdog alerts
    const watchdogAlerts: DigitalFootprintAnalysis["watchdogAlerts"] = [];

    if (data.emailIntel?.breaches > 0) {
        watchdogAlerts.push({
            alertType: "breach",
            severity: "critical",
            message: `Email compromised in ${data.emailIntel.breaches} breach(es) - immediate action required`,
            timestamp: new Date(),
            actionable: true,
        });
    }

    if (exposureLevel === "critical" || exposureLevel === "high") {
        watchdogAlerts.push({
            alertType: "exposure_increase",
            severity: exposureLevel === "critical" ? "critical" : "high",
            message: `${exposureLevel.toUpperCase()} exposure level detected across ${profiles.length} platforms`,
            timestamp: new Date(),
            actionable: true,
        });
    }

    if (profiles.length > 20) {
        watchdogAlerts.push({
            alertType: "suspicious_activity",
            severity: "medium",
            message:
                "Unusually large digital footprint may indicate account proliferation",
            timestamp: new Date(),
            actionable: true,
        });
    }

    return {
        overview: {
            totalPlatforms: profiles.length,
            totalRelationships: relationships.length,
            exposureLevel,
            visibilityScore,
            lastUpdated: new Date(),
        },
        platformBreakdown,
        exposureMetrics,
        riskAreas,
        growthTrend,
        watchdogAlerts,
    };
}

/**
 * Generate actionable insights
 */
export function generateActionableInsights(data: {
    behaviorProfile: BehaviorProfile;
    timeline: TimelineEvent[];
    digitalFootprint: DigitalFootprintAnalysis;
    findings: any;
    contentAnalysis?: ContentAnalysis;
}): GeneratedInsight[] {
    const insights: GeneratedInsight[] = [];

    // Security insights
    if (data.behaviorProfile.securityPosture.level === "poor") {
        insights.push({
            category: "security",
            priority: "critical",
            insight:
                "Critical security weaknesses detected requiring immediate attention",
            evidence: data.behaviorProfile.securityPosture.weaknesses,
            recommendation:
                data.behaviorProfile.securityPosture.recommendations.join("; "),
            impact: "High risk of account compromise and data exposure",
        });
    }

    // Privacy insights
    if (
        data.digitalFootprint.overview.exposureLevel === "critical" ||
        data.digitalFootprint.overview.exposureLevel === "high"
    ) {
        insights.push({
            category: "privacy",
            priority: "high",
            insight: `${data.digitalFootprint.overview.exposureLevel.toUpperCase()} exposure level across ${data.digitalFootprint.overview.totalPlatforms} platforms`,
            evidence: [
                `Visibility score: ${data.digitalFootprint.overview.visibilityScore}/100`,
                `Public profiles: ${data.digitalFootprint.exposureMetrics.publicProfiles}`,
            ],
            recommendation:
                "Reduce digital footprint by consolidating accounts and increasing privacy controls",
            impact:
                "Increased vulnerability to social engineering and targeted attacks",
        });
    }

    // Behavioral insights
    if (data.behaviorProfile.behavioralFlags.length > 0) {
        const highSeverityFlags = data.behaviorProfile.behavioralFlags.filter(
            (f) => f.severity === "high"
        );
        if (highSeverityFlags.length > 0) {
            insights.push({
                category: "operational",
                priority: "high",
                insight: "Concerning behavioral patterns detected",
                evidence: highSeverityFlags.map((f) => f.description),
                recommendation: "Review and address flagged behaviors",
                impact: "Pattern anomalies may indicate security or operational risks",
            });
        }
    }

    // Reputation insights
    const socialPresence =
        data.behaviorProfile.engagementPatterns.socialPresence;
    const professionalPresence =
        data.behaviorProfile.engagementPatterns.professionalPresence;

    if (socialPresence > 70 && professionalPresence < 30) {
        insights.push({
            category: "reputation",
            priority: "medium",
            insight:
                "Imbalanced online presence favoring social over professional platforms",
            evidence: [
                `Social presence: ${socialPresence}%`,
                `Professional presence: ${professionalPresence}%`,
            ],
            recommendation:
                "Establish professional presence on LinkedIn and industry platforms",
            impact:
                "May affect professional reputation and career opportunities",
        });
    }

    // Strategic insights
    if (data.behaviorProfile.digitalFootprint.totalPlatforms > 15) {
        insights.push({
            category: "strategic",
            priority: "medium",
            insight: "Extensive platform usage increases management complexity",
            evidence: [
                `Active on ${data.behaviorProfile.digitalFootprint.totalPlatforms} platforms`,
                `Primary categories: ${data.behaviorProfile.digitalFootprint.primaryCategories.join(", ")}`,
            ],
            recommendation:
                "Implement centralized digital identity management strategy",
            impact:
                "Reduced efficiency in managing online presence and security",
        });
    }

    // Timeline-based insights
    const criticalEvents = data.timeline.filter(
        (e) => e.severity === "critical"
    );
    if (criticalEvents.length > 0) {
        insights.push({
            category: "security",
            priority: "critical",
            insight: `${criticalEvents.length} critical security event(s) detected in timeline`,
            evidence: criticalEvents.map((e) => e.title),
            recommendation:
                "Investigate and remediate critical events immediately",
            impact: "Active security threats requiring immediate response",
        });
    }

    // Content-based insights (from scraped posts)
    if (data.contentAnalysis) {
        const ca = data.contentAnalysis;

        // Red flags from content
        for (const rf of ca.redFlags) {
            insights.push({
                category: "security",
                priority: rf.severity === "high" ? "high" : "medium",
                insight: rf.flag,
                evidence: [rf.evidence],
                recommendation: "Review flagged content for security implications",
                impact: "Content may indicate security awareness gaps or risky behavior",
            });
        }

        // Negative sentiment
        if (ca.sentiment === "negative") {
            insights.push({
                category: "reputation",
                priority: "medium",
                insight: "Overall negative sentiment detected in public content",
                evidence: [`Sentiment analysis across ${ca.activityPatterns.totalPostsAnalyzed} posts`],
                recommendation: "Monitor public communications for reputational risk",
                impact: "Negative public sentiment may affect professional reputation",
            });
        }

        // Topic-based interests
        if (ca.topTopics.length > 0) {
            const crossPlatformTopics = ca.topTopics.filter((t) => t.platforms.length >= 2);
            if (crossPlatformTopics.length > 0) {
                insights.push({
                    category: "strategic",
                    priority: "low",
                    insight: `Key interests identified across platforms: ${crossPlatformTopics.map((t) => t.topic).join(", ")}`,
                    evidence: crossPlatformTopics.map((t) => `"${t.topic}" found on ${t.platforms.join(", ")}`),
                    recommendation: "Use identified interests for social engineering awareness training",
                    impact: "Cross-platform interests can be leveraged in targeted attacks",
                });
            }
        }

        // Technical profile
        if (ca.languagesUsed.length > 0) {
            insights.push({
                category: "operational",
                priority: "low",
                insight: `Technical profile: ${ca.languagesUsed.join(", ")}`,
                evidence: [`Programming languages detected from GitHub activity`],
                recommendation: "Note technical capabilities for threat modeling",
                impact: "Technical skills indicate potential attack surface knowledge",
            });
        }
    }

    return insights.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
}

// ── Content Analysis ────────────────────────────────────────────────────

import type { ScrapedContent } from "./content-scraper";

export interface ContentAnalysis {
    topTopics: Array<{ topic: string; frequency: number; platforms: string[] }>;
    sentiment: "positive" | "neutral" | "negative" | "mixed";
    interests: string[];
    activityPatterns: {
        mostActivePlatform: string;
        totalPostsAnalyzed: number;
        contentTypes: string[];
    };
    languagesUsed: string[];
    redFlags: Array<{ flag: string; evidence: string; severity: "high" | "medium" | "low" }>;
}

// Simple sentiment word lists — no ML needed
const POSITIVE_WORDS = new Set([
    "great", "love", "amazing", "awesome", "excellent", "good", "happy", "excited",
    "fantastic", "wonderful", "best", "beautiful", "helpful", "brilliant", "enjoy",
    "thanks", "thank", "pleased", "success", "successful", "proud", "achievement",
]);
const NEGATIVE_WORDS = new Set([
    "bad", "hate", "terrible", "awful", "worst", "horrible", "angry", "sad",
    "disappointed", "fail", "failed", "broken", "bug", "issue", "problem",
    "frustrated", "annoyed", "stupid", "scam", "fraud", "vulnerability",
]);
const RED_FLAG_PATTERNS: Array<{ pattern: RegExp; flag: string; severity: "high" | "medium" | "low" }> = [
    { pattern: /\b(password|passwd|cred(ential)?s?)\b/i, flag: "Credential exposure risk", severity: "high" },
    { pattern: /\b(hack(ed|ing)?|exploit|pwn)\b/i, flag: "Security-related content", severity: "medium" },
    { pattern: /\b(leaked?|dump|breach)\b/i, flag: "References to data leaks", severity: "medium" },
    { pattern: /\b(dark\s?web|tor\s|onion)\b/i, flag: "Dark web references", severity: "high" },
    { pattern: /\b(crypto|bitcoin|ethereum|wallet)\b/i, flag: "Cryptocurrency activity", severity: "low" },
    { pattern: /\b(vpn|proxy|anonym)/i, flag: "Anonymization tool references", severity: "low" },
];

/**
 * Analyze scraped content for topics, sentiment, interests, and red flags.
 * Pure heuristics — no LLM calls.
 */
export function analyzeContent(contents: ScrapedContent[]): ContentAnalysis {
    const topicCounts = new Map<string, { count: number; platforms: Set<string> }>();
    let positiveScore = 0;
    let negativeScore = 0;
    let totalWords = 0;
    let totalPosts = 0;
    const platformPostCounts = new Map<string, number>();
    const contentTypeSet = new Set<string>();
    const languageSet = new Set<string>();
    const redFlags: ContentAnalysis["redFlags"] = [];
    const redFlagsSeen = new Set<string>();

    for (const content of contents) {
        const postCount = content.posts.length;
        totalPosts += postCount;
        platformPostCounts.set(content.platform, (platformPostCounts.get(content.platform) || 0) + postCount);

        // Categorize content type by platform
        if (content.platform === "GitHub") contentTypeSet.add("technical");
        else if (content.platform === "LinkedIn") contentTypeSet.add("professional");
        else if (content.platform === "Reddit") contentTypeSet.add("community");
        else if (content.platform === "Medium" || content.platform === "Dev.to") contentTypeSet.add("articles");
        else if (["X", "Instagram", "TikTok", "Facebook"].includes(content.platform)) contentTypeSet.add("social");
        else contentTypeSet.add("other");

        // Collect topics from platform-reported topics
        for (const topic of content.topics) {
            const normalized = topic.toLowerCase().trim();
            if (normalized.length < 2) continue;
            const entry = topicCounts.get(normalized) || { count: 0, platforms: new Set() };
            entry.count++;
            entry.platforms.add(content.platform);
            topicCounts.set(normalized, entry);
        }

        // Programming languages (from GitHub topics)
        if (content.platform === "GitHub") {
            for (const topic of content.topics) {
                // Common programming language names
                const lang = topic.toLowerCase();
                if (PROGRAMMING_LANGUAGES.has(lang)) {
                    languageSet.add(topic);
                }
            }
        }

        // Analyze each post
        for (const post of content.posts) {
            const text = `${post.title || ""} ${post.body}`.toLowerCase();
            const words = text.split(/\s+/).filter((w) => w.length > 2);
            totalWords += words.length;

            // Sentiment
            for (const word of words) {
                const clean = word.replace(/[^a-z]/g, "");
                if (POSITIVE_WORDS.has(clean)) positiveScore++;
                if (NEGATIVE_WORDS.has(clean)) negativeScore++;
            }

            // Red flags
            for (const { pattern, flag, severity } of RED_FLAG_PATTERNS) {
                if (pattern.test(text) && !redFlagsSeen.has(flag)) {
                    redFlagsSeen.add(flag);
                    const match = text.match(pattern);
                    redFlags.push({
                        flag,
                        evidence: `Found "${match?.[0]}" in ${content.platform} content`,
                        severity,
                    });
                }
            }

            // Extract topics from post titles (simple keyword extraction)
            if (post.title) {
                const titleWords = post.title.toLowerCase()
                    .replace(/[^a-z0-9\s]/g, "")
                    .split(/\s+/)
                    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
                for (const word of titleWords) {
                    const entry = topicCounts.get(word) || { count: 0, platforms: new Set() };
                    entry.count++;
                    entry.platforms.add(content.platform);
                    topicCounts.set(word, entry);
                }
            }
        }
    }

    // Build top topics (sorted by frequency, min 2 occurrences)
    const topTopics = Array.from(topicCounts.entries())
        .filter(([, v]) => v.count >= 2)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 15)
        .map(([topic, v]) => ({
            topic,
            frequency: v.count,
            platforms: Array.from(v.platforms),
        }));

    // Determine overall sentiment
    let sentiment: ContentAnalysis["sentiment"];
    const sentimentRatio = totalWords > 0 ? (positiveScore - negativeScore) / Math.max(totalWords, 1) : 0;
    if (positiveScore > 0 && negativeScore > 0 && Math.abs(sentimentRatio) < 0.01) {
        sentiment = "mixed";
    } else if (sentimentRatio > 0.005) {
        sentiment = "positive";
    } else if (sentimentRatio < -0.005) {
        sentiment = "negative";
    } else {
        sentiment = "neutral";
    }

    // Most active platform
    let mostActivePlatform = "Unknown";
    let maxPosts = 0;
    for (const [platform, count] of platformPostCounts) {
        if (count > maxPosts) {
            maxPosts = count;
            mostActivePlatform = platform;
        }
    }

    // Interests: top topics that appear on multiple platforms
    const interests = topTopics
        .filter((t) => t.platforms.length >= 1)
        .slice(0, 10)
        .map((t) => t.topic);

    return {
        topTopics,
        sentiment,
        interests,
        activityPatterns: {
            mostActivePlatform,
            totalPostsAnalyzed: totalPosts,
            contentTypes: Array.from(contentTypeSet),
        },
        languagesUsed: Array.from(languageSet),
        redFlags,
    };
}

const PROGRAMMING_LANGUAGES = new Set([
    "javascript", "typescript", "python", "java", "c", "c++", "c#", "go",
    "rust", "ruby", "php", "swift", "kotlin", "dart", "scala", "r",
    "html", "css", "sql", "shell", "bash", "powershell", "lua", "perl",
    "haskell", "elixir", "clojure", "objective-c", "assembly", "zig",
]);

const STOP_WORDS = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "has",
    "her", "was", "one", "our", "out", "that", "this", "with", "from",
    "they", "been", "have", "will", "what", "when", "make", "like",
    "just", "over", "such", "take", "than", "them", "very", "some",
    "into", "most", "other", "about", "more", "also", "made", "after",
    "many", "these", "then", "would", "each", "which", "their", "said",
    "comment", "post", "commit", "issue", "repo", "updated", "added",
]);
