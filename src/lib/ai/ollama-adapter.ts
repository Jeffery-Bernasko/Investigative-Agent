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
 * Ollama client that mimics OpenAI SDK interface.
 * 
 * - Uses keep_alive=30m to keep models loaded in memory between requests.
 * - Uses 300s timeout to handle model cold-loading on first request.
 * - Provides a warmup() method to pre-load the model.
 */
export class OllamaClient {
  private baseUrl: string;
  private model: string;

  // How long Ollama should keep the model in memory after each request
  private keepAlive = '30m';

  // Timeout for requests (300s allows for cold-start model loading)
  private requestTimeoutMs = 300_000;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl;
    this.model = config.model;
  }

  /**
   * Pre-load the model into memory so subsequent calls are fast (~1-2s).
   * Call this once at startup to avoid cold-start delays on the first real request.
   */
  async warmup(): Promise<void> {
    try {
      console.log(`🔥 Warming up Ollama model "${this.model}"...`);
      const start = Date.now();
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.requestTimeoutMs),
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'hi' }],
          stream: false,
          keep_alive: this.keepAlive,
          options: { num_predict: 1 }, // Generate only 1 token — we just want to trigger model loading
        }),
      });

      if (!response.ok) {
        console.warn(`⚠️ Ollama warmup returned ${response.status}: ${response.statusText}`);
        return;
      }

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`✅ Ollama model "${this.model}" warm and ready (${elapsed}s)`);
    } catch (error) {
      console.warn(
        '⚠️ Ollama warmup failed (model may cold-start on first request):',
        error instanceof Error ? error.message : error
      );
    }
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
            signal: AbortSignal.timeout(this.requestTimeoutMs),
            body: JSON.stringify({
              model: this.model,
              messages: params.messages,
              stream: false,
              format: 'json',
              keep_alive: this.keepAlive,
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
          signal: AbortSignal.timeout(this.requestTimeoutMs),
          body: JSON.stringify({
            model: this.model,
            prompt: params.input,
            keep_alive: this.keepAlive,
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