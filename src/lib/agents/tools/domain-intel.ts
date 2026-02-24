/**
 * Domain Intelligence Tools
 * WHOIS, DNS, SSL, Shodan, VirusTotal
 */

import { promises as dns } from "dns";

export interface DomainIntelligence {
  domain: string;
  dns: {
    a: string[];
    mx: string[];
    txt: string[];
    ns: string[];
  };
  whois: {
    registrar?: string;
    createdDate?: string;
    expiresDate?: string;
    nameServers?: string[];
  };
  ssl: {
    valid: boolean;
    issuer?: string;
    validFrom?: string;
    validTo?: string;
  };
  shodan: {
    ip?: string;
    ports?: number[];
    vulns?: string[];
  };
  virusTotal: {
    reputation?: number;
    malicious?: number;
    suspicious?: number;
    clean?: number;
  };
  confidence: "high" | "medium" | "low";
}

// DNS lookup
export async function lookupDNS(domain: string): Promise<{
  a: string[];
  mx: string[];
  txt: string[];
  ns: string[];
}> {
  console.log(`  🔍 DNS: Looking up ${domain}`);

  try {
    const [a, mx, txt, ns] = await Promise.allSettled([
      dns.resolve4(domain).catch(() => []),
      dns.resolveMx(domain).catch(() => []),
      dns.resolveTxt(domain).catch(() => []),
      dns.resolveNs(domain).catch(() => []),
    ]);

    const result = {
      a: a.status === "fulfilled" ? a.value : [],
      mx: mx.status === "fulfilled" ? mx.value.map((r) => r.exchange) : [],
      txt: txt.status === "fulfilled" ? txt.value.flat() : [],
      ns: ns.status === "fulfilled" ? ns.value : [],
    };

    console.log(`  ✅ DNS: Found ${result.a.length} A records, ${result.mx.length} MX records`);
    return result;
  } catch (error: any) {
    console.error(`  ⚠️ DNS error:`, error.message);
    return { a: [], mx: [], txt: [], ns: [] };
  }
}

// Simple WHOIS check (basic implementation)
export async function lookupWHOIS(domain: string): Promise<{
  registrar?: string;
  createdDate?: string;
  expiresDate?: string;
  nameServers?: string[];
}> {
  console.log(`  🔍 WHOIS: Checking ${domain}`);

  try {
    // Use a WHOIS API service (example: whoisxmlapi.com)
    // For now, return basic info - implement with actual API
    console.log(`  ⚠️ WHOIS lookup requires API integration`);
    return {};
  } catch (error: any) {
    console.error(`  ⚠️ WHOIS error:`, error.message);
    return {};
  }
}

// SSL certificate check
export async function checkSSL(domain: string): Promise<{
  valid: boolean;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
}> {
  console.log(`  🔍 SSL: Checking certificate for ${domain}`);

  try {
    const response = await fetch(`https://${domain}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });

    // Basic check - certificate is valid if HTTPS works
    const valid = response.ok;
    console.log(`  ${valid ? "✅" : "❌"} SSL: Certificate is ${valid ? "valid" : "invalid"}`);

    return {
      valid,
      // More detailed cert info would require Node.js tls module
    };
  } catch (error: any) {
    console.error(`  ⚠️ SSL error:`, error.message);
    return { valid: false };
  }
}

// Shodan lookup
export async function lookupShodan(
  domain: string,
  apiKey?: string
): Promise<{
  ip?: string;
  ports?: number[];
  vulns?: string[];
}> {
  const key = apiKey || process.env.SHODAN_API_KEY;
  if (!key) {
    console.log(`  ⚠️ Shodan API key not configured`);
    return {};
  }

  try {
    console.log(`  🔍 Shodan: Scanning ${domain}`);

    // First get IP
    const dnsResult = await dns.resolve4(domain).catch(() => []);
    if (dnsResult.length === 0) {
      console.log(`  ❌ Shodan: Could not resolve domain`);
      return {};
    }

    const ip = dnsResult[0];

    const response = await fetch(
      `https://api.shodan.io/shodan/host/${ip}?key=${key}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      console.log(`  ❌ Shodan API error: ${response.status}`);
      return { ip };
    }

    const data = await response.json();

    const ports = data.ports || [];
    const vulns = data.vulns || [];

    console.log(`  ✅ Shodan: Found ${ports.length} open ports, ${vulns.length} vulnerabilities`);

    return {
      ip,
      ports,
      vulns,
    };
  } catch (error: any) {
    console.error(`  ⚠️ Shodan error:`, error.message);
    return {};
  }
}

// VirusTotal lookup
export async function lookupVirusTotal(
  domain: string,
  apiKey?: string
): Promise<{
  reputation?: number;
  malicious?: number;
  suspicious?: number;
  clean?: number;
}> {
  const key = apiKey || process.env.VIRUSTOTAL_API_KEY;
  if (!key) {
    console.log(`  ⚠️ VirusTotal API key not configured`);
    return {};
  }

  try {
    console.log(`  🔍 VirusTotal: Checking ${domain}`);

    const response = await fetch(
      `https://www.virustotal.com/api/v3/domains/${domain}`,
      {
        headers: { "x-apikey": key },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.log(`  ❌ VirusTotal API error: ${response.status}`);
      return {};
    }

    const data = await response.json();
    const stats = data.data?.attributes?.last_analysis_stats;

    if (stats) {
      console.log(
        `  ✅ VirusTotal: ${stats.malicious} malicious, ${stats.suspicious} suspicious, ${stats.harmless} clean`
      );
      return {
        reputation: data.data?.attributes?.reputation,
        malicious: stats.malicious,
        suspicious: stats.suspicious,
        clean: stats.harmless,
      };
    }

    return {};
  } catch (error: any) {
    console.error(`  ⚠️ VirusTotal error:`, error.message);
    return {};
  }
}

// Main domain intelligence gathering function
export async function gatherDomainIntelligence(
  domain: string,
  apiKeys?: {
    shodan?: string;
    virusTotal?: string;
  }
): Promise<DomainIntelligence> {
  console.log(`\n🌐 Gathering domain intelligence: ${domain}`);

  // Clean domain (remove protocol if present)
  const cleanDomain = domain.replace(/^https?:\/\//, "").split("/")[0];

  // Gather intelligence in parallel
  const [dnsResult, whoisResult, sslResult, shodanResult, vtResult] =
    await Promise.all([
      lookupDNS(cleanDomain),
      lookupWHOIS(cleanDomain),
      checkSSL(cleanDomain),
      lookupShodan(cleanDomain, apiKeys?.shodan),
      lookupVirusTotal(cleanDomain, apiKeys?.virusTotal),
    ]);

  // Calculate confidence
  let confidence: "high" | "medium" | "low" = "medium";
  if (dnsResult.a.length > 0 && sslResult.valid) {
    confidence = "high";
  } else if (dnsResult.a.length === 0) {
    confidence = "low";
  }

  const result: DomainIntelligence = {
    domain: cleanDomain,
    dns: dnsResult,
    whois: whoisResult,
    ssl: sslResult,
    shodan: shodanResult,
    virusTotal: vtResult,
    confidence,
  };

  console.log(`✅ Domain intelligence complete`);
  console.log(`  DNS records: ${dnsResult.a.length} A, ${dnsResult.mx.length} MX`);
  console.log(`  SSL: ${sslResult.valid ? "Valid" : "Invalid"}`);
  console.log(`  Confidence: ${confidence}`);

  return result;
}