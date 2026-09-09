import { BaseAIProvider } from './provider';
import { AIProviderType, ModelInfo, GenerateOptions } from '../../../types/ai';
import { CredentialStorage } from '../../security/credentialStorage';

export class OpenAIProvider extends BaseAIProvider {
  readonly type: AIProviderType = 'openai';
  readonly name = 'OpenAI';

  getModels(): ModelInfo[] {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        description: 'Flagship omni model. Fast, intelligent across coding and reasoning.',
        contextWindow: 128000,
        recommendedFor: ['programming', 'debugging', 'reasoning', 'general_knowledge'],
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'Fast, cost-efficient model ideal for quick answers, summarization and translations.',
        contextWindow: 128000,
        recommendedFor: ['summarization', 'writing', 'general_knowledge'],
      },
      {
        id: 'o1',
        name: 'o1',
        provider: 'openai',
        description: 'Deep reasoning model specialized in complex mathematics, logic and science.',
        contextWindow: 200000,
        recommendedFor: ['mathematics', 'aptitude', 'reasoning'],
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        provider: 'openai',
        description: 'High intelligence reasoning model optimized for code and math.',
        contextWindow: 200000,
        recommendedFor: ['programming', 'mathematics'],
      },
    ];
  }

  private getApiKey(): string {
    const key = CredentialStorage.getInstance().getApiKey('openai');
    if (!key) {
      throw new Error('OpenAI API key not configured. Please add your key in Settings.');
    }
    return key;
  }

  async testConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = (errorData as any)?.error?.message || response.statusText;
        return { success: false, message: `OpenAI connection failed (${response.status}): ${msg}` };
      }

      return { success: true, message: 'Successfully connected to OpenAI API' };
    } catch (err) {
      return { success: false, message: `Network error: ${this.sanitizeError(err)}` };
    }
  }

  async generate(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    options?: GenerateOptions
  ): Promise<{ text: string; modelUsed: string }> {
    const apiKey = this.getApiKey();
    const model = options?.model || 'gpt-4o';

    const formattedMessages = [...messages];
    if (options?.systemPrompt && !formattedMessages.some((m) => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: options.systemPrompt });
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature: options?.temperature ?? 0.7,
        }),
        signal: options?.abortSignal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error((errJson as any)?.error?.message || `HTTP ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      const text = data.choices?.[0]?.message?.content || '';
      return { text, modelUsed: model };
    } catch (err) {
      throw new Error(this.sanitizeError(err));
    }
  }

  async stream(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    options: GenerateOptions,
    onChunk: (chunk: string) => void
  ): Promise<{ text: string; modelUsed: string }> {
    const apiKey = this.getApiKey();
    const model = options?.model || 'gpt-4o';

    const formattedMessages = [...messages];
    if (options?.systemPrompt && !formattedMessages.some((m) => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: options.systemPrompt });
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature: options?.temperature ?? 0.7,
          stream: true,
        }),
        signal: options?.abortSignal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error((errJson as any)?.error?.message || `HTTP ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          if (trimmed === 'data: [DONE]') continue;

          try {
            const json = JSON.parse(trimmed.replace(/^data:\s*/, ''));
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              onChunk(delta);
            }
          } catch {}
        }
      }

      return { text: fullText, modelUsed: model };
    } catch (err) {
      throw new Error(this.sanitizeError(err));
    }
  }
}
