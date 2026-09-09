import { RequestCategory, AIProviderType } from '../../../types/ai';
import { ProviderRegistry } from '../providers/providerRegistry';

export class ModelRouter {
  /**
   * Classifies user prompt into one of the specialized categories using deterministic pattern analysis & heuristics
   */
  public static classifyPrompt(prompt: string): RequestCategory {
    const text = prompt.toLowerCase();

    // 1. Current information / Web research
    const currentInfoKeywords = [
      'today', 'yesterday', 'current news', 'latest update', 'stock price', 'weather today',
      'recent news', 'who won the', 'current score', 'what happened in 202', 'release date of'
    ];
    if (currentInfoKeywords.some((kw) => text.includes(kw))) {
      return 'current_information';
    }

    // 2. Debugging
    const debugKeywords = [
      'traceback', 'syntaxerror', 'typeerror', 'referenceerror', 'nullpointerexception',
      'uncaught', 'exception in thread', 'fix this error', 'why is this failing', 'bug in',
      'segmentation fault', 'stack trace', 'build failure', 'panic:', 'undefined is not a function'
    ];
    if (debugKeywords.some((kw) => text.includes(kw))) {
      return 'debugging';
    }

    // 3. Programming / Code
    const programmingKeywords = [
      'function', 'class ', 'def ', 'const ', 'async ', 'import ', 'return ',
      'react', 'typescript', 'python', 'java', 'c++', 'html', 'css', 'sql',
      'algorithm', 'refactor', 'api endpoint', 'component', 'regex', 'database query',
      'write a script', 'write a program', 'implement'
    ];
    if (programmingKeywords.some((kw) => text.includes(kw)) || prompt.includes('```')) {
      return 'programming';
    }

    // 4. Aptitude (competitive / quantitative questions)
    const aptitudeKeywords = [
      'profit and loss', 'time and work', 'speed and distance', 'train passes', 'train',
      'km/h', 'mph', 'upstream', 'downstream', 'cistern', 'pipes and cistern',
      'permutations and combinations', 'probability of', 'probability that', 'ratio of',
      'simple interest', 'compound interest', 'work done by', 'cost price', 'selling price',
      'marked price', 'discount of'
    ];
    if (aptitudeKeywords.some((kw) => text.includes(kw))) {
      return 'aptitude';
    }

    // 5. Mathematics
    const mathKeywords = [
      'solve for x', 'integral', 'derivative', 'eigenvalue', 'matrix', 'quadratic',
      'calculate', 'evaluate the expression', 'formula for', 'pythagorean', 'sum of angles',
      'polynomial', 'logarithm', 'limit as x approaches'
    ];
    if (mathKeywords.some((kw) => text.includes(kw)) || /[\d\s\+\-\*\/\^\(\)=]{5,}/.test(prompt)) {
      return 'mathematics';
    }

    // 6. Summarization
    const summaryKeywords = [
      'summarize', 'summary of', 'tldr', 'key takeaways', 'bullet points', 'briefly describe'
    ];
    if (summaryKeywords.some((kw) => text.includes(kw))) {
      return 'summarization';
    }

    // 7. Writing
    const writingKeywords = [
      'write an email', 'write an essay', 'draft a message', 'cover letter', 'proofread',
      'rewrite this', 'improve tone', 'write a story', 'poem', 'blog post'
    ];
    if (writingKeywords.some((kw) => text.includes(kw))) {
      return 'writing';
    }

    // 8. Reasoning / Logic
    const reasoningKeywords = [
      'analyze', 'compare and contrast', 'pros and cons', 'why does', 'implications of',
      'deduce', 'syllogism', 'puzzle', 'riddle', 'fallacy'
    ];
    if (reasoningKeywords.some((kw) => text.includes(kw))) {
      return 'reasoning';
    }

    return 'general_knowledge';
  }

  /**
   * Selects optimal model and provider based on request classification and configured provider keys
   */
  public static routeModel(
    category: RequestCategory,
    userPreferredModel?: string
  ): { provider: AIProviderType; model: string } {
    const registry = ProviderRegistry.getInstance();
    const configuredProviders = registry.getConfiguredProviders();

    if (configuredProviders.length === 0) {
      // Return default fallback even if key is missing (will trigger prompt for key)
      return { provider: 'gemini', model: 'gemini-3.6-flash' };
    }

    // If user explicitly picked a model and its provider has a configured key
    if (userPreferredModel) {
      const allModels = registry.getAllModels();
      const matched = allModels.find((m) => m.id === userPreferredModel);
      if (matched && configuredProviders.includes(matched.provider)) {
        return { provider: matched.provider, model: matched.id };
      }
    }

    // Optimal routing table based on category
    switch (category) {
      case 'programming':
      case 'debugging':
        if (configuredProviders.includes('anthropic')) {
          return { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' };
        }
        if (configuredProviders.includes('openai')) {
          return { provider: 'openai', model: 'gpt-4o' };
        }
        return { provider: 'gemini', model: 'gemini-2.5-pro' };

      case 'mathematics':
      case 'aptitude':
      case 'reasoning':
        if (configuredProviders.includes('openai')) {
          return { provider: 'openai', model: 'o1' };
        }
        if (configuredProviders.includes('gemini')) {
          return { provider: 'gemini', model: 'gemini-2.5-pro' };
        }
        return { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' };

      case 'current_information':
      case 'web_research':
      case 'summarization':
        if (configuredProviders.includes('gemini')) {
          return { provider: 'gemini', model: 'gemini-3.6-flash' };
        }
        if (configuredProviders.includes('openai')) {
          return { provider: 'openai', model: 'gpt-4o-mini' };
        }
        return { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' };

      case 'writing':
        if (configuredProviders.includes('anthropic')) {
          return { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' };
        }
        if (configuredProviders.includes('openai')) {
          return { provider: 'openai', model: 'gpt-4o' };
        }
        return { provider: 'gemini', model: 'gemini-3.6-flash' };

      default:
        // First configured provider with their balanced model
        const primary = configuredProviders[0];
        if (primary === 'gemini') return { provider: 'gemini', model: 'gemini-3.6-flash' };
        if (primary === 'openai') return { provider: 'openai', model: 'gpt-4o' };
        return { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' };
    }
  }
}
