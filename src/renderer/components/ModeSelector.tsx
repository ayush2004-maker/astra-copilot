import React from 'react';
import { AssistantMode } from '../../types/ai';
import { MessageSquare, Code2, Calculator, HelpCircle } from 'lucide-react';

interface ModeSelectorProps {
  currentMode: AssistantMode;
  onSelectMode: (mode: AssistantMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onSelectMode,
}) => {
  const modes: { id: AssistantMode; label: string; icon: React.ReactNode }[] = [
    { id: 'normal', label: 'Chat', icon: <MessageSquare className="w-3 h-3" /> },
    { id: 'coding', label: 'Coding', icon: <Code2 className="w-3 h-3" /> },
    { id: 'aptitude', label: 'Aptitude', icon: <Calculator className="w-3 h-3" /> },
    { id: 'explain', label: 'Explain', icon: <HelpCircle className="w-3 h-3" /> },
  ];

  return (
    <div className="flex items-center p-0.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px]">
      {modes.map((m) => {
        const active = currentMode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onSelectMode(m.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
              active
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {m.icon}
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};
