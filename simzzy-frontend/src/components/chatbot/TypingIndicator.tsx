import { BotIcon } from './ChatHeader';

export default function TypingIndicator() {
  return (
    <div className="sz-msg-row sz-msg-bot" aria-label="Simzzy is typing" role="status">
      <div className="sz-bot-icon" aria-hidden="true">
        <BotIcon size={13} />
      </div>
      <div>
        <div className="sz-typing-bubble">
          <span className="sz-dot" />
          <span className="sz-dot" />
          <span className="sz-dot" />
        </div>
        <div className="sz-typing-label" aria-hidden="true">Simzzy is typing…</div>
      </div>
    </div>
  );
}
