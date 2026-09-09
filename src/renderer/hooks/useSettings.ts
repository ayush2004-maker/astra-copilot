import { useState, useEffect } from 'react';
import { AppSettings } from '../../types/settings';
import { ModelInfo } from '../../types/ai';

const DEFAULT_SETTINGS: AppSettings = {
  defaultProvider: 'gemini',
  defaultModel: 'gemini-3.6-flash',
  bestAnswerMode: false,
  webSearchEnabled: false,
  temperature: 0.7,
  theme: 'dark',
  assistantIcon: 'nebula',
  windowOpacity: 1.0,
  windowSizePreset: 'standard',
  alwaysOnTop: true,
  startWithWindows: false,
  globalShortcut: 'CommandOrControl+Shift+Space',
  assistantPosition: null,
  autoOpenAfterCapture: true,
  rememberConversations: true,
  autoDeleteTemporaryScreenshots: true,
  allowOCR: true,
  telemetry: false,
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    loadModels();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await window.astraAPI.getSettings();
      setSettings(s);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const m = await window.astraAPI.getAvailableModels();
      setModels(m);
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const updateSettings = async (partial: Partial<AppSettings>) => {
    try {
      const updated = await window.astraAPI.saveSettings(partial);
      setSettings(updated);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  return {
    settings,
    models,
    loading,
    updateSettings,
    refreshModels: loadModels,
  };
};
