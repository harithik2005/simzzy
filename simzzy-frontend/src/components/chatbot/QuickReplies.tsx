type QuickRepliesProps = {
  replies: string[];
  onSelect: (reply: string) => void;
  disabled: boolean;
};

export default function QuickReplies({ replies, onSelect, disabled }: QuickRepliesProps) {
  if (!replies || replies.length === 0) return null;

  return (
    <div className="sz-quick-replies" role="group" aria-label="Quick reply options">
      {replies.map((reply, i) => (
        <button
          key={i}
          className="sz-qr-btn"
          style={{ animationDelay: `${i * 50}ms` }}
          onClick={() => onSelect(reply)}
          disabled={disabled}
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
