import { contextBridge, ipcRenderer } from 'electron';
import { AstraAPI } from '../types/electron';
import { AIProviderType, AssistantMode, AIStreamChunk } from '../types/ai';
import { AppSettings } from '../types/settings';
import { CapturedTextResult, OCRProgress } from '../types/capture';

const api: AstraAPI = {
  // Window management
  minimizeToBubble: () => ipcRenderer.invoke('window:minimizeToBubble'),
  expandToChat: () => ipcRenderer.invoke('window:expandToChat'),
  toggleWindow: () => ipcRenderer.invoke('window:toggleWindow'),
  closeApp: () => ipcRenderer.invoke('window:closeApp'),
  isExpanded: () => ipcRenderer.invoke('window:isExpanded'),
  setAlwaysOnTop: (alwaysOnTop: boolean) => ipcRenderer.invoke('window:setAlwaysOnTop', alwaysOnTop),
  saveBubblePosition: (x: number, y: number) => ipcRenderer.invoke('window:saveBubblePosition', x, y),

  // Settings & Secure Keys
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:save', settings),
  getKeyStatus: () => ipcRenderer.invoke('keys:status'),
  setApiKey: (provider: AIProviderType, apiKey: string) => ipcRenderer.invoke('keys:set', provider, apiKey),
  testApiKey: (provider: AIProviderType, apiKey?: string) => ipcRenderer.invoke('keys:test', provider, apiKey),
  deleteApiKey: (provider: AIProviderType) => ipcRenderer.invoke('keys:delete', provider),

  // Models
  getAvailableModels: () => ipcRenderer.invoke('models:list'),

  // Conversations
  getConversations: () => ipcRenderer.invoke('conversations:list'),
  getConversationMessages: (conversationId: string) => ipcRenderer.invoke('conversations:getMessages', conversationId),
  createConversation: (initialTitle?: string) => ipcRenderer.invoke('conversations:create', initialTitle),
  renameConversation: (id: string, newTitle: string) => ipcRenderer.invoke('conversations:rename', id, newTitle),
  deleteConversation: (id: string) => ipcRenderer.invoke('conversations:delete', id),
  clearAllConversations: () => ipcRenderer.invoke('conversations:clearAll'),
  exportConversation: (id: string, format: 'json' | 'markdown') => ipcRenderer.invoke('conversations:export', id, format),

  // Chat & Streaming
  sendMessage: (payload) => ipcRenderer.invoke('chat:send', payload),
  stopGeneration: () => ipcRenderer.invoke('chat:stop'),
  onStreamChunk: (callback: (chunk: AIStreamChunk) => void) => {
    const handler = (_event: any, chunk: AIStreamChunk) => callback(chunk);
    ipcRenderer.on('chat:chunk', handler);
    return () => {
      ipcRenderer.removeListener('chat:chunk', handler);
    };
  },

  // Capture & OCR
  triggerActiveTextCapture: () => ipcRenderer.invoke('capture:activeText'),
  triggerScreenOCR: () => ipcRenderer.invoke('capture:screenOCR'),
  onTextCaptured: (callback: (data: CapturedTextResult) => void) => {
    const handler = (_event: any, data: CapturedTextResult) => callback(data);
    ipcRenderer.on('capture:textCaptured', handler);
    return () => {
      ipcRenderer.removeListener('capture:textCaptured', handler);
    };
  },
  onOCRProgress: (callback: (progress: OCRProgress) => void) => {
    const handler = (_event: any, progress: OCRProgress) => callback(progress);
    ipcRenderer.on('capture:ocrProgress', handler);
    return () => {
      ipcRenderer.removeListener('capture:ocrProgress', handler);
    };
  },

  // Utilities
  openExternal: (url: string) => ipcRenderer.invoke('util:openExternal', url),
  copyToClipboard: (text: string) => ipcRenderer.invoke('util:copyToClipboard', text),
};

contextBridge.exposeInMainWorld('astraAPI', api);
