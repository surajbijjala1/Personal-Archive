export default function Header({ onThisDayCount, onShowOTD, onExport, onLock }) {
  return (
    <div className="header">
      <span className="header-logo">🌱 My Inner Archive</span>
      <div className="header-actions">
        {onThisDayCount > 0 && (
          <button className="header-btn header-btn--warm" onClick={onShowOTD}>
            📅 On This Day
          </button>
        )}
        <button className="header-btn" onClick={onExport}>
          ⬇ Export
        </button>
        <button className="header-btn" onClick={onLock}>
          🔒 Lock
        </button>
      </div>
    </div>
  );
}
