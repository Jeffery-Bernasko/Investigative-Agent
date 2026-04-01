import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (settings.length === 0) {
      return NextResponse.json({});
    }

    // Don't expose full API keys, just indicators
    const result = settings[0];
    return NextResponse.json({
      azureEndpoint: result.azureEndpoint || "",
      azureApiKey: result.azureApiKey ? "••••••••" + result.azureApiKey.slice(-4) : "",
      azureDeploymentName: result.azureDeploymentName || "",
      azureApiVersion: result.azureApiVersion || "2024-02-15-preview",
      openaiApiKey: result.openaiApiKey ? "••••••••" + result.openaiApiKey.slice(-4) : "",
      ollamaBaseUrl: result.ollamaBaseUrl || "",
      ollamaModel: result.ollamaModel || "",
      ollamaEmbeddingModel: result.ollamaEmbeddingModel || "",
      hunterApiKey: result.hunterApiKey ? "••••••••" + result.hunterApiKey.slice(-4) : "",
      shodanApiKey: result.shodanApiKey ? "••••••••" + result.shodanApiKey.slice(-4) : "",
      virusTotalApiKey: result.virusTotalApiKey ? "••••••••" + result.virusTotalApiKey.slice(-4) : "",
      hibpApiKey: result.hibpApiKey ? "••••••••" + result.hibpApiKey.slice(-4) : "",
      ipinfoToken: result.ipinfoToken ? "••••••••" + result.ipinfoToken.slice(-4) : "",
      defaultAiModel: result.defaultAiModel || "gpt-4",
      darkMode: result.darkMode ?? true,
      notifications: result.notifications ?? true,
      // Indicate which providers/keys are configured
      hasAzure: !!result.azureApiKey,
      hasOpenAI: !!result.openaiApiKey,
      hasOllama: !!result.ollamaBaseUrl,
      hasHunter: !!result.hunterApiKey,
      hasShodan: !!result.shodanApiKey,
      hasVirusTotal: !!result.virusTotalApiKey,
      hasHIBP: !!result.hibpApiKey,
      hasIPInfo: !!result.ipinfoToken,
    });
  } catch (error) {
    console.error("Failed to get settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await request.json();

    // Check if settings exist
    const existing = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Only update fields that are provided and not masked
    if (body.azureEndpoint !== undefined) updateData.azureEndpoint = body.azureEndpoint;
    if (body.azureApiKey && !body.azureApiKey.startsWith("••••")) updateData.azureApiKey = body.azureApiKey;
    if (body.azureDeploymentName !== undefined) updateData.azureDeploymentName = body.azureDeploymentName;
    if (body.azureApiVersion !== undefined) updateData.azureApiVersion = body.azureApiVersion;
    if (body.openaiApiKey && !body.openaiApiKey.startsWith("••••")) updateData.openaiApiKey = body.openaiApiKey;
    if (body.ollamaBaseUrl !== undefined) updateData.ollamaBaseUrl = body.ollamaBaseUrl;
    if (body.ollamaModel !== undefined) updateData.ollamaModel = body.ollamaModel;
    if (body.ollamaEmbeddingModel !== undefined) updateData.ollamaEmbeddingModel = body.ollamaEmbeddingModel;
    if (body.hunterApiKey && !body.hunterApiKey.startsWith("••••")) updateData.hunterApiKey = body.hunterApiKey;
    if (body.shodanApiKey && !body.shodanApiKey.startsWith("••••")) updateData.shodanApiKey = body.shodanApiKey;
    if (body.virusTotalApiKey && !body.virusTotalApiKey.startsWith("••••")) updateData.virusTotalApiKey = body.virusTotalApiKey;
    if (body.hibpApiKey && !body.hibpApiKey.startsWith("••••")) updateData.hibpApiKey = body.hibpApiKey;
    if (body.ipinfoToken && !body.ipinfoToken.startsWith("••••")) updateData.ipinfoToken = body.ipinfoToken;
    if (body.defaultAiModel !== undefined) updateData.defaultAiModel = body.defaultAiModel;
    if (body.darkMode !== undefined) updateData.darkMode = body.darkMode;
    if (body.notifications !== undefined) updateData.notifications = body.notifications;

    if (existing.length === 0) {
      await db.insert(userSettings).values({ userId, ...updateData });
    } else {
      await db.update(userSettings).set(updateData).where(eq(userSettings.userId, userId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
