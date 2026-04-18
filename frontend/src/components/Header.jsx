export default function Header({ onThisDayCount, onShowOTD, onExport, onLock, onShowChats, onShowProfile }) {
  return (
    <div className="header">
      <span className="header-logo">🌱 My Inner Archive</span>
      <div className="header-actions">
        {onThisDayCount > 0 && (
          <button className="header-btn header-btn--warm" onClick={onShowOTD}>
            📅 On This Day
          </button>
        )}
        <button className="header-btn" onClick={onShowChats} title="Chat history">
          💬 Chats
        </button>
        <button className="header-btn" onClick={onExport} title="Export entries">
          ⬇ Export
        </button>
        <button className="header-btn" onClick={onShowProfile} title="Profile & settings">
          👤 Profile
        </button>
        <button className="header-btn" onClick={onLock} title="Lock session">
          🔒 Lock
        </button>
      </div>
    </div>
  );
}
