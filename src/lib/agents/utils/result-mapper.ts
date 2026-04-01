import { OsintFindings } from "../types";

type ConfidenceLevel = "high" | "medium" | "low";

function normalizeConfidence(value: unknown): ConfidenceLevel | undefined {
    if (value === "high" || value === "medium" || value === "low") {
        return value;
    }
    return undefined;
}

function normalizeProfiles(rawProfiles: unknown): OsintFindings["profiles"] {
    if (!Array.isArray(rawProfiles)) {
        return [];
    }

    return rawProfiles
        .map((profile: any) => {
            if (!profile || typeof profile !== "object") {
                return null;
            }

            const platform =
                typeof profile.platform === "string" ? profile.platform : "Unknown";
            const url = typeof profile.url === "string" ? profile.url : "";

            return {
                platform,
                url,
                found: typeof profile.found === "boolean" ? profile.found : Boolean(url),
                confidence: normalizeConfidence(profile.confidence) ?? "low",
                username:
                    typeof profile.username === "string"
                        ? profile.username
                        : undefined,
                avatarUrl:
                    typeof profile.avatarUrl === "string"
                        ? profile.avatarUrl
                        : undefined,
                avatarData:
                    typeof profile.avatarData === "string"
                        ? profile.avatarData
                        : undefined,
                data: profile.data,
            };
        })
        .filter(Boolean) as OsintFindings["profiles"];
}

function getFirstObject(raw: unknown): Record<string, any> | undefined {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return undefined;
    }
    return raw as Record<string, any>;
}

/**
 * Map the raw output from OsintAgent into the normalized OsintFindings shape.
 */
export function mapAgentResultToFindings(agentData: any): OsintFindings {
    const findings: OsintFindings = {
        profiles: [],
        emails: [],
        domains: [],
        metadata: {},
    };

    // Profiles from current iterative agent shape (top-level) or legacy username shape.
    const profilesFromAgent =
        agentData?.profiles ?? agentData?.username?.profiles ?? [];
    findings.profiles = normalizeProfiles(profilesFromAgent);
    console.log(`Found ${findings.profiles.length} profiles`);

    // Email results: legacy single object or iterative array + metadata.
    if (agentData?.email) {
        findings.emails = [agentData.email.email];
        findings.metadata.emailIntel = {
            valid: agentData.email.isValid,
            disposable: agentData.email.isDisposable,
            breaches: agentData.email.breaches?.length || 0,
            breachDetails: agentData.email.breaches || [],
            gravatar: agentData.email.gravatar?.exists,
            hunterScore: agentData.email.hunter?.score,
        };
    } else if (Array.isArray(agentData?.emails)) {
        findings.emails = agentData.emails
            .map((entry: any) =>
                typeof entry?.address === "string" ? entry.address : null
            )
            .filter((value: string | null): value is string => Boolean(value));

        const emailIntel =
            getFirstObject(agentData?.metadata?.emailIntel) ??
            getFirstObject(agentData?.emails?.[0]?.data);
        if (emailIntel) {
            findings.metadata.emailIntel = emailIntel;
        }
    }

    // Domain results: legacy single object or iterative array + metadata.
    if (agentData?.domain) {
        findings.domains = [agentData.domain.domain];
        findings.metadata.domainIntel = {
            dns: agentData.domain.dns,
            ssl: agentData.domain.ssl?.valid,
            shodanPorts: agentData.domain.shodan?.ports?.length || 0,
            shodanVulns: agentData.domain.shodan?.vulns?.length || 0,
            virusTotalMalicious: agentData.domain.virusTotal?.malicious || 0,
        };
    } else if (Array.isArray(agentData?.domains)) {
        findings.domains = agentData.domains
            .map((entry: any) =>
                typeof entry?.domain === "string" ? entry.domain : null
            )
            .filter((value: string | null): value is string => Boolean(value));

        const domainIntel =
            getFirstObject(agentData?.metadata?.domainIntel) ??
            getFirstObject(agentData?.domains?.[0]?.data);
        if (domainIntel) {
            findings.metadata.domainIntel = domainIntel;
        }
    }

    // Phone results: legacy object or iterative metadata/array.
    if (agentData?.phone) {
        findings.metadata.phoneIntel = {
            valid: agentData.phone.isValid,
            country: agentData.phone.country?.name,
            format: agentData.phone.format?.international,
        };
    } else {
        const phoneIntel =
            getFirstObject(agentData?.metadata?.phoneIntel) ??
            getFirstObject(agentData?.phones?.[0]?.data);
        if (phoneIntel) {
            findings.metadata.phoneIntel = phoneIntel;
        }
    }

    // Personal websites discovered during person search
    if (Array.isArray(agentData?.personalWebsites) && agentData.personalWebsites.length > 0) {
        findings.personalWebsites = agentData.personalWebsites;
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
