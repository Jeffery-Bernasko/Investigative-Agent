import { OsintFindings } from "../types";

/**
 * Map the raw output from OsintAgent into the normalised OsintFindings shape.
 */
export function mapAgentResultToFindings(agentData: any): OsintFindings {
    const findings: OsintFindings = {
        profiles: [],
        emails: [],
        domains: [],
        metadata: {},
    };

    // Username / Person results
    if (agentData.username) {
        findings.profiles = agentData.username.profiles || [];
        console.log(`✅ Found ${findings.profiles.length} profiles`);
    }

    // Email results
    if (agentData.email) {
        findings.emails = [agentData.email.email];
        findings.metadata.emailIntel = {
            valid: agentData.email.isValid,
            disposable: agentData.email.isDisposable,
            breaches: agentData.email.breaches.length,
            breachDetails: agentData.email.breaches,
            gravatar: agentData.email.gravatar.exists,
            hunterScore: agentData.email.hunter.score,
        };
        console.log(
            `  ✅ Email: Valid=${agentData.email.isValid}, Breaches=${agentData.email.breaches.length}`
        );
    }

    // Domain results
    if (agentData.domain) {
        findings.domains = [agentData.domain.domain];
        findings.metadata.domainIntel = {
            dns: agentData.domain.dns,
            ssl: agentData.domain.ssl.valid,
            shodanPorts: agentData.domain.shodan.ports?.length || 0,
            shodanVulns: agentData.domain.shodan.vulns?.length || 0,
            virusTotalMalicious: agentData.domain.virusTotal.malicious || 0,
        };
        console.log(
            `  ✅ Domain: SSL=${agentData.domain.ssl.valid}, DNS=${agentData.domain.dns.a.length} A records`
        );
    }

    // Phone results
    if (agentData.phone) {
        findings.metadata.phoneIntel = {
            valid: agentData.phone.isValid,
            country: agentData.phone.country?.name,
            format: agentData.phone.format.international,
        };
        console.log(
            `  ✅ Phone: Valid=${agentData.phone.isValid}, Country=${agentData.phone.country?.name}`
        );
    }

    return findings;
}

/**
 * Attach aggregate statistics to findings metadata.
 */
export function computeFindingsStats(
    findings: OsintFindings,
    osintAgentConfidence?: number
): void {
    findings.metadata.searchedPlatforms = 20;
    findings.metadata.foundPlatforms = findings.profiles.filter(
        (p) => p.found
    ).length;
    findings.metadata.highConfidenceProfiles = findings.profiles.filter(
        (p) => p.confidence === "high"
    ).length;
    findings.metadata.mediumConfidenceProfiles = findings.profiles.filter(
        (p) => p.confidence === "medium"
    ).length;
    findings.metadata.osintAgentConfidence = osintAgentConfidence;
}
