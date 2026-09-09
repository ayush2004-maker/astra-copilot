import React, { useState, useEffect } from 'react';
import { AssistantButton } from './components/AssistantButton';
import { ChatWindow } from './components/ChatWindow';
import { ConversationDrawer } from './components/ConversationDrawer';
import { SettingsModal } from './components/SettingsModal';
import { useSettings } from './hooks/useSettings';
import { useChat } from './hooks/useChat';
import { CapturedTextResult, OCRProgress } from '../types/capture';

export const App: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Capture & OCR states
  const [capturedText, setCapturedText] = useState<CapturedTextResult | null>(null);
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null);

  // Settings & Chat Hooks
  const { settings, models, updateSettings } = useSettings();
  const {
    conversations,
    currentConvId,
    messages,
    isGenerating,
    selectConversation,
    sendMessage,
    stopGeneration,
    regenerateLatest,
    createNewConversation,
    deleteConversation,
    renameConversation,
    clearAllConversations,
    exportConversation,
  } = useChat(settings.defaultModel);

  // Sync window state on mount
  useEffect(() => {
    window.astraAPI.isExpanded().then((expanded) => {
      setIsExpanded(expanded);
    });

    // Listen for captured text (from Global Shortcut Ctrl+Shift+Space)
    const unsubText = window.astraAPI.onTextCaptured((captured: CapturedTextResult) => {
      setCapturedText(captured);
      setIsExpanded(true);
    });

    // Listen for OCR progress
    const unsubOCR = window.astraAPI.onOCRProgress((progress: OCRProgress) => {
      setOcrProgress(progress);
      if (progress.progress >= 1.0) {
        setTimeout(() => setOcrProgress(null), 1500);
      }
    });

    return () => {
      unsubText();
      unsubOCR();
    };
  }, []);

  const handleExpand = async () => {
    await window.astraAPI.expandToChat();
    setIsExpanded(true);
  };

  const handleMinimize = async () => {
    setIsSettingsOpen(false);
    setIsHistoryOpen(false);
    await window.astraAPI.minimizeToBubble();
    setIsExpanded(false);
  };

  const handleTriggerOCR = async () => {
    try {
      const result = await window.astraAPI.triggerScreenOCR();
      if (result && result.text) {
        setCapturedText(result);
      }
    } catch (err) {
      console.error('OCR Trigger failed:', err);
    }
  };

  return (
    <div
      className="w-screen h-screen overflow-hidden select-none bg-transparent transition-opacity duration-200"
      style={{ opacity: settings.windowOpacity }}
    >
      {!isExpanded ? (
        // FLOATING CIRCULAR ASSISTANT BUTTON
        <AssistantButton
          onClick={handleExpand}
          iconStyle={settings.assistantIcon}
        />
      ) : (
        // EXPANDED COMPACT CHAT INTERFACE
        <div className="relative w-full h-full">
          <ChatWindow
            onMinimize={handleMinimize}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenHistory={() => setIsHistoryOpen(true)}
            settings={settings}
            models={models}
            messages={messages}
            isGenerating={isGenerating}
            onSendMessage={sendMessage}
            onStopGeneration={stopGeneration}
            onRegenerate={regenerateLatest}
            onNewChat={createNewConversation}
            onClearChat={() => {
              if (currentConvId) {
                deleteConversation(currentConvId);
              }
            }}
            capturedText={capturedText}
            onDismissCapturedText={() => setCapturedText(null)}
            onTriggerOCR={handleTriggerOCR}
            ocrProgress={ocrProgress}
          />

          {/* Conversation History Drawer */}
          <ConversationDrawer
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            conversations={conversations}
            currentId={currentConvId}
            onSelectConversation={selectConversation}
            onNewConversation={createNewConversation}
            onRenameConversation={renameConversation}
            onDeleteConversation={deleteConversation}
            onClearAll={clearAllConversations}
            onExport={exportConversation}
          />

          {/* Settings Modal */}
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onSaveSettings={updateSettings}
            models={models}
          />
        </div>
      )}
    </div>
  );
};

export default App;
