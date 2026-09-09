export type AIProviderType = 'openai' | 'gemini' | 'anthropic';

export type AssistantMode = 'normal' | 'coding' | 'aptitude' | 'explain';

export type RequestCategory =
  | 'programming'
  | 'debugging'
  | 'mathematics'
  | 'aptitude'
  | 'reasoning'
  | 'general_knowledge'
  | 'writing'
  | 'summarization'
  | 'current_information'
  | 'web_research';

export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProviderType;
  description: string;
  contextWindow?: number;
  recommendedFor?: RequestCategory[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  provider?: AIProviderType;
  model?: string;
  category?: RequestCategory;
  webSources?: WebSource[];
  isBestAnswer?: boolean;
  bestAnswerCandidates?: {
    model: string;
    provider: AIProviderType;
    summary: string;
  }[];
}

export interface WebSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface AIStreamChunk {
  text: string;
  done: boolean;
  error?: string;
  webSources?: WebSource[];
  category?: RequestCategory;
  modelUsed?: string;
  isBestAnswer?: boolean;
}

export interface GenerateOptions {
  model?: string;
  mode?: AssistantMode;
  temperature?: number;
  webSearch?: boolean;
  bestAnswer?: boolean;
  systemPrompt?: string;
  abortSignal?: AbortSignal;
}

export interface AIProvider {
  readonly type: AIProviderType;
  readonly name: string;
  getModels(): ModelInfo[];
  testConnection(apiKey: string): Promise<{ success: boolean; message: string }>;
  generate(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    options?: GenerateOptions
  ): Promise<{ text: string; modelUsed: string }>;
  stream(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    options: GenerateOptions,
    onChunk: (chunk: string) => void
  ): Promise<{ text: string; modelUsed: string }>;
}
