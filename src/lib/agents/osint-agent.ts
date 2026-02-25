/**
 * OSINT Agent
 * Specialized autonomous agent for deep OSINT collection
 */
import { BaseAgent, AgentConfig } from "./base-agents";
import { Task, AgentResult } from "./types";
import { gatherEmailIntelligence } from "./tools/email-intel";
import { gatherDomainIntelligence } from "./tools/domain-intel";
import { gatherPhoneIntelligence } from "./tools/phone-intel";
import { searchUsername } from "./tools/username-search";
import { searchPersonByName } from "./tools/person-search";

export class OsintAgent extends BaseAgent {
  async execute(task: Task): Promise<AgentResult> {
    console.log(`\n🔍 ============================================`);
    console.log(`🔍 OSINT AGENT: Starting Task`);
    console.log(`🔍 Target: ${task.target}`);
    console.log(`🔍 Description: ${task.description}`);
    console.log(`🔍 ============================================\n`);

    try {
      const results: any = {
        username: null,
        email: null,
        domain: null,
        phone: null,
      };

      // Determine what type of OSINT to perform
      const target = task.target.toLowerCase();

      // Check for email
      if (target.includes("@") && target.split("@")[1]?.includes(".")) {
        this.log("Detected email address");
        results.email = await gatherEmailIntelligence(task.target, {
          hunter: process.env.HUNTER_API_KEY,
          hibp: process.env.HIBP_API_KEY,
        });
      }
      // Check for domain
      else if (target.includes(".") && !target.includes("@")) {
        this.log("Detected domain");
        results.domain = await gatherDomainIntelligence(task.target, {
          shodan: process.env.SHODAN_API_KEY,
          virusTotal: process.env.VIRUSTOTAL_API_KEY,
        });
      }
      // Check for phone
      else if (/^\+?\d{6,15}$/.test(target.replace(/[^0-9+]/g, ""))) {
        this.log("Detected phone number");
        results.phone = await gatherPhoneIntelligence(task.target);
      }
      // Check if target is a person name (contains spaces)
      else if (task.metadata?.targetType === "person" || task.target.includes(" ")) {
        this.log("Detected person name — using name-first search");
        results.username = await searchPersonByName(task.target);
      }
      // Default to username search
      else {
        this.log("Detected username");
        results.username = await searchUsername(task.target);
      }

      console.log(`\n✅ OSINT AGENT: Task Complete\n`);

      return {
        agentName: this.name,
        success: true,
        data: results,
        confidence: this.calculateOverallConfidence(results),
      };
    } catch (error: any) {
      console.error(`\n❌ OSINT AGENT: Task Failed`, error);
      return {
        agentName: this.name,
        success: false,
        error: error.message,
      };
    }
  }

  private calculateOverallConfidence(results: any): number {
    let totalConfidence = 0;
    let count = 0;

    const confidenceMap = { high: 90, medium: 60, low: 30 };

    if (results.username) {
      count++;
      totalConfidence +=
        results.username.profiles.reduce(
          (sum: number, p: any) =>
            sum + (confidenceMap[(p.confidence || "low") as keyof typeof confidenceMap] || 30),
          0
        ) / Math.max(results.username.profiles.length, 1);
    }

    if (results.email) {
      count++;
      totalConfidence += confidenceMap[(results.email.confidence || "low") as keyof typeof confidenceMap] || 30;
    }

    if (results.domain) {
      count++;
      totalConfidence += confidenceMap[(results.domain.confidence || "low") as keyof typeof confidenceMap] || 30;
    }

    if (results.phone) {
      count++;
      totalConfidence += confidenceMap[(results.phone.confidence || "low") as keyof typeof confidenceMap] || 30;
    }

    return count > 0 ? Math.round(totalConfidence / count) : 50;
  }
}