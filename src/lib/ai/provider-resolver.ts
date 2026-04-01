import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createAzureOpenAIClient,
  createOpenAIClient,
  type AzureOpenAIConfig,
} from "./azure-openai";
import { createOllamaClient } from "./ollama-adapter";

// ── Shared interface all providers must satisfy ──────────────────────────────

export interface LLMClient {
  chat: {
    completions: {
      create(params: {
        messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
        temperature?: number;
        max_tokens?: number;
      }): Promise<{ choices: Array<{ message: { content: string } }> }>;
    };
  };
  embeddings: {
    create(params: { input: string }): Promise<{ data: Array<{ embedding: number[] }> }>;
  };
}

// ── Thin adapters that wrap the OpenAI SDK client to satisfy LLMClient ───────

class AzureLLMClient implements LLMClient {
  private client: ReturnType<typeof createAzureOpenAIClient>;

  constructor(config: AzureOpenAIConfig) {
    this.client = createAzureOpenAIClient(config);
  }

  chat = {
    completions: {
      create: async (params: {
        messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
        temperature?: number;
        max_tokens?: number;
      }) => {
        const res = await this.client.chat.completions.create({
          model: "",
          messages: params.messages,
          max_tokens: params.max_tokens ?? 2048,
          temperature: params.temperature ?? 0.7,
        });
        return {
          choices: res.choices.map((c) => ({
            message: { content: c.message.content ?? "" },
          })),
        };
      },
    },
  };

  embeddings = {
    create: async (params: { input: string }) => {
      const res = await this.client.embeddings.create({ model: "", input: params.input });
      return { data: res.data.map((d) => ({ embedding: d.embedding })) };
    },
  };
}

class OpenAILLMClient implements LLMClient {
  private client: ReturnType<typeof createOpenAIClient>;
  private model: string;

  constructor(apiKey: string, model = "gpt-4") {
    this.client = createOpenAIClient(apiKey);
    this.model = model;
  }

  chat = {
    completions: {
      create: async (params: {
        messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
        temperature?: number;
        max_tokens?: number;
      }) => {
        const res = await this.client.chat.completions.create({
          model: this.model,
          messages: params.messages,
          max_tokens: params.max_tokens ?? 2048,
          temperature: params.temperature ?? 0.7,
        });
        return {
          choices: res.choices.map((c) => ({
            message: { content: c.message.content ?? "" },
          })),
        };
      },
    },
  };

  embeddings = {
    create: async (params: { input: string }) => {
      const res = await this.client.embeddings.create({
        model: "text-embedding-ada-002",
        input: params.input,
      });
      return { data: res.data.map((d) => ({ embedding: d.embedding })) };
    },
  };
}

// ── Provider resolver ────────────────────────────────────────────────────────

/**
 * Resolves the best available LLM provider for the given user.
 *
 * Resolution order:
 *  1. Azure OpenAI — if endpoint + apiKey + deploymentName are all configured
 *  2. OpenAI direct — if openaiApiKey is configured
 *  3. Ollama — user's configured baseUrl/model, or env var fallback
 *
 * Throws if no provider can be resolved.
 */
export async function resolveProvider(userId: string): Promise<LLMClient> {
  // Load user settings
  let settings: typeof userSettings.$inferSelect | null = null;
  try {
    const rows = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    settings = rows[0] ?? null;
  } catch {
    // DB lookup failed — fall through to env fallback
  }

  // 1. Azure OpenAI
  if (
    settings?.azureEndpoint &&
    settings?.azureApiKey &&
    settings?.azureDeploymentName
  ) {
    return new AzureLLMClient({
      endpoint: settings.azureEndpoint,
      apiKey: settings.azureApiKey,
      deploymentName: settings.azureDeploymentName,
      apiVersion: settings.azureApiVersion ?? "2024-02-15-preview",
    });
  }

  // 2. OpenAI direct
  if (settings?.openaiApiKey) {
    return new OpenAILLMClient(
      settings.openaiApiKey,
      settings.defaultAiModel ?? "gpt-4"
    );
  }

  // 3. Ollama (user settings → env fallback)
  const ollamaBaseUrl =
    settings?.ollamaBaseUrl ?? process.env.OLLAMA_BASE_URL ?? "";
  const ollamaModel =
    settings?.ollamaModel ?? process.env.OLLAMA_MODEL ?? "mistral";

  if (ollamaBaseUrl) {
    return createOllamaClient({ baseUrl: ollamaBaseUrl, model: ollamaModel });
  }

  throw new Error(
    "No AI provider configured. Add Azure OpenAI, OpenAI, or Ollama credentials in Settings."
  );
}
