import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, AssistantMode, AIStreamChunk } from '../../types/ai';
import { ConversationMeta } from '../../types/settings';

export const useChat = (defaultModel: string) => {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Reference to track active message chunk stream
  const activeStreamText = useRef<string>('');
  const activeStreamMeta = useRef<Partial<ChatMessage>>({});

  // 1. Initial Load of Conversations
  const refreshConversations = useCallback(async () => {
    try {
      const list = await window.astraAPI.getConversations();
      setConversations(list);
      return list;
    } catch (err) {
      console.error('Failed to load conversations:', err);
      return [];
    }
  }, []);

  // 2. Select / Load Conversation Messages
  const selectConversation = useCallback(async (id: string) => {
    setCurrentConvId(id);
    try {
      const msgs = await window.astraAPI.getConversationMessages(id);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages for conversation:', err);
      setMessages([]);
    }
  }, []);

  // Initialize or create default conversation
  useEffect(() => {
    refreshConversations().then((list) => {
      if (list.length > 0) {
        selectConversation(list[0].id);
      } else {
        createNewConversation();
      }
    });
  }, [refreshConversations, selectConversation]);

  // 3. Listen to incoming AI stream chunks from main process
  useEffect(() => {
    const unsubscribe = window.astraAPI.onStreamChunk((chunk: AIStreamChunk) => {
      if (chunk.webSources && chunk.webSources.length > 0) {
        activeStreamMeta.current.webSources = chunk.webSources;
      }
      if (chunk.modelUsed) {
        activeStreamMeta.current.model = chunk.modelUsed;
      }
      if (chunk.category) {
        activeStreamMeta.current.category = chunk.category;
      }
      if (chunk.isBestAnswer !== undefined) {
        activeStreamMeta.current.isBestAnswer = chunk.isBestAnswer;
      }

      if (chunk.text) {
        activeStreamText.current += chunk.text;
      }

      // Update UI state with in-progress message
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && last.id === 'streaming-msg') {
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              content: activeStreamText.current,
              ...activeStreamMeta.current,
            },
          ];
        } else {
          return [
            ...prev,
            {
              id: 'streaming-msg',
              conversationId: currentConvId,
              role: 'assistant',
              content: activeStreamText.current,
              createdAt: Date.now(),
              ...activeStreamMeta.current,
            },
          ];
        }
      });

      if (chunk.done) {
        setIsGenerating(false);
        setStatusMessage(null);
        // Refresh conversations to update previews and timestamps
        refreshConversations();
        // Preserve transient provider errors; successful responses are persisted.
        if (!chunk.error) {
          window.astraAPI.getConversationMessages(currentConvId).then((finalMsgs) => {
            setMessages(finalMsgs);
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentConvId, refreshConversations]);

  // 4. Send Message
  const sendMessage = async (params: {
    prompt: string;
    mode?: AssistantMode;
    model?: string;
    webSearch?: boolean;
    bestAnswer?: boolean;
  }) => {
    if (!params.prompt.trim() || isGenerating) return;

    let convId = currentConvId;
    if (!convId) {
      convId = await window.astraAPI.createConversation(params.prompt.slice(0, 30));
      setCurrentConvId(convId);
    }

    // Add user message to local state immediately
    const userMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      conversationId: convId,
      role: 'user',
      content: params.prompt,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);
    activeStreamText.current = '';
    activeStreamMeta.current = {};

    try {
      await window.astraAPI.sendMessage({
        conversationId: convId,
        prompt: params.prompt,
        mode: params.mode || 'normal',
        model: params.model === 'auto' ? undefined : params.model,
        webSearch: params.webSearch,
        bestAnswer: params.bestAnswer,
      });
    } catch (err: any) {
      setIsGenerating(false);
      const errMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        conversationId: convId,
        role: 'assistant',
        content: `**Error sending message:** ${err?.message || String(err)}`,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    }
  };

  // 5. Stop Generation
  const stopGeneration = async () => {
    await window.astraAPI.stopGeneration();
    setIsGenerating(false);
  };

  // 6. Regenerate Latest
  const regenerateLatest = async (mode?: AssistantMode, model?: string) => {
    if (isGenerating || messages.length === 0) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    await sendMessage({
      prompt: lastUserMsg.content,
      mode,
      model,
    });
  };

  // 7. Create New Conversation
  const createNewConversation = async () => {
    try {
      const id = await window.astraAPI.createConversation('New Conversation');
      await refreshConversations();
      await selectConversation(id);
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  // 8. Delete Conversation
  const deleteConversation = async (id: string) => {
    await window.astraAPI.deleteConversation(id);
    const remaining = await refreshConversations();
    if (id === currentConvId) {
      if (remaining.length > 0) {
        selectConversation(remaining[0].id);
      } else {
        createNewConversation();
      }
    }
  };

  // 9. Rename Conversation
  const renameConversation = async (id: string, newTitle: string) => {
    await window.astraAPI.renameConversation(id, newTitle);
    await refreshConversations();
  };

  // 10. Clear All
  const clearAllConversations = async () => {
    await window.astraAPI.clearAllConversations();
    await refreshConversations();
    await createNewConversation();
  };

  // 11. Export
  const exportConversation = async (id: string, format: 'json' | 'markdown') => {
    const data = await window.astraAPI.exportConversation(id, format);
    // Create download trigger
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astra-chat-${id.slice(0, 8)}.${format === 'json' ? 'json' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    conversations,
    currentConvId,
    messages,
    isGenerating,
    statusMessage,
    selectConversation,
    sendMessage,
    stopGeneration,
    regenerateLatest,
    createNewConversation,
    deleteConversation,
    renameConversation,
    clearAllConversations,
    exportConversation,
  };
};
