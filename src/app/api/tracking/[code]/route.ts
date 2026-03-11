import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trackingLinks, trackingData, userSettings } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import axios from "axios";

// Parse user agent
function parseUserAgent(ua: string): {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  deviceType: string;
} {
  const result = {
    browser: "Unknown",
    browserVersion: "",
    os: "Unknown",
    osVersion: "",
    device: "Unknown",
    deviceType: "desktop",
  };

  // Browser detection
  if (ua.includes("Firefox/")) {
    result.browser = "Firefox";
    result.browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || "";
  } else if (ua.includes("Edg/")) {
    result.browser = "Edge";
    result.browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || "";
  } else if (ua.includes("Chrome/")) {
    result.browser = "Chrome";
    result.browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || "";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    result.browser = "Safari";
    result.browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || "";
  }

  // OS detection
  if (ua.includes("Windows NT 10")) {
    result.os = "Windows";
    result.osVersion = "10/11";
  } else if (ua.includes("Windows NT")) {
    result.os = "Windows";
    result.osVersion = ua.match(/Windows NT ([\d.]+)/)?.[1] || "";
  } else if (ua.includes("Mac OS X")) {
    result.os = "macOS";
    result.osVersion = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "";
  } else if (ua.includes("Linux")) {
    result.os = "Linux";
  } else if (ua.includes("Android")) {
    result.os = "Android";
    result.osVersion = ua.match(/Android ([\d.]+)/)?.[1] || "";
    result.deviceType = "mobile";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    result.os = "iOS";
    result.osVersion = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "";
    result.deviceType = ua.includes("iPad") ? "tablet" : "mobile";
  }

  // Device type refinement
  if (ua.includes("Mobile")) {
    result.deviceType = "mobile";
  } else if (ua.includes("Tablet")) {
    result.deviceType = "tablet";
  }

  return result;
}

// Get IP geolocation
async function getIpInfo(ip: string, ipinfoToken?: string): Promise<{
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  isVpn?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
}> {
  if (!ipinfoToken || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return {};
  }

  try {
    const response = await axios.get(`https://ipinfo.io/${ip}?token=${ipinfoToken}`, {
      timeout: 5000,
    });

    const data = response.data;
    const [lat, lng] = (data.loc || "").split(",").map(Number);

    return {
      country: data.country,
      region: data.region,
      city: data.city,
      latitude: lat || undefined,
      longitude: lng || undefined,
      timezone: data.timezone,
      isp: data.org,
      isVpn: data.privacy?.vpn || false,
      isProxy: data.privacy?.proxy || false,
      isTor: data.privacy?.tor || false,
    };
  } catch (error) {
    console.error("IP lookup failed:", error);
    return {};
  }
}

// GET: Get tracking data for a link
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Get the link
    const [link] = await db
      .select()
      .from(trackingLinks)
      .where(eq(trackingLinks.code, code))
      .limit(1);

    if (!link) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    // Get tracking data
    const data = await db
      .select()
      .from(trackingData)
      .where(eq(trackingData.trackingLinkId, link.id))
      .orderBy(desc(trackingData.clickedAt))
      .limit(100);

    // Aggregate stats
    const uniqueIps = new Set(data.map((d) => d.ipAddress)).size;
    const countries = data.reduce((acc, d) => {
      if (d.country) {
        acc[d.country] = (acc[d.country] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const devices = data.reduce((acc, d) => {
      const type = d.deviceType || "unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const browsers = data.reduce((acc, d) => {
      const browser = d.browser || "unknown";
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      link,
      clicks: data,
      stats: {
        totalClicks: data.length,
        uniqueVisitors: uniqueIps,
        countries,
        devices,
        browsers,
        vpnDetected: data.filter((d) => d.isVpn).length,
        proxyDetected: data.filter((d) => d.isProxy).length,
        torDetected: data.filter((d) => d.isTor).length,
      },
    });
  } catch (error) {
    console.error("Failed to get tracking data:", error);
    return NextResponse.json(
      { error: "Failed to get tracking data" },
      { status: 500 }
    );
  }
}

// POST: Record a click (called by the redirect page)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Get the link
    const [link] = await db
      .select()
      .from(trackingLinks)
      .where(eq(trackingLinks.code, code))
      .limit(1);

    if (!link) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    // Check if expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      await db
        .update(trackingLinks)
        .set({ status: "expired" })
        .where(eq(trackingLinks.id, link.id));
      
      return NextResponse.json(
        { error: "Link expired", destinationUrl: link.destinationUrl },
        { status: 410 }
      );
    }

    // Check if disabled
    if (link.status === "disabled") {
      return NextResponse.json(
        { error: "Link disabled", destinationUrl: link.destinationUrl },
        { status: 403 }
      );
    }

    // Get visitor info
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || request.headers.get("x-real-ip") 
      || "unknown";
    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";
    const language = request.headers.get("accept-language")?.split(",")[0] || "";

    // Parse user agent
    const deviceInfo = parseUserAgent(userAgent);

    // Get additional data from request body
    const body = await request.json().catch(() => ({}));
    const screenResolution = body.screenResolution || "";

    // Get IP info (need to get IPInfo token from settings)
    let ipInfo = {};
    if (link.userId) {
      const settings = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, link.userId))
        .limit(1);

      if (settings.length > 0 && settings[0].ipinfoToken) {
        ipInfo = await getIpInfo(ip, settings[0].ipinfoToken);
      }
    }

    // Record the click
    await db.insert(trackingData).values({
      trackingLinkId: link.id,
      ipAddress: ip,
      userAgent,
      referrer,
      language,
      screenResolution,
      ...deviceInfo,
      ...ipInfo,
    });

    // Update click count
    await db
      .update(trackingLinks)
      .set({
        clickCount: (link.clickCount || 0) + 1,
        lastClickAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(trackingLinks.id, link.id));

    return NextResponse.json({
      success: true,
      destinationUrl: link.destinationUrl,
    });
  } catch (error) {
    console.error("Failed to record click:", error);
    return NextResponse.json(
      { error: "Failed to record click" },
      { status: 500 }
    );
  }
}
