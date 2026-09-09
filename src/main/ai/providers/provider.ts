import {
  AIProvider,
  AIProviderType,
  ModelInfo,
  GenerateOptions,
} from '../../../types/ai';

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly type: AIProviderType;
  abstract readonly name: string;

  abstract getModels(): ModelInfo[];

  abstract testConnection(apiKey: string): Promise<{ success: boolean; message: string }>;

  abstract generate(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    options?: GenerateOptions
  ): Promise<{ text: string; modelUsed: string }>;

  abstract stream(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    options: GenerateOptions,
    onChunk: (chunk: string) => void
  ): Promise<{ text: string; modelUsed: string }>;

  protected sanitizeError(err: unknown): string {
    if (!err) return 'Unknown error occurred';
    const message = err instanceof Error ? err.message : String(err);

    // Hide any API key patterns if accidentally leaked in stack or message
    return message
      .replace(/sk-[a-zA-Z0-9_-]{20,}/g, 'sk-***')
      .replace(/AIza[a-zA-Z0-9_-]{30,}/g, 'AIza***')
      .replace(/x-api-key:[^\s,]+/gi, 'x-api-key: [REDACTED]');
  }
}
