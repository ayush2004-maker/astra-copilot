import { AIProviderType, AIStreamChunk } from '../../../types/ai';
import { ProviderRegistry } from '../providers/providerRegistry';

export interface BestAnswerCandidate {
  provider: AIProviderType;
  model: string;
  response: string;
}

export class BestAnswerJudge {
  /**
   * Executes multi-model parallel query and judge synthesis
   */
  public static async synthesizeBestAnswer(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    onStatusUpdate?: (status: string) => void
  ): Promise<{ text: string; candidates: BestAnswerCandidate[]; judgeModel: string }> {
    const registry = ProviderRegistry.getInstance();
    const configuredProviders = registry.getConfiguredProviders();

    if (configuredProviders.length === 0) {
      throw new Error('No AI providers are configured. Please enter API keys in Settings.');
    }

    // Pick candidate models to query (up to 3 providers)
    const queryTargets: { provider: AIProviderType; model: string }[] = [];
    if (configuredProviders.includes('gemini')) {
      queryTargets.push({ provider: 'gemini', model: 'gemini-3.6-flash' });
    }
    if (configuredProviders.includes('openai')) {
      queryTargets.push({ provider: 'openai', model: 'gpt-4o-mini' });
    }
    if (configuredProviders.includes('anthropic')) {
      queryTargets.push({ provider: 'anthropic', model: 'claude-3-5-haiku-20241022' });
    }

    // If only 1 provider is configured, query two different models from it if available
    if (queryTargets.length === 1) {
      const p = queryTargets[0].provider;
      const allModels = registry.getProvider(p).getModels();
      if (allModels.length > 1) {
        queryTargets.push({ provider: p, model: allModels[1].id });
      }
    }

    onStatusUpdate?.(`Querying ${queryTargets.length} models concurrently for Best Answer evaluation...`);

    // Run parallel generations
    const candidatePromises = queryTargets.map(async (target) => {
      try {
        const provider = registry.getProvider(target.provider);
        const res = await provider.generate(messages, { model: target.model });
        return {
          provider: target.provider,
          model: target.model,
          response: res.text,
        } as BestAnswerCandidate;
      } catch (err) {
        console.warn(`Candidate model ${target.model} failed:`, err);
        return null;
      }
    });

    const candidateResults = (await Promise.all(candidatePromises)).filter(
      (c): c is BestAnswerCandidate => c !== null && c.response.trim().length > 0
    );

    if (candidateResults.length === 0) {
      throw new Error('All candidate models failed to generate responses.');
    }

    // If only one candidate succeeded, return it directly
    if (candidateResults.length === 1) {
      return {
        text: candidateResults[0].response,
        candidates: candidateResults,
        judgeModel: candidateResults[0].model,
      };
    }

    onStatusUpdate?.(`Synthesizing and auditing consensus across ${candidateResults.length} responses...`);

    // Choose the most capable available model as Judge
    let judgeTarget: { provider: AIProviderType; model: string } = queryTargets[0];
    if (configuredProviders.includes('anthropic')) {
      judgeTarget = { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' };
    } else if (configuredProviders.includes('openai')) {
      judgeTarget = { provider: 'openai', model: 'gpt-4o' };
    } else {
      judgeTarget = { provider: 'gemini', model: 'gemini-2.5-pro' };
    }

    const judgePrompt = `You are the Astra Copilot Chief Truth & Accuracy Judge.
You have been provided with candidate answers from multiple independent AI models for the user's inquiry:

"${messages[messages.length - 1].content}"

Below are the candidate responses:
${candidateResults
  .map(
    (c, i) => `--- CANDIDATE #${i + 1} (${c.provider} - ${c.model}) ---
${c.response}
`
  )
  .join('\n')}

YOUR INSTRUCTIONS:
1. Thoroughly compare the candidate responses.
2. Identify any contradictions, calculation errors, hallucinations, or vague claims.
3. DO NOT claim an answer is correct merely because multiple models agree; consensus does not guarantee truth.
4. Synthesize ONE concise, comprehensive, highly accurate final answer.
5. Clearly distinguish verified facts from areas of uncertainty or differing interpretations.
6. Present the final answer directly and cleanly, with a brief "Consensus & Audit Note" at the very end summarizing agreements or contradictions found across the candidate models.`;

    const judgeProvider = registry.getProvider(judgeTarget.provider);
    const synthesis = await judgeProvider.generate(
      [{ role: 'user', content: judgePrompt }],
      { model: judgeTarget.model, temperature: 0.2 }
    );

    return {
      text: synthesis.text,
      candidates: candidateResults,
      judgeModel: `${judgeTarget.model} (Judge)`,
    };
  }
}
