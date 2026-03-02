/**
 * OSINT Agent
 * Specialized autonomous agent for deep OSINT collection
 */
import { BaseAgent, AgentConfig } from "./base-agents";
import { Task, AgentResult, OsintTarget } from "./types";
import { gatherEmailIntelligence } from "./tools/email-intel";
import { gatherDomainIntelligence } from "./tools/domain-intel";
import { gatherPhoneIntelligence } from "./tools/phone-intel";
import { searchUsername } from "./tools/username-search";
import { searchUsernameOnPlatforms, ALL_PLATFORM_NAMES } from "./tools/username-search";
import { searchPersonByName } from "./tools/person-search";
import { extractEmails, extractDomains } from "./tools/osint-tools";

export class OsintAgent extends BaseAgent {
  async execute(task: Task): Promise<AgentResult> {
    console.log(`\n🔍 ============================================`);
    console.log(`🔍 OSINT AGENT: Starting Iterative Task`);
    console.log(`🔍 Target: ${task.target}`);
    console.log(`🔍 Description: ${task.description}`);
    console.log(`🔍 ============================================\n`);

    try {
      const results: any = {
        profiles: [],
        emails: [],
        domains: [],
        phones: [],
        metadata: {},
      };

      const pendingTargets: OsintTarget[] = [];
      const processedTargets = new Set<string>();

      // Track platforms already confirmed across all person searches
      const globalConfirmedPlatforms = new Set<string>();

      // Seed initial target
      let initialType: OsintTarget["type"] = "username";
      const rawTarget = task.target.toLowerCase();
      if (rawTarget.includes("@") && rawTarget.split("@")[1]?.includes(".")) {
        initialType = "email";
      } else if (rawTarget.includes(".") && !rawTarget.includes("@")) {
        initialType = "domain";
      } else if (/^\+?\d{6,15}$/.test(rawTarget.replace(/[^0-9+]/g, ""))) {
        initialType = "phone";
      } else if (task.metadata?.targetType === "person" || task.target.includes(" ")) {
        initialType = "person";
      }

      pendingTargets.push({
        term: task.target,
        type: initialType,
        depth: 0,
      });

      const MAX_DEPTH = 2; // e.g. person(0) -> username(1) -> email(2)

      while (pendingTargets.length > 0) {
        // Grab next target, FIFO
        const currentTarget = pendingTargets.shift()!;
        const dedupKey = `${currentTarget.type}:${currentTarget.term.toLowerCase()}`;
        if (processedTargets.has(dedupKey)) continue;

        processedTargets.add(dedupKey);

        console.log(
          `\n⏱️ [Depth ${currentTarget.depth}] Investigating ${currentTarget.type}: ${currentTarget.term}`
        );

        const provenance = {
          sourceTarget: currentTarget.parent || "Initial",
          pivotDepth: currentTarget.depth,
        };

        if (currentTarget.type === "email") {
          const emailIntel = await gatherEmailIntelligence(currentTarget.term, {
            hunter: process.env.HUNTER_API_KEY,
            hibp: process.env.HIBP_API_KEY,
          });
          results.emails.push({ address: currentTarget.term, provenance, data: emailIntel });

          if (!results.metadata.emailIntel) {
            results.metadata.emailIntel = emailIntel;
          }
        }
        else if (currentTarget.type === "domain") {
          const domainIntel = await gatherDomainIntelligence(currentTarget.term, {
            shodan: process.env.SHODAN_API_KEY,
            virusTotal: process.env.VIRUSTOTAL_API_KEY,
          });
          results.domains.push({ domain: currentTarget.term, provenance, data: domainIntel });

          if (!results.metadata.domainIntel) {
            results.metadata.domainIntel = domainIntel;
          }
        }
        else if (currentTarget.type === "phone") {
          const phoneIntel = await gatherPhoneIntelligence(currentTarget.term);
          results.phones.push({ number: currentTarget.term, provenance, data: phoneIntel });

          if (!results.metadata.phoneIntel) {
            results.metadata.phoneIntel = phoneIntel;
          }
        }
        else if (currentTarget.type === "person") {
          const personRes = await searchPersonByName(currentTarget.term);
          if (personRes?.found) {
            results.profiles.push(...personRes.profiles.map((p: any) => ({ ...p, provenance })));

            // Merge the identity map into our global confirmed platforms
            const identityMap = personRes.identityMap || {};
            for (const platform of Object.keys(identityMap)) {
              globalConfirmedPlatforms.add(platform);
            }

            // Pivot: Only add username targets for platforms NOT yet confirmed
            if (currentTarget.depth < MAX_DEPTH) {
              const pivotUsernames = new Set<string>();

              // Extract unique usernames from the identity map
              for (const [_platform, identity] of Object.entries(identityMap)) {
                pivotUsernames.add(identity.username);
              }

              // Determine which platforms still need searching
              const missingPlatforms = ALL_PLATFORM_NAMES.filter(
                (p) => !globalConfirmedPlatforms.has(p)
              );

              if (missingPlatforms.length > 0 && pivotUsernames.size > 0) {
                console.log(
                  `🔄 Pivot: ${pivotUsernames.size} username(s) from identity map, ${missingPlatforms.length} platforms still missing`
                );

                pivotUsernames.forEach((u) => {
                  console.log(`   🔄 Queuing targeted search for "${u}" on ${missingPlatforms.length} missing platforms`);
                  pendingTargets.push({
                    term: u,
                    type: "username",
                    depth: currentTarget.depth + 1,
                    parent: currentTarget.term,
                    targetPlatforms: [...missingPlatforms],
                  });
                });
              } else {
                console.log(`✅ All platforms covered by person search — no pivot needed`);
              }
            }
          }
        }
        else if (currentTarget.type === "username") {
          // Use targeted search if targetPlatforms is specified, otherwise search all
          const userRes = currentTarget.targetPlatforms
            ? await searchUsernameOnPlatforms(currentTarget.term, currentTarget.targetPlatforms)
            : await searchUsername(currentTarget.term);

          if (userRes.found) {
            results.profiles.push(...userRes.profiles.map((p: any) => ({ ...p, provenance, username: currentTarget.term })));

            // Update global confirmed platforms with any new finds
            for (const p of userRes.profiles) {
              if (p.found) {
                globalConfirmedPlatforms.add(p.platform);
              }
            }

            // Pivot evaluation: check profiles 'data' / 'bio' for extracting emails or domains
            if (currentTarget.depth < MAX_DEPTH) {
              for (const p of userRes.profiles as any) {
                // only branch off reliable accounts
                if (p.confidence !== "high" && p.confidence !== "medium") continue;

                let textToScan = "";
                if (p.url) textToScan += p.url + " ";
                if (p.data && typeof p.data === "object") {
                  textToScan += JSON.stringify(p.data);
                }

                if (textToScan) {
                  const extractedEmails = extractEmails(textToScan);
                  for (const e of extractedEmails) {
                    pendingTargets.push({
                      term: e,
                      type: "email",
                      depth: currentTarget.depth + 1,
                      parent: currentTarget.term,
                    });
                  }

                  const extractedDomains = extractDomains(textToScan);
                  for (const d of extractedDomains) {
                    if (d.includes("github.com") || d.includes("x.com") || d.includes("linkedin.com") || d.includes("facebook.com")) continue; // skip common platform domains
                    pendingTargets.push({
                      term: d,
                      type: "domain",
                      depth: currentTarget.depth + 1,
                      parent: currentTarget.term,
                    });
                  }
                }
              }
            }
          }
        }
      }

      console.log(`\n✅ OSINT AGENT: Iterative Task Complete\n`);

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

    if (results.profiles && results.profiles.length > 0) {
      count++;
      totalConfidence +=
        results.profiles.reduce(
          (sum: number, p: any) =>
            sum + (confidenceMap[(p.confidence || "low") as keyof typeof confidenceMap] || 30),
          0
        ) / Math.max(results.profiles.length, 1);
    }

    if (results.emails && results.emails.length > 0) {
      count++;
      totalConfidence += 70; // Hardcode placeholder logic given array shapes
    }

    if (results.domains && results.domains.length > 0) {
      count++;
      totalConfidence += 60;
    }

    if (results.phones && results.phones.length > 0) {
      count++;
      totalConfidence += 80;
    }

    return count > 0 ? Math.round(totalConfidence / count) : 50;
  }
}
