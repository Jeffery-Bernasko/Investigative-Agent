/**
 * Analysis Agent - Focused on Behavioral Profiling and Digital Footprint Monitoring
 */

import { BaseAgent } from "./base-agents";
import { Task, AgentResult } from "./types";
import {
    createBehaviorProfile,
    buildTimeline,
    analyzeDigitalFootprint,
    generateActionableInsights,
    BehaviorProfile,
    TimelineEvent,
    DigitalFootprintAnalysis,
    GeneratedInsight,
} from "./tools/analysis-tools";
import { extractRecentActivities, RecentActivityResult } from "./tools/recent-activity-extractor";

export interface AnalysisResult {
    behaviorProfile: BehaviorProfile;
    timeline: TimelineEvent[];
    digitalFootprint: DigitalFootprintAnalysis;
    insights: GeneratedInsight[];
    recentActivity?: RecentActivityResult;
    summary: string;
    confidence: number;
    analysisDate: Date;
}

export class AnalysisAgent extends BaseAgent {
    async execute(task: Task): Promise<AgentResult> {
        console.log(`\n🧠 ============================================`);
        console.log(`🧠 ANALYSIS AGENT: Deep Analysis & Monitoring`);
        console.log(`🧠 Target: ${task.target}`);
        console.log(`🧠 Focus: Behavioral Profiling + Digital Footprint`);
        console.log(`🧠 ============================================\n`);

        try {
            const investigationData = task.metadata?.investigationData;

            if (!investigationData) {
                throw new Error("No investigation data provided for analysis");
            }

            const startTime = Date.now();

            // 1. Build Behavioral Profile
            console.log(`👤 Step 1: Creating behavioral profile...`);
            const behaviorProfile = createBehaviorProfile({
                profiles: investigationData.findings?.profiles || [],
                relationships: investigationData.relationships,
                emailIntel: investigationData.findings?.metadata?.emailIntel,
                domainIntel: investigationData.findings?.metadata?.domainIntel,
            });
            console.log(`  ✅ Activity Level: ${behaviorProfile.activityLevel}`);
            console.log(
                `  ✅ Digital Footprint: ${behaviorProfile.digitalFootprint.size}`
            );
            console.log(
                `  ✅ Security Posture: ${behaviorProfile.securityPosture.level}`
            );
            console.log(
                `  ✅ Behavioral Flags: ${behaviorProfile.behavioralFlags.length}`
            );

            // 2. Build Timeline
            console.log(`\n📅 Step 2: Building activity timeline...`);
            const timeline = buildTimeline({
                profiles: investigationData.findings?.profiles || [],
                relationships: investigationData.relationships,
                emailIntel: investigationData.findings?.metadata?.emailIntel,
                domainIntel: investigationData.findings?.metadata?.domainIntel,
            });
            console.log(`  ✅ Timeline Events: ${timeline.length}`);
            console.log(
                `  ✅ Critical Events: ${timeline.filter((e) => e.severity === "critical").length}`
            );
            console.log(
                `  ✅ High Priority: ${timeline.filter((e) => e.severity === "high").length}`
            );

            // 3. Analyze Digital Footprint (Watchdog)
            console.log(
                `\n🔍 Step 3: Analyzing digital footprint (Watchdog Mode)...`
            );
            const digitalFootprint = analyzeDigitalFootprint({
                profiles: investigationData.findings?.profiles || [],
                relationships: investigationData.relationships,
                emailIntel: investigationData.findings?.metadata?.emailIntel,
                domainIntel: investigationData.findings?.metadata?.domainIntel,
            });
            console.log(
                `  ✅ Exposure Level: ${digitalFootprint.overview.exposureLevel}`
            );
            console.log(
                `  ✅ Visibility Score: ${digitalFootprint.overview.visibilityScore}/100`
            );
            console.log(
                `  ✅ Watchdog Alerts: ${digitalFootprint.watchdogAlerts.length}`
            );
            console.log(`  ✅ Risk Areas: ${digitalFootprint.riskAreas.length}`);

            // 4. Generate Actionable Insights
            console.log(`\n💡 Step 4: Generating actionable insights...`);
            const insights = generateActionableInsights({
                behaviorProfile,
                timeline,
                digitalFootprint,
                findings: investigationData.findings,
            });
            console.log(`  ✅ Total Insights: ${insights.length}`);
            console.log(
                `  ✅ Critical: ${insights.filter((i) => i.priority === "critical").length}`
            );
            console.log(
                `  ✅ High Priority: ${insights.filter((i) => i.priority === "high").length}`
            );

            // 5. Extract Recent Activity (multi-platform last 3 posts)
            console.log(`\n📅 Step 5: Extracting recent activity...`);
            let recentActivity: RecentActivityResult | undefined;
            try {
                const profiles = investigationData.findings?.profiles ?? [];
                recentActivity = await extractRecentActivities(task.target, profiles);
                console.log(
                    `  ✅ Recent posts: ${recentActivity.posts.length}, ` +
                    `dormant platforms: ${recentActivity.dormant.length}`
                );
            } catch (err: any) {
                console.warn(`  ⚠️ Recent activity extraction failed (non-fatal): ${err.message}`);
            }

            // 6. Generate Summary
            const summary = this.generateSummary(
                behaviorProfile,
                digitalFootprint,
                timeline,
                insights
            );

            // 7. Calculate Confidence
            const confidence = this.calculateConfidence(
                behaviorProfile,
                digitalFootprint,
                timeline,
                insights
            );

            const duration = Math.round((Date.now() - startTime) / 1000);

            console.log(`\n✅ ANALYSIS AGENT: Analysis Complete`);
            console.log(`   Duration: ${duration}s`);
            console.log(`   Confidence: ${confidence}%\n`);

            return {
                agentName: this.name,
                success: true,
                data: {
                    behaviorProfile,
                    timeline,
                    digitalFootprint,
                    insights,
                    recentActivity,
                    summary,
                    confidence,
                    analysisDate: new Date(),
                },
                confidence,
            };
        } catch (error: any) {
            console.error(`\n❌ ANALYSIS AGENT: Analysis Failed`, error.message);
            return {
                agentName: this.name,
                success: false,
                error: error.message,
            };
        }
    }

    private generateSummary(
        behaviorProfile: BehaviorProfile,
        digitalFootprint: DigitalFootprintAnalysis,
        timeline: TimelineEvent[],
        insights: GeneratedInsight[]
    ): string {
        const parts: string[] = [];

        // Overview
        parts.push(
            `Subject demonstrates ${behaviorProfile.activityLevel.replace("_", " ")} activity level`
        );
        parts.push(
            `with ${behaviorProfile.digitalFootprint.size} digital footprint across ${behaviorProfile.digitalFootprint.totalPlatforms} platforms.`
        );

        // Exposure
        parts.push(
            `Overall exposure level: ${digitalFootprint.overview.exposureLevel.toUpperCase()}`
        );
        parts.push(
            `(Visibility Score: ${digitalFootprint.overview.visibilityScore}/100).`
        );

        // Security posture
        parts.push(
            `Security posture assessed as ${behaviorProfile.securityPosture.level.toUpperCase()}`
        );
        if (behaviorProfile.securityPosture.weaknesses.length > 0) {
            parts.push(
                `with ${behaviorProfile.securityPosture.weaknesses.length} identified weakness(es).`
            );
        } else {
            parts.push(`with no critical weaknesses.`);
        }

        // Critical findings
        const criticalInsights = insights.filter(
            (i) => i.priority === "critical"
        );
        if (criticalInsights.length > 0) {
            parts.push(
                `⚠️ ${criticalInsights.length} CRITICAL finding(s) require immediate attention.`
            );
        }

        // Watchdog alerts
        if (digitalFootprint.watchdogAlerts.length > 0) {
            const actionableAlerts = digitalFootprint.watchdogAlerts.filter(
                (a) => a.actionable
            );
            parts.push(
                `Watchdog detected ${digitalFootprint.watchdogAlerts.length} alert(s), ${actionableAlerts.length} actionable.`
            );
        }

        // Timeline highlights
        const criticalEvents = timeline.filter(
            (e) => e.severity === "critical"
        );
        if (criticalEvents.length > 0) {
            parts.push(
                `Timeline shows ${criticalEvents.length} critical event(s).`
            );
        }

        return parts.join(" ");
    }

    private calculateConfidence(
        behaviorProfile: BehaviorProfile,
        digitalFootprint: DigitalFootprintAnalysis,
        timeline: TimelineEvent[],
        insights: GeneratedInsight[]
    ): number {
        let confidence = 75; // Base confidence

        // More data = higher confidence
        const totalDataPoints =
            behaviorProfile.digitalFootprint.totalPlatforms +
            timeline.length +
            (digitalFootprint.overview.totalRelationships || 0);

        confidence += Math.min(15, totalDataPoints);

        // High confidence profiles increase accuracy
        const platforms = behaviorProfile.digitalFootprint.platforms;
        const verifiedPlatforms = platforms.filter((p) =>
            p.activityIndicators.some((i) => i.includes("Verified"))
        );
        confidence += Math.min(5, verifiedPlatforms.length);

        // Clear security signals
        if (behaviorProfile.securityPosture.weaknesses.length > 0) {
            confidence += 3;
        }

        // Insights generated
        confidence += Math.min(2, insights.length);

        return Math.min(95, Math.round(confidence));
    }
}
