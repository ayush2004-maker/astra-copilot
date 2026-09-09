import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Sparkles,
  Settings as SettingsIcon,
  FolderOpen,
  ScanText,
  Plus,
  Trash2,
  ChevronRight,
  Code2,
  Calculator,
  Compass,
  X,
} from 'lucide-react';
import { AssistantMode, ModelInfo } from '../../types/ai';
import { AppSettings } from '../../types/settings';
import { CapturedTextResult, QuickActionType } from '../../types/capture';
import { ChatMessage } from './ChatMessage';
import { ModeSelector } from './ModeSelector';
import { ModelSelector } from './ModelSelector';
import { CapturedTextBanner } from './CapturedTextBanner';
import { SystemPrompts } from '../../main/ai/prompts/systemPrompts';

interface ChatWindowProps {
  onMinimize: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  settings: AppSettings;
  models: ModelInfo[];
  messages: any[];
  isGenerating: boolean;
  onSendMessage: (params: {
    prompt: string;
    mode?: AssistantMode;
    model?: string;
    webSearch?: boolean;
    bestAnswer?: boolean;
  }) => void;
  onStopGeneration: () => void;
  onRegenerate: () => void;
  onNewChat: () => void;
  onClearChat: () => void;
  capturedText: CapturedTextResult | null;
  onDismissCapturedText: () => void;
  onTriggerOCR: () => void;
  ocrProgress: { status: string; progress: number } | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  onMinimize,
  onOpenSettings,
  onOpenHistory,
  settings,
  models,
  messages,
  isGenerating,
  onSendMessage,
  onStopGeneration,
  onRegenerate,
  onNewChat,
  onClearChat,
  capturedText,
  onDismissCapturedText,
  onTriggerOCR,
  ocrProgress,
}) => {
  const [prompt, setPrompt] = useState('');
  const [currentMode, setCurrentMode] = useState<AssistantMode>('normal');
  const [selectedModel, setSelectedModel] = useState<string>('auto');
  const [webSearch, setWebSearch] = useState<boolean>(settings.webSearchEnabled);
  const [bestAnswer, setBestAnswer] = useState<boolean>(settings.bestAnswerMode);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  const handleSend = () => {
    if (!prompt.trim() || isGenerating) return;
    onSendMessage({
      prompt: prompt.trim(),
      mode: currentMode,
      model: selectedModel === 'auto' ? undefined : selectedModel,
      webSearch,
      bestAnswer,
    });
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: QuickActionType, text: string) => {
    const formatted = SystemPrompts.getQuickActionPrompt(action, text);
    onSendMessage({
      prompt: formatted,
      mode: action === 'generate_code' || action === 'debug' ? 'coding' : action === 'solve' ? 'aptitude' : currentMode,
      model: selectedModel === 'auto' ? undefined : selectedModel,
      webSearch,
      bestAnswer,
    });
    onDismissCapturedText();
  };

  return (
    <div className="w-full h-full flex flex-col glass-panel rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden select-none">
      {/* 1. TOP HEADER & DRAG REGION */}
      <div className="drag-region relative flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center gap-2">
          {/* Logo & title */}
          <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-400">
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-sm shadow-indigo-500/50">
              <Sparkles className="w-3 h-3" />
            </div>
            <span className="bg-gradient-to-r from-indigo-200 to-slate-100 bg-clip-text text-transparent">
              Astra Copilot
            </span>
          </div>
        </div>

        {/* Mode Selector in center */}
        <div className="no-drag">
          <ModeSelector currentMode={currentMode} onSelectMode={setCurrentMode} />
        </div>

        {/* Right header buttons */}
        <div className="no-drag flex shrink-0 items-center gap-1">
          <button
            onClick={onTriggerOCR}
            className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-cyan-300 transition-colors"
            title="Scan screen text via OCR"
          >
            <ScanText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenHistory}
            className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-indigo-300 transition-colors"
            title="Conversation history"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-indigo-300 transition-colors"
            title="Settings & API Keys"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={onMinimize}
          className="no-drag absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-rose-400/70 bg-rose-500/25 text-rose-200 shadow-sm shadow-rose-950/50 hover:bg-rose-500/50 hover:text-white transition-colors"
          title="Return to floating bubble (Ctrl+Q)"
          aria-label="Return to floating bubble"
        >
          <X className="h-5 w-5" strokeWidth={2.75} />
        </button>
      </div>

      {/* 2. SUB-HEADER: MODEL, WEB SEARCH, BEST ANSWER */}
      <div className="no-drag">
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          webSearch={webSearch}
          onToggleWebSearch={() => setWebSearch(!webSearch)}
          bestAnswer={bestAnswer}
          onToggleBestAnswer={() => setBestAnswer(!bestAnswer)}
        />
      </div>

      {/* 3. CAPTURED TEXT BANNER (WHEN SHORTCUT OR OCR TRIGGERED) */}
      {capturedText && (
        <div className="no-drag">
          <CapturedTextBanner
            captured={capturedText}
            onActionClick={handleQuickAction}
            onDismiss={onDismissCapturedText}
          />
        </div>
      )}

      {/* OCR PROGRESS BANNER */}
      {ocrProgress && (
        <div className="mx-3 my-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-between text-[11px] text-cyan-300">
          <div className="flex items-center gap-2">
            <ScanText className="w-3.5 h-3.5 animate-spin" />
            <span>{ocrProgress.status}</span>
          </div>
          <span className="font-mono">{Math.round(ocrProgress.progress * 100)}%</span>
        </div>
      )}

      {/* 4. MESSAGES SCROLL AREA */}
      <div className="no-drag flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 select-none">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-lg shadow-indigo-950/50">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">How can Astra help you?</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              Select text anywhere and press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-mono text-[10px]">Ctrl+Shift+Space</kbd> or type below.
            </p>

            {/* Quick Starter Chips */}
            <div className="mt-4 grid grid-cols-2 gap-1.5 w-full max-w-[320px] text-left">
              <button
                onClick={() => {
                  setCurrentMode('coding');
                  setPrompt('Explain how async/await works under the hood in JavaScript/TypeScript');
                }}
                className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-1.5 transition-colors"
              >
                <Code2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">Explain async/await in TypeScript</span>
              </button>
              <button
                onClick={() => {
                  setCurrentMode('aptitude');
                  setPrompt('A train 150m long is running at 54 km/h. How long will it take to cross a 250m bridge?');
                }}
                className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-1.5 transition-colors"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">Speed & Distance train problem</span>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <ChatMessage
              key={msg.id || index}
              message={msg}
              onRegenerate={onRegenerate}
              isLatest={index === messages.length - 1}
            />
          ))
        )}

        {/* Streaming / thinking indicator */}
        {isGenerating && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>Astra Copilot is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 5. PROMPT INPUT AREA */}
      <div className="no-drag p-2.5 border-t border-slate-800 bg-slate-950/60">
        <div className="relative rounded-xl border border-slate-700/80 bg-slate-900/90 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              currentMode === 'coding'
                ? 'Ask code, debug, optimize, or write tests...'
                : currentMode === 'aptitude'
                ? 'Ask math problem, formula, or reasoning...'
                : currentMode === 'explain'
                ? 'Ask to explain concept intuitively...'
                : 'Ask Astra Copilot anything...'
            }
            className="w-full bg-transparent text-slate-100 text-xs p-2.5 pr-10 focus:outline-none resize-none leading-relaxed placeholder:text-slate-500 max-h-32"
          />

          {/* Action button inside input (Send or Stop) */}
          <div className="absolute right-1.5 bottom-1.5">
            {isGenerating ? (
              <button
                onClick={onStopGeneration}
                className="w-7 h-7 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-colors shadow-sm"
                title="Stop generation"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!prompt.trim()}
                className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white flex items-center justify-center transition-all shadow-sm active:scale-95"
                title="Send message (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Footer shortcuts & helper buttons */}
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 px-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onNewChat}
              className="flex items-center gap-0.5 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Plus className="w-3 h-3" /> New Chat
            </button>
            <button
              onClick={onClearChat}
              className="flex items-center gap-0.5 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
          <div className="text-[10px] text-slate-500">
            <kbd className="px-1 rounded bg-slate-800 text-slate-400">Enter</kbd> to send, <kbd className="px-1 rounded bg-slate-800 text-slate-400">Shift+Enter</kbd> newline
          </div>
        </div>
      </div>
    </div>
  );
};
