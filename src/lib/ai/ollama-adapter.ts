export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionParams {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface EmbeddingParams {
  input: string;
}

/**
 * Ollama client that mimics OpenAI SDK interface
 */
export class OllamaClient {
  private baseUrl: string;
  private model: string;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl;
    this.model = config.model;
  }

  /**
   * Chat completions - mimics OpenAI's chat.completions.create()
   */
  chat = {
    completions: {
      create: async (params: ChatCompletionParams) => {
        try {
          const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(120_000), // 120s timeout for model cold-start
            body: JSON.stringify({
              model: this.model,
              messages: params.messages,
              stream: false,
              options: {
                temperature: params.temperature || 0.7,
                num_predict: params.max_tokens || 2048,
              },
            }),
          });

          if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.statusText}`);
          }

          const data = await response.json() as any;

          // Transform Ollama response to OpenAI format
          return {
            choices: [
              {
                message: {
                  content: data.message?.content || '',
                  role: 'assistant' as const,
                },
              },
            ],
          };
        } catch (error) {
          console.error('Ollama chat completion error:', error);
          throw error;
        }
      },
    },
  };

  /**
   * Embeddings - mimics OpenAI's embeddings.create()
   */
  embeddings = {
    create: async (params: EmbeddingParams) => {
      try {
        const response = await fetch(`${this.baseUrl}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(120_000), // 120s timeout
          body: JSON.stringify({
            model: this.model,
            prompt: params.input,
          }),
        });

        if (!response.ok) {
          throw new Error(`Ollama request failed: ${response.statusText}`);
        }

        const data = await response.json() as any;

        // Transform Ollama response to OpenAI format
        return {
          data: [
            {
              embedding: data.embedding || [],
            },
          ],
        };
      } catch (error) {
        console.error('Ollama embedding error:', error);
        throw error;
      }
    },
  };
}

/**
 * Factory function to create Ollama client
 */
export function createOllamaClient(config: OllamaConfig): OllamaClient {
  return new OllamaClient(config);
}