import { BaseAIProvider } from './provider';
import { AIProviderType, ModelInfo, GenerateOptions } from '../../../types/ai';
import { CredentialStorage } from '../../security/credentialStorage';

export class GeminiProvider extends BaseAIProvider {
  readonly type: AIProviderType = 'gemini';
  readonly name = 'Google Gemini';

  getModels(): ModelInfo[] {
    return [
      {
        id: 'gemini-3.6-flash',
        name: 'Gemini 3.6 Flash',
        provider: 'gemini',
        description: 'Next-gen multimodal, ultra-fast model with state-of-the-art efficiency.',
        contextWindow: 1000000,
        recommendedFor: ['programming', 'summarization', 'general_knowledge', 'web_research'],
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'gemini',
        description: 'High capability model for deep multi-step reasoning, coding and mathematical proofs.',
        contextWindow: 2000000,
        recommendedFor: ['reasoning', 'mathematics', 'aptitude', 'debugging'],
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'gemini',
        description: 'Lightweight, high-speed model with broad general knowledge.',
        contextWindow: 1000000,
        recommendedFor: ['summarization', 'writing', 'general_knowledge'],
      },
    ];
  }

  private getApiKey(): string {
    const key = CredentialStorage.getInstance().getApiKey('gemini');
    if (!key) {
      throw new Error('Google Gemini API key not configured. Please add your key in Settings.');
    }
    return key;
  }

  async testConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const msg = (errJson as any)?.error?.message || response.statusText;
        return { success: false, message: `Gemini connection failed (${response.status}): ${msg}` };
      }

      return { success: true, message: 'Successfully connected to Google Gemini API' };
    } catch (err) {
      return { success: false, message: `Network error: ${this.sanitizeError(err)}` };
    }
  }

  private formatContents(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]) {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
  }

  async generate(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    options?: GenerateOptions
  ): Promise<{ text: string; modelUsed: string }> {
    const apiKey = this.getApiKey();
    const model = options?.model || 'gemini-3.6-flash';
    const contents = this.formatContents(messages);

    const body: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
      },
    };

    const sysMsg = messages.find((m) => m.role === 'system') || (options?.systemPrompt ? { content: options.systemPrompt } : null);
    if (sysMsg) {
      body.systemInstruction = {
        parts: [{ text: sysMsg.content }],
      };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: options?.abortSignal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error((errJson as any)?.error?.message || `HTTP ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
    const model = options?.model || 'gemini-3.6-flash';
    const contents = this.formatContents(messages);

    const body: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
      },
    };

    const sysMsg = messages.find((m) => m.role === 'system') || (options?.systemPrompt ? { content: options.systemPrompt } : null);
    if (sysMsg) {
      body.systemInstruction = {
        parts: [{ text: sysMsg.content }],
      };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      const processLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) return;

        const payload = trimmed.replace(/^data:\s*/, '');
        if (payload === '[DONE]') return;

        const json = JSON.parse(payload) as any;
        const partText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (partText) {
          fullText += partText;
          onChunk(partText);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          try {
            processLine(line);
          } catch {}
        }
      }

      if (buffer.trim()) {
        try {
          processLine(buffer);
        } catch {}
      }

      if (!fullText.trim()) {
        const fallback = await this.generate(messages, options);
        if (fallback.text.trim()) {
          onChunk(fallback.text);
          return fallback;
        }
        throw new Error('Gemini returned an empty response');
      }

      return { text: fullText, modelUsed: model };
    } catch (err) {
      throw new Error(this.sanitizeError(err));
    }
  }
}
