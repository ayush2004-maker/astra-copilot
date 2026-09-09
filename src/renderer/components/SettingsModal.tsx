import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Sliders,
  Palette,
  Shield,
  Zap,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { AppSettings, ProviderKeyStatus } from '../../types/settings';
import { AIProviderType, ModelInfo } from '../../types/ai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => void;
  models: ModelInfo[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  models,
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'model' | 'appearance' | 'behavior' | 'privacy'>('providers');

  // Key states
  const [keyStatus, setKeyStatus] = useState<ProviderKeyStatus>({ openai: false, gemini: false, anthropic: false });
  const [inputKeys, setInputKeys] = useState<{ [key in AIProviderType]?: string }>({});
  const [showKeys, setShowKeys] = useState<{ [key in AIProviderType]?: boolean }>({});
  const [testResults, setTestResults] = useState<{ [key in AIProviderType]?: { loading?: boolean; success?: boolean; message?: string } }>({});

  // Local settings draft
  const [draft, setDraft] = useState<AppSettings>(settings);

  useEffect(() => {
    setDraft(settings);
    loadKeyStatus();
  }, [settings, isOpen]);

  const loadKeyStatus = async () => {
    try {
      const status = await window.astraAPI.getKeyStatus();
      setKeyStatus(status);
    } catch (err) {
      console.error('Failed to load key status:', err);
    }
  };

  if (!isOpen) return null;

  const handleSaveKey = async (provider: AIProviderType) => {
    const key = inputKeys[provider];
    if (key !== undefined) {
      await window.astraAPI.setApiKey(provider, key);
      await loadKeyStatus();
      setInputKeys((prev) => ({ ...prev, [provider]: '' }));
      setTestResults((prev) => ({ ...prev, [provider]: { success: true, message: 'Key saved securely in OS vault' } }));
    }
  };

  const handleTestKey = async (provider: AIProviderType) => {
    setTestResults((prev) => ({ ...prev, [provider]: { loading: true } }));
    try {
      const customKey = inputKeys[provider]?.trim() || undefined;
      const res = await window.astraAPI.testApiKey(provider, customKey);
      setTestResults((prev) => ({ ...prev, [provider]: { loading: false, success: res.success, message: res.message } }));
    } catch (err: any) {
      setTestResults((prev) => ({ ...prev, [provider]: { loading: false, success: false, message: err?.message || 'Test failed' } }));
    }
  };

  const handleDeleteKey = async (provider: AIProviderType) => {
    await window.astraAPI.deleteApiKey(provider);
    await loadKeyStatus();
    setTestResults((prev) => ({ ...prev, [provider]: { message: 'Key removed from vault' } }));
  };

  const updateDraft = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) => {
    const next = { ...draft, [key]: val };
    setDraft(next);
    onSaveSettings({ [key]: val });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-fadeIn p-4 select-none">
      <div className="w-full max-w-[420px] h-[520px] bg-slate-900 border border-slate-700/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-semibold text-slate-100">Astra Copilot Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-2 pt-1 gap-1">
          {[
            { id: 'providers', label: 'Providers', icon: <Key className="w-3 h-3" /> },
            { id: 'model', label: 'Model', icon: <Zap className="w-3 h-3" /> },
            { id: 'appearance', label: 'Look', icon: <Palette className="w-3 h-3" /> },
            { id: 'behavior', label: 'Behavior', icon: <Sliders className="w-3 h-3" /> },
            { id: 'privacy', label: 'Privacy', icon: <Shield className="w-3 h-3" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-t-lg transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
          {/* TAB 1: AI PROVIDERS & KEYS */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              <p className="text-slate-400 text-[11px] leading-relaxed">
                API keys are encrypted in your local Windows OS vault using DPAPI and never exposed to renderer script.
              </p>

              {/* Provider Key Cards */}
              {[
                { id: 'gemini' as AIProviderType, name: 'Google Gemini', placeholder: 'AIzaSy...' },
                { id: 'openai' as AIProviderType, name: 'OpenAI', placeholder: 'sk-proj-...' },
                { id: 'anthropic' as AIProviderType, name: 'Anthropic Claude', placeholder: 'sk-ant-...' },
              ].map((p) => {
                const isConfigured = keyStatus[p.id];
                const res = testResults[p.id];

                return (
                  <div key={p.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{p.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isConfigured
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isConfigured ? 'Vault Protected' : 'Not Set'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type={showKeys[p.id] ? 'text' : 'password'}
                          placeholder={isConfigured ? '••••••••••••••••••••' : p.placeholder}
                          value={inputKeys[p.id] || ''}
                          onChange={(e) =>
                            setInputKeys((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          className="w-full bg-slate-900 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 pr-7 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowKeys((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          {showKeys[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <button
                        onClick={() => handleSaveKey(p.id)}
                        disabled={!inputKeys[p.id]?.trim()}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg font-medium text-[11px] transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => handleTestKey(p.id)}
                        className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] transition-colors flex items-center gap-1"
                        title="Test API Key"
                      >
                        {res?.loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Test'}
                      </button>
                    </div>

                    {/* Test result message */}
                    {res?.message && (
                      <div
                        className={`text-[10px] flex items-center gap-1 ${
                          res.success ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {res.success ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        <span>{res.message}</span>
                      </div>
                    )}

                    {isConfigured && (
                      <button
                        onClick={() => handleDeleteKey(p.id)}
                        className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        Remove saved key
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: MODEL SETTINGS */}
          {activeTab === 'model' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Default Model</label>
                <select
                  value={draft.defaultModel}
                  onChange={(e) => updateDraft('defaultModel', e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash (Fast & Smart)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Reasoning)</option>
                  <option value="gpt-4o">OpenAI GPT-4o (Flagship Omni)</option>
                  <option value="gpt-4o-mini">OpenAI GPT-4o Mini (Cost Efficient)</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (State of the Art Code)</option>
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (High Speed)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-medium">Temperature: {draft.temperature}</label>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={draft.temperature}
                  onChange={(e) => updateDraft('temperature', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Precise (0.0)</span>
                  <span>Balanced (0.7)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-200">Always Enable Web Search</div>
                    <div className="text-[10px] text-slate-400">Search live internet for every prompt</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.webSearchEnabled}
                    onChange={(e) => updateDraft('webSearchEnabled', e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-200">Best Answer Multi-Model Mode</div>
                    <div className="text-[10px] text-slate-400">Queries multiple models and audits consensus</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.bestAnswerMode}
                    onChange={(e) => updateDraft('bestAnswerMode', e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['dark', 'light', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateDraft('theme', t)}
                      className={`py-1.5 px-3 rounded-lg border text-center capitalize transition-colors ${
                        draft.theme === t
                          ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300 font-medium'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assistant Icon Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'nebula', label: 'Nebula Bot' },
                    { id: 'orbit', label: 'Orbit Compass' },
                    { id: 'sparkle', label: 'Sparkle Star' },
                    { id: 'minimal', label: 'Minimal Zap' },
                  ].map((ic) => (
                    <button
                      key={ic.id}
                      onClick={() => updateDraft('assistantIcon', ic.id as any)}
                      className={`py-1.5 px-3 rounded-lg border text-left transition-colors ${
                        draft.assistantIcon === ic.id
                          ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300 font-medium'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ic.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-medium">Window Opacity: {Math.round(draft.windowOpacity * 100)}%</label>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.0"
                  step="0.05"
                  value={draft.windowOpacity}
                  onChange={(e) => updateDraft('windowOpacity', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          )}

          {/* TAB 4: BEHAVIOR */}
          {activeTab === 'behavior' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-200">Always On Top</div>
                  <div className="text-[10px] text-slate-400">Keep floating button above other application windows</div>
                </div>
                <input
                  type="checkbox"
                  checked={draft.alwaysOnTop}
                  onChange={(e) => updateDraft('alwaysOnTop', e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Global Capture Shortcut</label>
                <input
                  type="text"
                  value={draft.globalShortcut}
                  onChange={(e) => updateDraft('globalShortcut', e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  placeholder="CommandOrControl+Shift+Space"
                />
                <div className="text-[10px] text-slate-500 mt-1">
                  Default: CommandOrControl+Shift+Space. Captures active app selected text & opens assistant.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-200">Auto-Open After Text Capture</div>
                  <div className="text-[10px] text-slate-400">Automatically open chat window when shortcut is pressed</div>
                </div>
                <input
                  type="checkbox"
                  checked={draft.autoOpenAfterCapture}
                  onChange={(e) => updateDraft('autoOpenAfterCapture', e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 5: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-200">Remember Conversations</div>
                  <div className="text-[10px] text-slate-400">Save conversation history to local SQLite database</div>
                </div>
                <input
                  type="checkbox"
                  checked={draft.rememberConversations}
                  onChange={(e) => updateDraft('rememberConversations', e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-200">Shred Screenshots Immediately</div>
                  <div className="text-[10px] text-slate-400">Dispose temporary screen buffers right after OCR</div>
                </div>
                <input
                  type="checkbox"
                  checked={draft.autoDeleteTemporaryScreenshots}
                  onChange={(e) => updateDraft('autoDeleteTemporaryScreenshots', e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-200">Telemetry</div>
                  <div className="text-[10px] text-slate-400">Zero data or telemetry sent (Disabled by default)</div>
                </div>
                <input
                  type="checkbox"
                  disabled
                  checked={false}
                  className="w-4 h-4 accent-indigo-600 rounded opacity-60 cursor-not-allowed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
