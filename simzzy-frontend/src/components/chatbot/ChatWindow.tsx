import Link from 'next/link';
import { Globe, LifeBuoy, Smartphone } from 'lucide-react';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import QuickReplies from './QuickReplies';
import InputBar from './InputBar';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import type { ChatMessage } from '../../hooks/useChatSession';

const NAV_SHORTCUTS = [
  { href: '/browse', label: 'Browse Plans', icon: Globe },
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/device-check', label: 'Check Device', icon: Smartphone },
];

type ChatWindowProps = {
  messages: ChatMessage[];
  quickReplies: string[];
  isLoading: boolean;
  onClose: () => void;
  onSend: (text: string, isQuickReply?: boolean) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
};

export default function ChatWindow({
  messages,
  quickReplies,
  isLoading,
  onClose,
  onSend,
  inputValue,
  onInputChange,
}: ChatWindowProps) {
  const scrollRef = useAutoScroll<HTMLDivElement>([messages.length, isLoading]);

  return (
    <div className="sz-window" role="dialog" aria-modal="true" aria-label="Simzzy Customer Support">
      <ChatHeader onClose={onClose} />

      {/* Navigation shortcuts — take users straight to key pages */}
      <div className="sz-nav-shortcuts">
        {NAV_SHORTCUTS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="sz-nav-shortcut">
            <Icon size={13} />
            {label}
          </Link>
        ))}
      </div>

      <div
        ref={scrollRef}
        id="sz-messages"
        className="sz-messages"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
      </div>

      <QuickReplies
        replies={quickReplies}
        onSelect={(reply) => onSend(reply, true)}
        disabled={isLoading}
      />

      <InputBar
        value={inputValue}
        onChange={onInputChange}
        onSend={() => onSend(inputValue, false)}
        disabled={isLoading}
      />

      <footer className="sz-footer">
        Powered by <span>Simzzy</span> · eSIM Support
      </footer>
    </div>
  );
}
