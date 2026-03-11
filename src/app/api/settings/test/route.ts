import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Create Azure OpenAI client using OpenAI SDK
function createAzureClient(endpoint: string, apiKey: string, deploymentName: string, apiVersion: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: `${endpoint}/openai/deployments/${deploymentName}`,
    defaultQuery: { "api-version": apiVersion },
    defaultHeaders: { "api-key": apiKey },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { service, settings } = await request.json();

    switch (service) {
      case "azure": {
        if (!settings.azureEndpoint || !settings.azureApiKey) {
          return NextResponse.json({ success: false, error: "Missing configuration" });
        }

        try {
          const apiKey = settings.azureApiKey.startsWith("••••") ? undefined : settings.azureApiKey;
          if (!apiKey) {
            return NextResponse.json({ success: false, error: "Please enter API key" });
          }

          const client = createAzureClient(
            settings.azureEndpoint,
            apiKey,
            settings.azureDeploymentName || "gpt-4",
            settings.azureApiVersion || "2024-02-15-preview"
          );

          const response = await client.chat.completions.create({
            model: "",
            messages: [{ role: "user", content: "Say 'test'" }],
            max_tokens: 5,
          });

          return NextResponse.json({
            success: !!response.choices[0]?.message?.content,
          });
        } catch (error) {
          console.error("Azure test failed:", error);
          return NextResponse.json({ success: false, error: "Connection failed" });
        }
      }

      case "openai": {
        if (!settings.openaiApiKey || settings.openaiApiKey.startsWith("••••")) {
          return NextResponse.json({ success: false, error: "Missing API key" });
        }

        try {
          const client = new OpenAI({ apiKey: settings.openaiApiKey });
          const response = await client.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: "Say 'test'" }],
            max_tokens: 5,
          });

          return NextResponse.json({
            success: !!response.choices[0]?.message?.content,
          });
        } catch (error) {
          console.error("OpenAI test failed:", error);
          return NextResponse.json({ success: false, error: "Connection failed" });
        }
      }

      case "hunter": {
        if (!settings.hunterApiKey || settings.hunterApiKey.startsWith("••••")) {
          return NextResponse.json({ success: false, error: "Missing API key" });
        }

        try {
          const response = await fetch(
            `https://api.hunter.io/v2/account?api_key=${settings.hunterApiKey}`
          );
          const data = await response.json();
          return NextResponse.json({ success: !data.errors });
        } catch (error) {
          console.error("Hunter test failed:", error);
          return NextResponse.json({ success: false, error: "Connection failed" });
        }
      }

      case "shodan": {
        if (!settings.shodanApiKey || settings.shodanApiKey.startsWith("••••")) {
          return NextResponse.json({ success: false, error: "Missing API key" });
        }

        try {
          const response = await fetch(
            `https://api.shodan.io/api-info?key=${settings.shodanApiKey}`
          );
          const data = await response.json();
          return NextResponse.json({ success: !data.error });
        } catch (error) {
          console.error("Shodan test failed:", error);
          return NextResponse.json({ success: false, error: "Connection failed" });
        }
      }

      case "virustotal": {
        if (!settings.virusTotalApiKey || settings.virusTotalApiKey.startsWith("••••")) {
          return NextResponse.json({ success: false, error: "Missing API key" });
        }

        try {
          const response = await fetch("https://www.virustotal.com/api/v3/users/current", {
            headers: { "x-apikey": settings.virusTotalApiKey },
          });
          return NextResponse.json({ success: response.ok });
        } catch (error) {
          console.error("VirusTotal test failed:", error);
          return NextResponse.json({ success: false, error: "Connection failed" });
        }
      }

      case "hibp": {
        if (!settings.hibpApiKey || settings.hibpApiKey.startsWith("••••")) {
          return NextResponse.json({ success: false, error: "Missing API key" });
        }

        try {
          const response = await fetch(
            "https://haveibeenpwned.com/api/v3/subscription/status",
            {
              headers: { "hibp-api-key": settings.hibpApiKey },
            }
          );
          return NextResponse.json({ success: response.ok });
        } catch (error) {
          console.error("HIBP test failed:", error);
          return NextResponse.json({ success: false, error: "Connection failed" });
        }
      }

      case "ipinfo": {
        if (!settings.ipinfoToken || settings.ipinfoToken.startsWith("••••")) {
          return NextResponse.json({ success: false, error: "Missing token" });
        }

        try {
          const response = await fetch(
            `https://ipinfo.io/8.8.8.8?token=${settings.ipinfoToken}`
          );
          const data = await response.json();
          return NextResponse.json({ success: !data.error });
        } catch (error) {
          console.error("IPInfo test failed:", error);
          return NextResponse.json({ success: false, error: "Connection failed" });
        }
      }

      default:
        return NextResponse.json({ success: false, error: "Unknown service" });
    }
  } catch (error) {
    console.error("Test connection failed:", error);
    return NextResponse.json({ success: false, error: "Internal error" });
  }
}
