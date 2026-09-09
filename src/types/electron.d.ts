import {
  AIProviderType,
  AssistantMode,
  ChatMessage,
  AIStreamChunk,
  ModelInfo,
} from './ai';
import { AppSettings, ConversationMeta, ProviderKeyStatus } from './settings';
import { CapturedTextResult, OCRProgress } from './capture';

export interface AstraAPI {
  // Window management
  minimizeToBubble: () => Promise<void>;
  expandToChat: () => Promise<void>;
  toggleWindow: () => Promise<void>;
  closeApp: () => Promise<void>;
  isExpanded: () => Promise<boolean>;
  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>;
  saveBubblePosition: (x: number, y: number) => Promise<void>;

  // Settings & Secure Keys
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getKeyStatus: () => Promise<ProviderKeyStatus>;
  setApiKey: (provider: AIProviderType, apiKey: string) => Promise<boolean>;
  testApiKey: (provider: AIProviderType, apiKey?: string) => Promise<{ success: boolean; message: string }>;
  deleteApiKey: (provider: AIProviderType) => Promise<boolean>;

  // Model & Provider Queries
  getAvailableModels: () => Promise<ModelInfo[]>;

  // Conversations
  getConversations: () => Promise<ConversationMeta[]>;
  getConversationMessages: (conversationId: string) => Promise<ChatMessage[]>;
  createConversation: (initialTitle?: string) => Promise<string>;
  renameConversation: (id: string, newTitle: string) => Promise<boolean>;
  deleteConversation: (id: string) => Promise<boolean>;
  clearAllConversations: () => Promise<boolean>;
  exportConversation: (id: string, format: 'json' | 'markdown') => Promise<string>;

  // Chat & Streaming
  sendMessage: (payload: {
    conversationId: string;
    prompt: string;
    mode?: AssistantMode;
    model?: string;
    webSearch?: boolean;
    bestAnswer?: boolean;
  }) => Promise<void>;
  stopGeneration: () => Promise<void>;
  onStreamChunk: (callback: (chunk: AIStreamChunk) => void) => () => void;

  // Capture & OCR
  triggerActiveTextCapture: () => Promise<CapturedTextResult | null>;
  triggerScreenOCR: () => Promise<CapturedTextResult | null>;
  onTextCaptured: (callback: (data: CapturedTextResult) => void) => () => void;
  onOCRProgress: (callback: (progress: OCRProgress) => void) => () => void;

  // Utilities
  openExternal: (url: string) => Promise<void>;
  copyToClipboard: (text: string) => Promise<void>;
}

declare global {
  interface Window {
    astraAPI: AstraAPI;
  }
}
