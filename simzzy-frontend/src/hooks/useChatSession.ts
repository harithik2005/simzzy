import { useState, useCallback, useRef } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_CHATBOT_API ||
  'https://simzzy-chatbot-backend.vercel.app/api/chat';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string | number;
  role: ChatRole;
  content: string;
  timestamp: number;
};

type ChatApiResponse = {
  response: string;
  quickReplies?: string[];
  sessionId?: string;
};

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const stored = sessionStorage.getItem('sz_session_id');
  if (stored) return stored;
  const id = 'sz_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessionStorage.setItem('sz_session_id', id);
  return id;
}

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content: `👋 Hi! I'm **Simzzy Support**.\n\nI can help you with:\n- eSIM installation & connection issues\n- Plan selection & device compatibility\n- Orders, delivery, and account help\n\nWhat can I help you with today?`,
  timestamp: Date.now(),
};

const GREETING_QRS = [
  'No internet connection',
  'QR code issue',
  'Which plan to buy?',
  'Contact support',
];

const FALLBACK_RESPONSE = {
  role: 'assistant' as const,
  content: "⚠️ I'm having trouble connecting right now. Please try again or reach us at **support@simzzy.com**",
};

const FALLBACK_QRS = ['Try again', 'Contact support'];

export function useChatSession() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [quickReplies, setQuickReplies] = useState<string[]>(GREETING_QRS);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const sessionIdRef = useRef<string>(getOrCreateSessionId());

  const addMessage = useCallback((msg: { role: ChatRole; content: string }) => {
    setMessages(prev => [
      ...prev,
      { ...msg, id: Date.now() + Math.random(), timestamp: Date.now() },
    ]);
  }, []);

  const sendMessage = useCallback(
    async (text: string, isQuickReply = false, windowOpen = true) => {
      if (!text.trim() || isLoading) return;

      addMessage({ role: 'user', content: text.trim() });
      setQuickReplies([]);
      setIsLoading(true);

      try {
        const body = {
          message: text.trim(),
          sessionId: sessionIdRef.current,
          quickReply: isQuickReply,
        };

        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: ChatApiResponse = await res.json();

        if (data.sessionId && data.sessionId !== sessionIdRef.current) {
          sessionIdRef.current = data.sessionId;
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('sz_session_id', data.sessionId);
          }
        }

        addMessage({ role: 'assistant', content: data.response });
        setQuickReplies(data.quickReplies || []);

        if (!windowOpen) setHasNotification(true);

      } catch (err) {
        console.error('[Simzzy Chat]', err);
        addMessage(FALLBACK_RESPONSE);
        setQuickReplies(FALLBACK_QRS);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, addMessage]
  );

  const clearNotification = useCallback(() => setHasNotification(false), []);

  return {
    messages,
    quickReplies,
    isLoading,
    hasNotification,
    sendMessage,
    clearNotification,
  };
}
