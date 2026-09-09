import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, RotateCw, ExternalLink, Bot, User, Layers, Globe } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../types/ai';
import { CodeBlock } from './CodeBlock';

interface ChatMessageProps {
  message: ChatMessageType;
  onRegenerate?: () => void;
  isLatest?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onRegenerate,
  isLatest,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);

  const handleCopyText = async () => {
    try {
      await window.astraAPI.copyToClipboard(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openSourceUrl = (url: string) => {
    if (url) {
      window.astraAPI.openExternal(url);
    }
  };

  return (
    <div
      className={`group relative flex flex-col w-full px-3 py-3 rounded-xl transition-all duration-200 ${
        isUser
          ? 'bg-indigo-600/15 border border-indigo-500/20 text-slate-100 self-end'
          : 'bg-slate-900/60 border border-slate-800/80 text-slate-200'
      }`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between gap-2 mb-1.5 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-medium">
          {isUser ? (
            <>
              <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <User className="w-3 h-3" />
              </div>
              <span className="text-indigo-300 font-semibold text-xs">You</span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="text-slate-200 font-semibold text-xs">Astra Copilot</span>
              {message.model && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                  {message.model}
                </span>
              )}
              {message.isBestAnswer && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-semibold">
                  <Layers className="w-3 h-3" /> Best Answer
                </span>
              )}
            </>
          )}
        </div>

        {/* Message Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopyText}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Copy message content"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {!isUser && isLatest && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Regenerate response"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className="select-text prose prose-invert prose-sm max-w-none text-slate-200 text-xs leading-relaxed break-words">
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');

                return !inline && match ? (
                  <CodeBlock language={match[1]} value={codeString} />
                ) : (
                  <code
                    className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px] border border-slate-700/50"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              a({ node, href, children, ...props }: any) {
                return (
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      if (href) openSourceUrl(href);
                    }}
                    className="text-cyan-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer font-medium"
                    {...props}
                  >
                    {children}
                    <ExternalLink className="w-2.5 h-2.5 inline" />
                  </a>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>

      {/* Best Answer Candidate Breakdown Accordion */}
      {message.bestAnswerCandidates && message.bestAnswerCandidates.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px]">
          <button
            onClick={() => setShowCandidates(!showCandidates)}
            className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              {showCandidates ? 'Hide' : 'View'} {message.bestAnswerCandidates.length} Model Candidate Summaries
            </span>
          </button>

          {showCandidates && (
            <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-amber-500/40">
              {message.bestAnswerCandidates.map((cand, idx) => (
                <div key={idx} className="p-2 rounded bg-slate-950/60 border border-slate-800 text-slate-300">
                  <div className="font-semibold text-slate-200 text-[10px] uppercase text-indigo-400">
                    {cand.provider} - {cand.model}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">{cand.summary}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Web Sources list */}
      {message.webSources && message.webSources.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px]">
          <div className="flex items-center gap-1 text-cyan-400 font-medium mr-1">
            <Globe className="w-3 h-3" />
            <span>Sources:</span>
          </div>
          {message.webSources.map((source, i) => (
            <button
              key={i}
              onClick={() => openSourceUrl(source.url)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 text-[10px] border border-slate-700/60 transition-colors max-w-[180px] truncate"
              title={source.title}
            >
              <span className="truncate">{source.title || source.url}</span>
              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
