import React from 'react';
import { Globe, Layers, Cpu, ChevronDown } from 'lucide-react';
import { ModelInfo } from '../../types/ai';

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  webSearch: boolean;
  onToggleWebSearch: () => void;
  bestAnswer: boolean;
  onToggleBestAnswer: () => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onSelectModel,
  webSearch,
  onToggleWebSearch,
  bestAnswer,
  onToggleBestAnswer,
}) => {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/80 bg-slate-900/40 text-xs">
      {/* Model Dropdown */}
      <div className="flex items-center gap-1.5">
        <Cpu className="w-3.5 h-3.5 text-indigo-400" />
        <div className="relative inline-block">
          <select
            value={selectedModel}
            onChange={(e) => onSelectModel(e.target.value)}
            className="appearance-none bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-[11px] font-medium py-1 pl-2 pr-6 rounded-md border border-slate-700/60 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="auto">⚡ Auto Router (Smart Pick)</option>
            <optgroup label="OpenAI">
              {models
                .filter((m) => m.provider === 'openai')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Google Gemini">
              {models
                .filter((m) => m.provider === 'gemini')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Anthropic Claude">
              {models
                .filter((m) => m.provider === 'anthropic')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </optgroup>
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Feature Toggles: Web Search & Best Answer */}
      <div className="flex items-center gap-1.5">
        {/* Web Search Toggle */}
        <button
          onClick={onToggleWebSearch}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
            webSearch
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-300'
          }`}
          title="Toggle live Web Search"
        >
          <Globe className="w-3 h-3" />
          <span>Web</span>
        </button>

        {/* Best Answer Multi-Model Mode Toggle */}
        <button
          onClick={onToggleBestAnswer}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
            bestAnswer
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-300'
          }`}
          title="Toggle Best Answer (Multi-Model synthesis & audit)"
        >
          <Layers className="w-3 h-3" />
          <span>Best Answer</span>
        </button>
      </div>
    </div>
  );
};
