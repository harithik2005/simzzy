import { useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';

type InputBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
};

export default function InputBar({ value, onChange, onSend, disabled }: InputBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="sz-input-bar">
      <input
        ref={inputRef}
        type="text"
        className="sz-input"
        placeholder="Ask me anything about your eSIM…"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        maxLength={400}
        aria-label="Chat message"
        autoComplete="off"
      />
      <button
        className="sz-send-btn"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/>
        </svg>
      </button>
    </div>
  );
}
