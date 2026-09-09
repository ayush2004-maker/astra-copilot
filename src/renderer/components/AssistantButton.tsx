import React, { useState } from 'react';
import { Sparkles, Bot, Compass, Zap } from 'lucide-react';

interface AssistantButtonProps {
  onClick: () => void;
  iconStyle?: 'nebula' | 'orbit' | 'sparkle' | 'minimal';
}

export const AssistantButton: React.FC<AssistantButtonProps> = ({
  onClick,
  iconStyle = 'nebula',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const renderIcon = () => {
    switch (iconStyle) {
      case 'orbit':
        return <Compass className="w-7 h-7 text-cyan-300 transition-transform duration-300 group-hover:rotate-45" />;
      case 'sparkle':
        return <Sparkles className="w-7 h-7 text-indigo-300 transition-transform duration-300 group-hover:scale-110" />;
      case 'minimal':
        return <Zap className="w-7 h-7 text-amber-300 transition-transform duration-300 group-hover:scale-110" />;
      case 'nebula':
      default:
        return <Bot className="w-7 h-7 text-indigo-300 transition-transform duration-300 group-hover:scale-110" />;
    }
  };

  return (
    <div className="drag-region w-full h-full flex items-center justify-center p-1 select-none">
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`no-drag relative group w-[64px] h-[64px] rounded-full flex items-center justify-center
          glass-bubble cursor-pointer transition-all duration-300 ease-out
          hover:scale-105 active:scale-95 hover:border-indigo-400/60
          shadow-lg shadow-indigo-950/50 hover:shadow-indigo-500/30`}
        title="Click to open Astra Copilot (Ctrl+Shift+Space to capture text)"
      >
        {/* Ambient background glow ring */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600/30 to-cyan-400/30 blur-md transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-40'
          }`}
        />

        {/* Central Icon */}
        <div className="relative z-10 flex items-center justify-center">
          {renderIcon()}
        </div>

        {/* Active status pip */}
        <span className="absolute top-1 right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 border border-slate-900" />
        </span>
      </button>
    </div>
  );
};
