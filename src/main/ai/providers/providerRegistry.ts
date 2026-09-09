import { AIProvider, AIProviderType, ModelInfo } from '../../../types/ai';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';
import { AnthropicProvider } from './anthropic';
import { CredentialStorage } from '../../security/credentialStorage';

export class ProviderRegistry {
  private static instance: ProviderRegistry | null = null;
  private providers: Map<AIProviderType, AIProvider> = new Map();

  private constructor() {
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('anthropic', new AnthropicProvider());
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public getProvider(type: AIProviderType): AIProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Provider "${type}" is not supported`);
    }
    return provider;
  }

  public getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  public getAllModels(): ModelInfo[] {
    const models: ModelInfo[] = [];
    for (const provider of this.providers.values()) {
      models.push(...provider.getModels());
    }
    return models;
  }

  public getConfiguredProviders(): AIProviderType[] {
    const keyStatus = CredentialStorage.getInstance().getKeyStatus();
    const configured: AIProviderType[] = [];
    if (keyStatus.openai) configured.push('openai');
    if (keyStatus.gemini) configured.push('gemini');
    if (keyStatus.anthropic) configured.push('anthropic');
    return configured;
  }
}
