import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { osintSearches, userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { searchUsername, searchWithTavily } from "@/lib/agents/tools/osint-tools";
import axios from "axios";


// Helper: Detect if query is a person name vs username
function parseSearchQuery(query: string): {
  type: "username" | "person";
  cleanedQuery: string;
  suggestedUsername?: string;
} {
  const trimmed = query.trim();
  
  // If starts with @, it's definitely a username
  if (trimmed.startsWith("@")) {
    return {
      type: "username",
      cleanedQuery: trimmed.replace(/^@/, "").toLowerCase(),
    };
  }
  
  // If contains spaces, likely a person name
  if (trimmed.includes(" ")) {
    const suggested = trimmed.toLowerCase().replace(/\s+/g, "");
    return {
      type: "person",
      cleanedQuery: trimmed,
      suggestedUsername: suggested,
    };
  }
  
  // Single word - treat as username
  return {
    type: "username",
    cleanedQuery: trimmed.toLowerCase(),
  };
}


// Rate limiting: simple in-memory store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitStore.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (limit.count >= 20) { // Increased to 20 requests per minute
    return false;
  }

  limit.count++;
  return true;
}

// Email intelligence
async function searchEmail(email: string, apiKeys: { hunter?: string; hibp?: string }): Promise<{
  platforms: Array<{
    name: string;
    url?: string;
    exists: boolean;
    data?: Record<string, unknown>;
  }>;
  summary: string;
}> {
  const results: Array<{
    name: string;
    url?: string;
    exists: boolean;
    data?: Record<string, unknown>;
  }> = [];

  // Hunter.io lookup
  if (apiKeys.hunter) {
    try {
      const response = await axios.get(
        `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKeys.hunter}`
      );

      if (response.data.data) {
        results.push({
          name: "Hunter.io Email Verification",
          exists: response.data.data.status === "valid",
          data: {
            status: response.data.data.status,
            score: response.data.data.score,
            disposable: response.data.data.disposable,
            webmail: response.data.data.webmail,
            mx_records: response.data.data.mx_records,
            smtp_check: response.data.data.smtp_check,
          },
        });
      }
    } catch (error) {
      console.error("Hunter.io error:", error);
    }
  }

  // Have I Been Pwned
  if (apiKeys.hibp) {
    try {
      const response = await axios.get(
        `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`,
        {
          headers: {
            "hibp-api-key": apiKeys.hibp,
            "User-Agent": "SEPTO-OSINT",
          },
        }
      );

      if (response.data && Array.isArray(response.data)) {
        results.push({
          name: "Have I Been Pwned",
          exists: true,
          data: {
            breachCount: response.data.length,
            breaches: response.data.map((b: { Name: string; BreachDate: string; DataClasses: string[] }) => ({
              name: b.Name,
              date: b.BreachDate,
              dataTypes: b.DataClasses,
            })),
          },
        });
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        results.push({
          name: "Have I Been Pwned",
          exists: false,
          data: { message: "No breaches found" },
        });
      }
    }
  }

  // Check Gravatar
  try {
    const crypto = await import("crypto");
    const hash = crypto.createHash("md5").update(email.toLowerCase().trim()).digest("hex");
    const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404`;
    
    const response = await fetch(gravatarUrl, { method: "HEAD" });
    const exists = response.ok;

    results.push({
      name: "Gravatar",
      url: `https://en.gravatar.com/${hash}`,
      exists,
    });
  } catch {
    // Skip gravatar check
  }

  const foundCount = results.filter((r) => r.exists).length;
  const summary = `Found ${foundCount} results for email "${email}".`;

  return { platforms: results, summary };
}

// Domain intelligence
async function searchDomain(domain: string, apiKeys: { virustotal?: string; shodan?: string }): Promise<{
  platforms: Array<{
    name: string;
    url?: string;
    exists: boolean;
    data?: Record<string, unknown>;
  }>;
  summary: string;
}> {
  const results: Array<{
    name: string;
    url?: string;
    exists: boolean;
    data?: Record<string, unknown>;
  }> = [];

  // Basic DNS check
  try {
    const dns = await import("dns").then(m => m.promises);
    const records = await dns.resolve(domain);
    results.push({
      name: "DNS Records",
      exists: true,
      data: { aRecords: records },
    });
  } catch {
    results.push({
      name: "DNS Records",
      exists: false,
      data: { message: "No DNS records found" },
    });
  }

  // VirusTotal
  if (apiKeys.virustotal) {
    try {
      const response = await axios.get(
        `https://www.virustotal.com/api/v3/domains/${domain}`,
        {
          headers: { "x-apikey": apiKeys.virustotal },
        }
      );

      if (response.data.data) {
        const attrs = response.data.data.attributes;
        results.push({
          name: "VirusTotal",
          url: `https://www.virustotal.com/gui/domain/${domain}`,
          exists: true,
          data: {
            reputation: attrs.reputation,
            lastAnalysisStats: attrs.last_analysis_stats,
            registrar: attrs.registrar,
            creationDate: attrs.creation_date,
            categories: attrs.categories,
          },
        });
      }
    } catch (error) {
      console.error("VirusTotal error:", error);
    }
  }

  // Shodan
  if (apiKeys.shodan) {
    try {
      const response = await axios.get(
        `https://api.shodan.io/dns/domain/${domain}?key=${apiKeys.shodan}`
      );

      if (response.data) {
        results.push({
          name: "Shodan DNS",
          url: `https://www.shodan.io/domain/${domain}`,
          exists: true,
          data: {
            subdomains: response.data.subdomains,
            records: response.data.data?.slice(0, 10),
          },
        });
      }
    } catch (error) {
      console.error("Shodan error:", error);
    }
  }

  const foundCount = results.filter((r) => r.exists).length;
  const summary = `Found ${foundCount} results for domain "${domain}".`;

  return { platforms: results, summary };
}

// Phone number lookup
async function searchPhone(phone: string): Promise<{
  platforms: Array<{
    name: string;
    url?: string;
    exists: boolean;
    data?: Record<string, unknown>;
  }>;
  summary: string;
}> {
  const results: Array<{
    name: string;
    url?: string;
    exists: boolean;
    data?: Record<string, unknown>;
  }> = [];

  // Basic phone validation
  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  const isValid = /^\+?[1-9]\d{6,14}$/.test(cleanPhone);

  results.push({
    name: "Phone Validation",
    exists: isValid,
    data: {
      originalInput: phone,
      cleanedNumber: cleanPhone,
      isValid,
      format: cleanPhone.startsWith("+") ? "International" : "Local",
    },
  });

  // Country detection
  const countryMap: Record<string, string> = {
    "+1": "United States/Canada",
    "+44": "United Kingdom",
    "+60": "Malaysia",
    "+91": "India",
    "+86": "China",
    "+81": "Japan",
    "+61": "Australia",
    "+33": "France",
    "+49": "Germany",
  };

  for (const [code, country] of Object.entries(countryMap)) {
    if (cleanPhone.startsWith(code)) {
      results.push({
        name: "Country Detection",
        exists: true,
        data: { country, countryCode: code },
      });
      break;
    }
  }

  const summary = `Phone analysis completed for "${phone}".`;

  return { platforms: results, summary };
}

export async function POST(request: NextRequest) {
  try {
    console.log("\n🔍 ===== OSINT SEARCH API =====");
    
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    if (!checkRateLimit(ip)) {
      console.log("❌ Rate limit exceeded for IP:", ip);
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before making more requests." },
        { status: 429 }
      );
    }

    // Get session
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;

    const body = await request.json();
    const { searchType = "username", query, username } = body;
    
    // Support both 'query' and 'username' parameters
    const searchQuery = query || username;

    if (!searchQuery) {
      console.log("❌ Missing query parameter");
      return NextResponse.json(
        { error: "Missing search query" },
        { status: 400 }
      );
    }

    console.log(`📋 Search Type: ${searchType}`);
    console.log(`🎯 Query: ${searchQuery}`);
    console.log(`👤 User: ${userId || "Anonymous"}`);

    // Get user's API keys
    let apiKeys: {
      hunter?: string;
      shodan?: string;
      virustotal?: string;
      hibp?: string;
      tavily?: string;
    } = {};

    if (userId) {
      const settings = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (settings.length > 0) {
        apiKeys = {
          hunter: settings[0].hunterApiKey || undefined,
          shodan: settings[0].shodanApiKey || undefined,
          virustotal: settings[0].virusTotalApiKey || undefined,
          hibp: settings[0].hibpApiKey || undefined,
        };
      }
    }

    // Fall back to environment variables
    apiKeys.hunter = apiKeys.hunter || process.env.HUNTER_API_KEY;
    apiKeys.shodan = apiKeys.shodan || process.env.SHODAN_API_KEY;
    apiKeys.virustotal = apiKeys.virustotal || process.env.VIRUSTOTAL_API_KEY;
    apiKeys.hibp = apiKeys.hibp || process.env.HIBP_API_KEY;
    apiKeys.tavily = apiKeys.tavily || process.env.TAVILY_API_KEY;

    let results: any;
    const startTime = Date.now();

    switch (searchType) {
  case "username": {
    console.log("\n🔍 Starting username search...");
    
    // Parse the query to detect if it's a person name
    const parsed = parseSearchQuery(searchQuery);
    console.log(`📝 Query type: ${parsed.type}`);
    
    let usernameToSearch: string;
    let profiles: any[] = [];
    
    if (parsed.type === "person") {
      console.log(`👤 Detected person name: "${parsed.cleanedQuery}"`);
      
      // Check if we have a known username mapping
      
      
        usernameToSearch = parsed.suggestedUsername || parsed.cleanedQuery;
        console.log(`💡 Suggested username: ${usernameToSearch}`);
      
      
      // Search with suggested username
      const usernameResult = await searchUsername(usernameToSearch);
      profiles = usernameResult.profiles;
      
      // Also do a Tavily search for the person's name to find more profiles
      if (apiKeys.tavily) {
        console.log(`\n🌐 Searching for person name via Tavily...`);
        const nameResults = await searchWithTavily(
          `"${parsed.cleanedQuery}" social media profile site:twitter.com OR site:linkedin.com OR site:instagram.com OR site:github.com`,
          apiKeys.tavily
        );
        
        console.log(`📊 Tavily found ${nameResults.length} person-name results`);
        
        // Extract usernames from Tavily results
        nameResults.forEach((result) => {
          const url = result.url.toLowerCase();
          let platform = "Other";
          let extractedUrl = result.url;
          let confidence: "high" | "medium" | "low" = "high";
          
          // Extract username from URL
          if (url.includes("twitter.com/") || url.includes("x.com/")) {
            platform = "Twitter";
            const match = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
            if (match) extractedUrl = `https://twitter.com/${match[1]}`;
          } else if (url.includes("linkedin.com/in/")) {
            platform = "LinkedIn";
            const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
            if (match) extractedUrl = `https://linkedin.com/in/${match[1]}`;
          } else if (url.includes("instagram.com/")) {
            platform = "Instagram";
            const match = url.match(/instagram\.com\/([^\/\?]+)/);
            if (match) extractedUrl = `https://instagram.com/${match[1]}`;
          } else if (url.includes("github.com/")) {
            platform = "GitHub";
            const match = url.match(/github\.com\/([^\/\?]+)/);
            if (match) extractedUrl = `https://github.com/${match[1]}`;
          } else if (url.includes("facebook.com/")) {
            platform = "Facebook";
            const match = url.match(/facebook\.com\/([^\/\?]+)/);
            if (match) extractedUrl = `https://facebook.com/${match[1]}`;
          }
          
          // Check if we already have this platform
          const existing = profiles.find(p => p.platform === platform);
          if (!existing) {
            console.log(`  ✨ Found ${platform} via name search`);
            profiles.push({
              platform,
              url: extractedUrl,
              found: true,
              confidence,
              checkedAt: new Date(),
            });
          } else if (existing.confidence !== "high") {
            // Upgrade confidence
            console.log(`  ⬆️ Upgraded ${platform} to high confidence`);
            existing.confidence = "high";
            existing.url = extractedUrl;
          }
        });
      }
    } else {
      // Direct username search
      console.log(`👤 Searching for username: ${parsed.cleanedQuery}`);
      const usernameResult = await searchUsername(parsed.cleanedQuery);
      profiles = usernameResult.profiles;
    }
    
    // Convert to expected format
    results = {
      platforms: profiles.map(p => ({
        name: p.platform,
        url: p.url,
        exists: p.found,
        confidence: p.confidence,
        category: "Social Media",
      })),
      summary: `Found ${profiles.length} profiles for "${searchQuery}" across 20 platforms checked.`,
    };
    
    console.log(`✅ Username search complete: ${profiles.length} profiles found`);
    break;
  }


      case "email":
        console.log("\n📧 Starting email search...");
        results = await searchEmail(searchQuery, apiKeys);
        console.log(`✅ Email search complete`);
        break;

      case "domain":
        console.log("\n🌐 Starting domain search...");
        results = await searchDomain(searchQuery, apiKeys);
        console.log(`✅ Domain search complete`);
        break;

      case "phone":
        console.log("\n📱 Starting phone search...");
        results = await searchPhone(searchQuery);
        console.log(`✅ Phone search complete`);
        break;

      default:
        console.log(`❌ Invalid search type: ${searchType}`);
        return NextResponse.json(
          { error: "Invalid search type" },
          { status: 400 }
        );
    }

    const duration = Date.now() - startTime;

    // Enrich with Tavily web search
    let webResults: Array<{ title: string; url: string; snippet: string }> = [];
    if (apiKeys.tavily) {
      console.log("\n🌐 Enriching with Tavily web search...");
      const tavilyQuery = searchType === "username"
        ? `"${searchQuery}" social media profile`
        : `"${searchQuery}" OSINT`;
      
      const webSearch = await searchWithTavily(tavilyQuery, apiKeys.tavily);
      webResults = webSearch;
      console.log(`✅ Tavily returned ${webResults.length} results`);
    }

    // Store search in database
    try {
      const searchRecord = await db
        .insert(osintSearches)
        .values({
          userId: userId || null,
          searchType: searchType as any,
          query: searchQuery,
          results: {
            platforms: results.platforms,
            summary: results.summary,
          },
          status: "completed",
          completedAt: new Date(),
        })
        .returning();

      console.log(`💾 Stored search record: ${searchRecord[0].id}`);
    } catch (dbError) {
      console.error("❌ Failed to store search record:", dbError);
      // Continue anyway - don't fail the request
    }

    console.log(`\n✅ ===== SEARCH COMPLETE (${duration}ms) =====\n`);

    return NextResponse.json({
      success: true,
      searchType,
      query: searchQuery,
      ...results,
      webResults,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("\n❌ OSINT search error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "10");

    const searches = await db
      .select()
      .from(osintSearches)
      .where(userId ? eq(osintSearches.userId, userId) : undefined)
      .orderBy(osintSearches.createdAt)
      .limit(limit);

    return NextResponse.json({ searches });
  } catch (error) {
    console.error("Failed to get OSINT searches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}