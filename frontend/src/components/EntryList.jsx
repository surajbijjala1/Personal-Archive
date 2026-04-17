import { moodColor } from "../utils.js";

export default function EntryList({ entries, onDelete }) {
  return (
    <div>
      <div className="section-label">
        Archive · {entries.length} {entries.length === 1 ? "entry" : "entries"}
      </div>

      {entries.length === 0 ? (
        <div className="entry-empty">Your thoughts will live here. Start writing ✨</div>
      ) : (
        entries.map((e) => (
          <div key={e.id} className="entry-card">
            <button
              className="entry-delete-btn"
              onClick={() => onDelete(e.id)}
              title="Delete entry"
            >
              ✕
            </button>
            <div className="entry-date">{new Date(e.created_at).toLocaleString()}</div>
            <div>
              {e.activity && <span className="entry-activity">{e.activity}</span>}
              {e.mood && (
                <span
                  className="entry-mood"
                  style={{
                    background: moodColor(e.mood) + "22",
                    color: moodColor(e.mood),
                  }}
                >
                  {e.mood_label} {e.mood}/10
                </span>
              )}
            </div>
            <div className="entry-text">{e.text}</div>
          </div>
        ))
      )}
    </div>
  );
}
