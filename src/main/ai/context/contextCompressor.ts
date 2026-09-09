import { ChatMessage } from '../../../types/ai';
import { ProviderRegistry } from '../providers/providerRegistry';

export class ContextCompressor {
  private static readonly MAX_UNCOMPRESSED_MESSAGES = 14;
  private static readonly RECENT_MESSAGES_TO_KEEP = 6;

  /**
   * Evaluates if conversation exceeds context threshold and compresses older messages
   */
  public static async prepareContext(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<{ role: 'user' | 'assistant' | 'system'; content: string }[]> {
    if (messages.length <= this.MAX_UNCOMPRESSED_MESSAGES) {
      const formatted = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      if (systemPrompt) {
        formatted.unshift({ role: 'system', content: systemPrompt });
      }
      return formatted;
    }

    // Compress older messages, keep the most recent N
    const olderMessages = messages.slice(0, messages.length - this.RECENT_MESSAGES_TO_KEEP);
    const recentMessages = messages.slice(messages.length - this.RECENT_MESSAGES_TO_KEEP);

    const summaryText = await this.summarizeHistory(olderMessages);

    const compressedContext: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
      {
        role: 'system',
        content: `${systemPrompt ? systemPrompt + '\n\n' : ''}[PREVIOUS CONVERSATION SUMMARY & PRESERVED REQUIREMENTS]:\n${summaryText}`,
      },
      ...recentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    return compressedContext;
  }

  private static async summarizeHistory(messages: ChatMessage[]): Promise<string> {
    const formattedTranscript = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const prompt = `Please compress and summarize the following past conversation turns concisely.
RULES:
1. Preserve all core requirements, constraints, and preferences mentioned by the user.
2. Preserve any important code snippets, file names, or function signatures.
3. Preserve any unresolved questions or active topics.
4. Omit pleasantries, redundant chit-chat, and intermediate chatter.

Transcript to summarize:
${formattedTranscript}`;

    try {
      const registry = ProviderRegistry.getInstance();
      const configured = registry.getConfiguredProviders();
      if (configured.length > 0) {
        const provider = registry.getProvider(configured[0]);
        const res = await provider.generate([{ role: 'user', content: prompt }], {
          temperature: 0.2,
        });
        return res.text;
      }
    } catch (err) {
      console.warn('AI context compression failed, falling back to heuristic summary:', err);
    }

    // Heuristic fallback if AI generation fails or no keys yet
    return messages
      .slice(-4)
      .map((m) => `${m.role}: ${m.content.slice(0, 150)}...`)
      .join('\n');
  }
}
