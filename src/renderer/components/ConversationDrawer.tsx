import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, Download, Search, X, MessageSquare, Clock } from 'lucide-react';
import { ConversationMeta } from '../../types/settings';

interface ConversationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationMeta[];
  currentId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, title: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearAll: () => void;
  onExport: (id: string, format: 'json' | 'markdown') => void;
}

export const ConversationDrawer: React.FC<ConversationDrawerProps> = ({
  isOpen,
  onClose,
  conversations,
  currentId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onClearAll,
  onExport,
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  if (!isOpen) return null;

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.preview.toLowerCase().includes(search.toLowerCase())
  );

  const startRename = (conv: ConversationMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="absolute inset-0 z-40 flex bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-[310px] h-full bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>Conversations</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action: New Conversation */}
        <div className="p-2.5 border-b border-slate-800/80">
          <button
            onClick={() => {
              onNewConversation();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>

          {/* Search bar */}
          <div className="relative mt-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 text-xs pl-8 pr-2.5 py-1 rounded-md border border-slate-800 focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No conversations found
            </div>
          ) : (
            filtered.map((conv) => {
              const isSelected = conv.id === currentId;
              const isEditing = conv.id === editingId;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onClose();
                  }}
                  className={`group relative p-2 rounded-lg cursor-pointer transition-colors text-xs border ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500/40 text-slate-100'
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1 flex-1 mr-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 bg-slate-900 text-slate-100 px-1.5 py-0.5 rounded border border-indigo-500 text-xs focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={(e) => saveRename(conv.id, e)}
                          className="p-1 rounded text-emerald-400 hover:bg-slate-800"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-medium truncate flex-1">{conv.title}</span>
                    )}

                    {/* Action buttons on hover */}
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        onClick={(e) => startRename(conv, e)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onExport(conv.id, 'markdown');
                        }}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                        title="Export Markdown"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span className="truncate max-w-[170px]">{conv.preview}</span>
                    <span className="flex items-center gap-0.5 flex-shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Clear All History */}
        <div className="p-2.5 border-t border-slate-800">
          <button
            onClick={() => {
              if (confirm('Clear all conversation history? This cannot be undone.')) {
                onClearAll();
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 text-xs transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear All History</span>
          </button>
        </div>
      </div>

      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
};
