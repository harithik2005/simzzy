type BotIconProps = { size?: number };

function BotIcon({ size = 20 }: BotIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="7" width="18" height="13" rx="3" stroke="#ff2d78" strokeWidth="1.5"/>
      <circle cx="9" cy="13.5" r="1.5" fill="#ff2d78"/>
      <circle cx="15" cy="13.5" r="1.5" fill="#ff2d78"/>
      <path d="M8 7V5.5a4 4 0 018 0V7" stroke="#ff2d78" strokeWidth="1.5"/>
    </svg>
  );
}

type ChatHeaderProps = {
  onClose: () => void;
};

export default function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <div className="sz-header">
      <div className="sz-header-avatar">
        <BotIcon size={20} />
      </div>

      <div className="sz-header-info">
        <div className="sz-header-title">Simzzy Support</div>
        <div className="sz-header-subtitle">
          <span className="sz-online-dot" aria-hidden="true" />
          Instant help for your eSIM
        </div>
      </div>

      <button className="sz-header-close" onClick={onClose} aria-label="Close chat">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
}

export { BotIcon };
