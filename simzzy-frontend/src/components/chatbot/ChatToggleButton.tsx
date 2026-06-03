type ChatToggleButtonProps = {
  isOpen: boolean;
  hasNotification: boolean;
  onClick: () => void;
};

export default function ChatToggleButton({ isOpen, hasNotification, onClick }: ChatToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? 'Close support chat' : 'Open support chat'}
      className="sz-toggle-btn"
    >
      {hasNotification && !isOpen && <span className="sz-notif-dot" aria-hidden="true" />}

      <svg
        className={`sz-icon ${isOpen ? 'sz-icon-hidden' : ''}`}
        width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="white" strokeWidth="2"
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>

      <svg
        className={`sz-icon ${isOpen ? '' : 'sz-icon-hidden'}`}
        width="20" height="20" viewBox="0 0 24 24"
        fill="none" stroke="white" strokeWidth="2.5"
      >
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  );
}
