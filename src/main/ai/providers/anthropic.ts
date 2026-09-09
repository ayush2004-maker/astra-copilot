import { BaseAIProvider } from './provider';
import { AIProviderType, ModelInfo, GenerateOptions } from '../../../types/ai';
import { CredentialStorage } from '../../security/credentialStorage';

export class AnthropicProvider extends BaseAIProvider {
  readonly type: AIProviderType = 'anthropic';
  readonly name = 'Anthropic Claude';

  getModels(): ModelInfo[] {
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        description: 'Industry-leading intelligence for complex coding, architectural design and nuanced writing.',
        contextWindow: 200000,
        recommendedFor: ['programming', 'debugging', 'writing', 'reasoning'],
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        description: 'Next-generation fast model with incredible speed and agility.',
        contextWindow: 200000,
        recommendedFor: ['summarization', 'general_knowledge', 'writing'],
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        description: 'Deep reasoning model for highly complex synthesis and quantitative analysis.',
        contextWindow: 200000,
        recommendedFor: ['mathematics', 'reasoning', 'aptitude'],
      },
    ];
  }

  private getApiKey(): string {
    const key = CredentialStorage.getInstance().getApiKey('anthropic');
    if (!key) {
      throw new Error('Anthropic Claude API key not configured. Please add your key in Settings.');
    }
    return key;
  }

  async testConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const msg = (errJson as any)?.error?.message || response.statusText;
        return { success: false, message: `Anthropic connection failed (${response.status}): ${msg}` };
      }

      return { success: true, message: 'Successfully connected to Anthropic API' };
    } catch (err) {
      return { success: false, message: `Network error: ${this.sanitizeError(err)}` };
    }
  }

  private formatMessages(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]) {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));
  }

  async generate(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    options?: GenerateOptions
  ): Promise<{ text: string; modelUsed: string }> {
    const apiKey = this.getApiKey();
    const model = options?.model || 'claude-3-5-sonnet-20241022';
    const formatted = this.formatMessages(messages);
    const systemPrompt = options?.systemPrompt || messages.find((m) => m.role === 'system')?.content;

    try {
      const body: any = {
        model,
        max_tokens: 4096,
        messages: formatted,
        temperature: options?.temperature ?? 0.7,
      };
      if (systemPrompt) {
        body.system = systemPrompt;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: options?.abortSignal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error((errJson as any)?.error?.message || `HTTP ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      const text = data.content?.[0]?.text || '';
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
    const model = options?.model || 'claude-3-5-sonnet-20241022';
    const formatted = this.formatMessages(messages);
    const systemPrompt = options?.systemPrompt || messages.find((m) => m.role === 'system')?.content;

    try {
      const body: any = {
        model,
        max_tokens: 4096,
        messages: formatted,
        temperature: options?.temperature ?? 0.7,
        stream: true,
      };
      if (systemPrompt) {
        body.system = systemPrompt;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
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

          try {
            const json = JSON.parse(trimmed.replace(/^data:\s*/, ''));
            if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
              const delta = json.delta.text || '';
              if (delta) {
                fullText += delta;
                onChunk(delta);
              }
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
