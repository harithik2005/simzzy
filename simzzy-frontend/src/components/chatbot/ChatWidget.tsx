'use client';

import { useState, useCallback, useEffect } from 'react';
import ChatToggleButton from './ChatToggleButton';
import ChatWindow from './ChatWindow';
import { useChatSession } from '../../hooks/useChatSession';
import '../../styles/chatbot.css';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const {
    messages, quickReplies, isLoading,
    hasNotification, sendMessage, clearNotification,
  } = useChatSession();

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    clearNotification();
  }, [clearNotification]);

  // Allow other parts of the app (e.g. Support page "Start Chat") to open the widget.
  useEffect(() => {
    const open = () => handleOpen();
    window.addEventListener('simzzy:open-chat', open);
    return () => window.removeEventListener('simzzy:open-chat', open);
  }, [handleOpen]);

  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleToggle = useCallback(() => {
    if (isOpen) handleClose(); else handleOpen();
  }, [isOpen, handleOpen, handleClose]);

  const handleSend = useCallback((text: string, isQuickReply = false) => {
    if (!text?.trim()) return;
    sendMessage(text, isQuickReply, isOpen);
    if (!isQuickReply) setInputValue('');
  }, [sendMessage, isOpen]);

  return (
    <div className="sz-root" aria-label="Customer support widget">
      {isOpen && (
        <ChatWindow
          messages={messages}
          quickReplies={quickReplies}
          isLoading={isLoading}
          onClose={handleClose}
          onSend={handleSend}
          inputValue={inputValue}
          onInputChange={setInputValue}
        />
      )}
      <ChatToggleButton
        isOpen={isOpen}
        hasNotification={hasNotification}
        onClick={handleToggle}
      />
    </div>
  );
}
