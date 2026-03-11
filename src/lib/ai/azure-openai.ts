import OpenAI from "openai";

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  apiVersion?: string;
}

// Create Azure OpenAI client using the OpenAI SDK with Azure configuration
export function createAzureOpenAIClient(config: AzureOpenAIConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: `${config.endpoint}/openai/deployments/${config.deploymentName}`,
    defaultQuery: { "api-version": config.apiVersion || "2024-02-15-preview" },
    defaultHeaders: { "api-key": config.apiKey },
  });
}

export async function generateChatCompletion(
  client: OpenAI,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
) {
  const response = await client.chat.completions.create({
    model: "", // Model is already in the baseURL for Azure
    messages,
    max_tokens: options?.maxTokens || 2048,
    temperature: options?.temperature || 0.7,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateEmbedding(
  client: OpenAI,
  text: string
): Promise<number[]> {
  const response = await client.embeddings.create({
    model: "", // Model is already in the baseURL for Azure
    input: text,
  });

  return response.data[0]?.embedding || [];
}

// OpenAI Direct (fallback when Azure is not configured)
export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

export async function generateOpenAIChatCompletion(
  client: OpenAI,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
) {
  const response = await client.chat.completions.create({
    model: options?.model || "gpt-4",
    messages,
    max_tokens: options?.maxTokens || 2048,
    temperature: options?.temperature || 0.7,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateOpenAIEmbedding(
  client: OpenAI,
  text: string
): Promise<number[]> {
  const response = await client.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });

  return response.data[0]?.embedding || [];
}
