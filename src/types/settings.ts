import { AIProviderType } from './ai';

export type ThemeMode = 'dark' | 'light' | 'system';
export type WindowSizePreset = 'compact' | 'standard' | 'spacious';

export interface AppSettings {
  // AI Providers & Models
  defaultProvider: AIProviderType;
  defaultModel: string;
  bestAnswerMode: boolean;
  webSearchEnabled: boolean;
  temperature: number;

  // Appearance
  theme: ThemeMode;
  assistantIcon: 'nebula' | 'orbit' | 'sparkle' | 'minimal';
  windowOpacity: number;
  windowSizePreset: WindowSizePreset;

  // Behavior
  alwaysOnTop: boolean;
  startWithWindows: boolean;
  globalShortcut: string;
  assistantPosition: { x: number; y: number } | null;
  autoOpenAfterCapture: boolean;

  // Privacy & Data
  rememberConversations: boolean;
  autoDeleteTemporaryScreenshots: boolean;
  allowOCR: boolean;
  telemetry: boolean;
}

export interface ProviderKeyStatus {
  openai: boolean;
  gemini: boolean;
  anthropic: boolean;
}

export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  preview: string;
}
