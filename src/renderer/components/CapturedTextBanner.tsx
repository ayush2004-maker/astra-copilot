import React, { useState } from 'react';
import { Sparkles, X, ChevronDown, ChevronUp, FileText, Code2, Calculator, HelpCircle, Languages, Terminal, CheckCircle2 } from 'lucide-react';
import { CapturedTextResult, QuickActionType } from '../../types/capture';

interface CapturedTextBannerProps {
  captured: CapturedTextResult;
  onActionClick: (action: QuickActionType, text: string) => void;
  onDismiss: () => void;
}

interface ActionButton {
  type: QuickActionType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export const CapturedTextBanner: React.FC<CapturedTextBannerProps> = ({
  captured,
  onActionClick,
  onDismiss,
}) => {
  const [expanded, setExpanded] = useState(false);

  const actions: ActionButton[] = [
    { type: 'explain', label: 'Explain', icon: <HelpCircle className="w-3 h-3" />, color: 'hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/30' },
    { type: 'solve', label: 'Solve', icon: <Calculator className="w-3 h-3" />, color: 'hover:bg-amber-600/30 text-amber-300 border-amber-500/30' },
    { type: 'summarize', label: 'Summarize', icon: <FileText className="w-3 h-3" />, color: 'hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30' },
    { type: 'debug', label: 'Debug', icon: <Terminal className="w-3 h-3" />, color: 'hover:bg-rose-600/30 text-rose-300 border-rose-500/30' },
    { type: 'generate_code', label: 'Generate Code', icon: <Code2 className="w-3 h-3" />, color: 'hover:bg-cyan-600/30 text-cyan-300 border-cyan-500/30' },
    { type: 'translate', label: 'Translate', icon: <Languages className="w-3 h-3" />, color: 'hover:bg-purple-600/30 text-purple-300 border-purple-500/30' },
    { type: 'answer', label: 'Answer', icon: <CheckCircle2 className="w-3 h-3" />, color: 'hover:bg-blue-600/30 text-blue-300 border-blue-500/30' },
    { type: 'simplify', label: 'Simplify', icon: <Sparkles className="w-3 h-3" />, color: 'hover:bg-teal-600/30 text-teal-300 border-teal-500/30' },
  ];

  return (
    <div className="mx-3 my-2 rounded-xl bg-gradient-to-b from-indigo-950/70 to-slate-900/90 border border-indigo-500/40 p-2.5 shadow-lg shadow-indigo-950/40 text-xs select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="font-semibold text-indigo-200">Captured Text</span>
          {captured.sourceApp && (
            <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60 max-w-[140px] truncate">
              from {captured.sourceApp}
            </span>
          )}
          {captured.method === 'ocr' && (
            <span className="text-[9px] text-amber-400 bg-amber-950/60 px-1 py-0.5 rounded border border-amber-800/60 font-semibold uppercase">
              OCR
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded"
            title={expanded ? 'Collapse preview' : 'Expand preview'}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors"
            title="Dismiss captured text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Text preview snippet */}
      <div
        className={`text-slate-300 font-mono text-[11px] bg-slate-950/70 rounded p-1.5 border border-slate-800 overflow-hidden leading-relaxed ${
          expanded ? 'max-h-40 overflow-y-auto' : 'line-clamp-2'
        }`}
      >
        "{captured.text}"
      </div>

      {/* Quick Action Chips */}
      <div className="mt-2 flex flex-wrap gap-1">
        {actions.map((act) => (
          <button
            key={act.type}
            onClick={() => onActionClick(act.type, captured.text)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border bg-slate-900/80 transition-all active:scale-95 ${act.color}`}
          >
            {act.icon}
            <span>{act.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
