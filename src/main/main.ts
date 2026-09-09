import { app, BrowserWindow, ipcMain, shell, clipboard, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import crypto from 'crypto';
import { AppDatabase } from './storage/database';
import { ConversationStore } from './storage/conversationStore';
import { CredentialStorage } from './security/credentialStorage';
import { IPCGuard } from './security/ipcGuard';
import { WindowManager } from './windows/windowManager';
import { ShortcutManager } from './shortcuts/shortcutManager';
import { ProviderRegistry } from './ai/providers/providerRegistry';
import { ModelRouter } from './ai/router/modelRouter';
import { BestAnswerJudge } from './ai/judge/bestAnswerJudge';
import { ContextCompressor } from './ai/context/contextCompressor';
import { SystemPrompts } from './ai/prompts/systemPrompts';
import { DuckDuckGoSearchProvider } from './search/webSearch';
import { TextCaptureManager } from './capture/textCaptureManager';
import { AppSettings } from '../types/settings';
import { AIProviderType, AssistantMode, ChatMessage } from '../types/ai';

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let tray: Tray | null = null;
let currentAbortController: AbortController | null = null;

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

async function bootstrap() {
  const db = AppDatabase.getInstance();
  const store = new ConversationStore();
  const credentials = CredentialStorage.getInstance();
  const winManager = WindowManager.getInstance();
  const shortcutManager = ShortcutManager.getInstance();
  const searchProvider = new DuckDuckGoSearchProvider();
  const captureManager = TextCaptureManager.getInstance();

  // Load settings
  let settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...(store.getSetting<Partial<AppSettings>>('appSettings', {}) || {}),
  };

  // Migrate settings saved by older builds after Gemini retired 2.5 Flash.
  if (settings.defaultModel === 'gemini-2.5-flash') {
    settings.defaultModel = 'gemini-3.6-flash';
    store.saveSetting('appSettings', settings);
  }

  await db.initialize(settings.rememberConversations);
  winManager.setStore(store);

  winManager.setSettings(settings);
  const mainWindow = winManager.createMainWindow();

  // Bring the existing instance forward when the user clicks the shortcut again.
  app.on('second-instance', () => {
    void winManager.expandToChat();
  });

  app.on('before-quit', () => {
    winManager.prepareToQuit();
  });

  // Global shortcut registration
  shortcutManager.register(settings.globalShortcut, (captured) => {
    if (settings.autoOpenAfterCapture) {
      void winManager.expandToChat();
    }
    mainWindow.webContents.send('capture:textCaptured', captured);
  });

  // Tray setup
  try {
    const trayIcon = nativeImage.createFromPath(path.join(__dirname, '../../resources/icon.png'));
    tray = new Tray(trayIcon.isEmpty() ? nativeImage.createEmpty() : trayIcon);
    tray.setToolTip('Astra Copilot - AI Desktop Assistant');
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: 'Toggle Astra Copilot',
          click: () => winManager.toggleWindow(),
        },
        {
          label: 'Capture Selected Text (Ctrl+Shift+Space)',
          click: async () => {
            const captured = await captureManager.getSelectedText();
            await winManager.expandToChat();
            if (captured) {
              mainWindow.webContents.send('capture:textCaptured', captured);
            }
          },
        },
        {
          label: 'Run Screen OCR',
          click: async () => {
            await winManager.expandToChat();
            mainWindow.webContents.send('capture:triggerScreenOCR');
          },
        },
        { type: 'separator' },
        {
          label: 'Always On Top',
          type: 'checkbox',
          checked: settings.alwaysOnTop,
          click: (menuItem) => {
            winManager.setAlwaysOnTop(menuItem.checked);
            settings.alwaysOnTop = menuItem.checked;
            store.saveSetting('appSettings', settings);
          },
        },
        { type: 'separator' },
        {
          label: 'Quit Astra Copilot',
          click: () => {
            app.quit();
          },
        },
      ])
    );
  } catch (err) {
    console.warn('Tray icon initialization skipped:', err);
  }

  // --- IPC HANDLERS ---

  // Window Management
  ipcMain.handle('window:minimizeToBubble', async () => {
    await winManager.minimizeToBubble();
  });

  ipcMain.handle('window:expandToChat', async () => {
    await winManager.expandToChat();
  });

  ipcMain.handle('window:toggleWindow', async () => {
    await winManager.toggleWindow();
  });

  ipcMain.handle('window:closeApp', () => {
    app.quit();
  });

  ipcMain.handle('window:isExpanded', () => {
    return winManager.isExpanded();
  });

  ipcMain.handle('window:setAlwaysOnTop', (_event, alwaysOnTop: boolean) => {
    winManager.setAlwaysOnTop(Boolean(alwaysOnTop));
  });

  ipcMain.handle('window:saveBubblePosition', (_event, x: number, y: number) => {
    winManager.saveBubblePosition(x, y);
  });

  // Settings & Credentials
  ipcMain.handle('settings:get', () => {
    return settings;
  });

  ipcMain.handle('settings:save', (_event, partialSettings: Partial<AppSettings>) => {
    settings = { ...settings, ...partialSettings };
    store.saveSetting('appSettings', settings);

    // Apply immediate settings changes
    winManager.setSettings(settings);
    if (partialSettings.alwaysOnTop !== undefined) {
      winManager.setAlwaysOnTop(partialSettings.alwaysOnTop);
    }
    if (partialSettings.rememberConversations !== undefined) {
      db.setMemoryOnly(!partialSettings.rememberConversations);
    }
    if (partialSettings.globalShortcut && partialSettings.globalShortcut !== shortcutManager.getCurrentShortcut()) {
      shortcutManager.register(partialSettings.globalShortcut, (captured) => {
        if (settings.autoOpenAfterCapture) {
          void winManager.expandToChat();
        }
        mainWindow.webContents.send('capture:textCaptured', captured);
      });
    }

    return settings;
  });

  ipcMain.handle('keys:status', () => {
    return credentials.getKeyStatus();
  });

  ipcMain.handle('keys:set', (_event, provider: unknown, apiKey: unknown) => {
    const validatedProvider = IPCGuard.validateProvider(provider);
    const sanitizedKey = IPCGuard.sanitizeString(apiKey, 500);
    return credentials.setApiKey(validatedProvider, sanitizedKey);
  });

  ipcMain.handle('keys:test', async (_event, provider: unknown, apiKey?: unknown) => {
    const validatedProvider = IPCGuard.validateProvider(provider);
    const keyToTest = apiKey ? IPCGuard.sanitizeString(apiKey, 500) : credentials.getApiKey(validatedProvider);
    if (!keyToTest) {
      return { success: false, message: 'No API key provided or found in secure storage' };
    }
    const prov = ProviderRegistry.getInstance().getProvider(validatedProvider);
    return prov.testConnection(keyToTest);
  });

  ipcMain.handle('keys:delete', (_event, provider: unknown) => {
    const validatedProvider = IPCGuard.validateProvider(provider);
    return credentials.deleteApiKey(validatedProvider);
  });

  // Models
  ipcMain.handle('models:list', () => {
    return ProviderRegistry.getInstance().getAllModels();
  });

  // Conversations
  ipcMain.handle('conversations:list', () => {
    return store.getConversations();
  });

  ipcMain.handle('conversations:getMessages', (_event, conversationId: unknown) => {
    const id = IPCGuard.sanitizeId(conversationId);
    return store.getMessages(id);
  });

  ipcMain.handle('conversations:create', (_event, initialTitle?: unknown) => {
    const title = IPCGuard.sanitizeString(initialTitle, 100);
    return store.createConversation(title || undefined);
  });

  ipcMain.handle('conversations:rename', (_event, id: unknown, newTitle: unknown) => {
    const safeId = IPCGuard.sanitizeId(id);
    const safeTitle = IPCGuard.sanitizeString(newTitle, 100);
    return store.renameConversation(safeId, safeTitle);
  });

  ipcMain.handle('conversations:delete', (_event, id: unknown) => {
    const safeId = IPCGuard.sanitizeId(id);
    return store.deleteConversation(safeId);
  });

  ipcMain.handle('conversations:clearAll', () => {
    return store.clearAllConversations();
  });

  ipcMain.handle('conversations:export', (_event, id: unknown, format: 'json' | 'markdown') => {
    const safeId = IPCGuard.sanitizeId(id);
    return store.exportConversation(safeId, format === 'markdown' ? 'markdown' : 'json');
  });

  // Chat & Streaming Generation
  ipcMain.handle('chat:send', async (_event, payload: {
    conversationId: string;
    prompt: string;
    mode?: AssistantMode;
    model?: string;
    webSearch?: boolean;
    bestAnswer?: boolean;
  }) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid chat request');
    }

    const conversationId = IPCGuard.sanitizeId(payload.conversationId);
    const prompt = IPCGuard.sanitizeString(payload.prompt, 10000);
    const mode = IPCGuard.validateMode(payload.mode);

    if (!prompt.trim()) return;

    currentAbortController = new AbortController();

    // 1. Record User Message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      conversationId,
      role: 'user',
      content: prompt,
      createdAt: Date.now(),
    };
    store.addMessage(userMsg);

    // 2. Classify prompt intent
    const category = ModelRouter.classifyPrompt(prompt);

    // 3. Check web search triggers
    const shouldUseWeb =
      payload.webSearch ??
      (settings.webSearchEnabled || category === 'current_information' || category === 'web_research');

    let webSources = undefined;
    let webContext = '';

    if (shouldUseWeb) {
      mainWindow.webContents.send('chat:chunk', {
        text: '',
        done: false,
        category,
        webSources: [{ title: 'Searching the web...', url: '' }],
      });

      const searchRes = await searchProvider.search(prompt);
      if (searchRes.results.length > 0) {
        const formatted = DuckDuckGoSearchProvider.formatSourcesForContext(searchRes.results);
        webContext = formatted.contextSnippet;
        webSources = formatted.sources;
      }
    }

    // 4. Retrieve conversation history for context
    const history = store.getMessages(conversationId);
    let systemPrompt = SystemPrompts.getPrompt(mode);
    if (webContext) {
      systemPrompt += `\n\n${webContext}`;
    }

    const compressedContext = await ContextCompressor.prepareContext(history, systemPrompt);

    // 5. Best Answer Mode vs Standard Routed Stream
    const isBestAnswer = payload.bestAnswer ?? settings.bestAnswerMode;

    if (isBestAnswer) {
      try {
        mainWindow.webContents.send('chat:chunk', {
          text: 'Initiating Best Answer synthesis across configured AI models...\n\n',
          done: false,
          isBestAnswer: true,
          category,
          webSources,
        });

        const synthesis = await BestAnswerJudge.synthesizeBestAnswer(
          compressedContext,
          (status) => {
            mainWindow.webContents.send('chat:chunk', {
              text: `\n> *${status}*\n\n`,
              done: false,
              isBestAnswer: true,
            });
          }
        );

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          conversationId,
          role: 'assistant',
          content: synthesis.text,
          createdAt: Date.now(),
          model: synthesis.judgeModel,
          category,
          webSources,
          isBestAnswer: true,
          bestAnswerCandidates: synthesis.candidates.map((c) => ({
            model: c.model,
            provider: c.provider,
            summary: c.response.slice(0, 120) + '...',
          })),
        };
        store.addMessage(assistantMsg);

        mainWindow.webContents.send('chat:chunk', {
          text: synthesis.text,
          done: true,
          modelUsed: synthesis.judgeModel,
          isBestAnswer: true,
          webSources,
          category,
        });
      } catch (err: any) {
        mainWindow.webContents.send('chat:chunk', {
          text: `\n\n**Error in Best Answer synthesis:** ${err?.message || String(err)}`,
          done: true,
          error: String(err),
        });
      }
      return;
    }

    // Standard streaming mode with optimal routing
    const route = ModelRouter.routeModel(category, payload.model || settings.defaultModel);
    const registry = ProviderRegistry.getInstance();
    const provider = registry.getProvider(route.provider);

    let fullGeneratedText = '';

    try {
      mainWindow.webContents.send('chat:chunk', {
        text: '',
        done: false,
        category,
        modelUsed: route.model,
        webSources,
      });

      await provider.stream(
        compressedContext,
        {
          model: route.model,
          mode,
          temperature: settings.temperature,
          abortSignal: currentAbortController.signal,
        },
        (chunk) => {
          fullGeneratedText += chunk;
          mainWindow.webContents.send('chat:chunk', {
            text: chunk,
            done: false,
            modelUsed: route.model,
            category,
            webSources,
          });
        }
      );

      // Save Assistant message
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        conversationId,
        role: 'assistant',
        content: fullGeneratedText,
        createdAt: Date.now(),
        provider: route.provider,
        model: route.model,
        category,
        webSources,
      };
      store.addMessage(assistantMsg);

      mainWindow.webContents.send('chat:chunk', {
        text: '',
        done: true,
        modelUsed: route.model,
        category,
        webSources,
      });
    } catch (err: any) {
      if (currentAbortController?.signal.aborted) {
        mainWindow.webContents.send('chat:chunk', {
          text: '\n\n*(Generation stopped by user)*',
          done: true,
        });
      } else {
        const errorMsg = `\n\n**Error:** ${err?.message || 'Failed to complete AI request'}`;
        mainWindow.webContents.send('chat:chunk', {
          text: errorMsg,
          done: true,
          error: errorMsg,
        });
      }
    } finally {
      currentAbortController = null;
    }
  });

  ipcMain.handle('chat:stop', () => {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
  });

  // Screen Text Capture & OCR
  ipcMain.handle('capture:activeText', async () => {
    const result = await captureManager.getSelectedText();
    return result;
  });

  ipcMain.handle('capture:screenOCR', async () => {
    if (!settings.allowOCR) {
      throw new Error('Screen OCR is disabled in Settings');
    }
    const result = await captureManager.captureVisibleText((progress) => {
      mainWindow.webContents.send('capture:ocrProgress', progress);
    });
    return result;
  });

  // Utilities
  ipcMain.handle('util:openExternal', (_event, url: unknown) => {
    const safeUrl = IPCGuard.sanitizeString(url, 2048);
    if (safeUrl.startsWith('http://') || safeUrl.startsWith('https://')) {
      shell.openExternal(safeUrl);
    }
  });

  ipcMain.handle('util:copyToClipboard', (_event, text: unknown) => {
    const safeText = IPCGuard.sanitizeString(text, 1000000);
    clipboard.writeText(safeText);
  });
}

if (gotTheLock) {
  app.whenReady().then(bootstrap);
}

app.on('window-all-closed', () => {
  // On Windows desktop assistant, keep running in tray unless explicitly quit
  // If no tray icon is supported, quit
  if (process.platform !== 'darwin' && !tray) {
    app.quit();
  }
});
