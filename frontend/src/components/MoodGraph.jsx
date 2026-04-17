import { moodColor } from "../utils.js";

export default function MoodGraph({ entries }) {
  const scored = entries.filter((e) => e.mood).slice(0, 30).reverse();

  if (scored.length < 2) {
    return (
      <div className="mood-empty">
        Save a few more entries to see your mood timeline ✨
      </div>
    );
  }

  const W = 440, H = 110, pad = 28;
  const xs = scored.map((_, i) => pad + (i / (scored.length - 1)) * (W - pad * 2));
  const ys = scored.map((e) => H - pad - ((e.mood - 1) / 9) * (H - pad * 2));
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const area =
    `M${xs[0]},${H - 8} ` +
    xs.map((x, i) => `L${x},${ys[i]}`).join(" ") +
    ` L${xs[xs.length - 1]},${H - 8} Z`;

  return (
    <div>
      <div className="panel-title">Mood Timeline</div>
      <div className="panel-sub">Auto-scored from your writing, no manual input needed</div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#mg)" />
        <path d={path} fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {scored.map((e, i) => (
          <g key={i}>
            <circle cx={xs[i]} cy={ys[i]} r="5" fill={moodColor(e.mood)} stroke="#fff" strokeWidth="1.5" />
            <title>
              {new Date(e.created_at).toLocaleDateString()} · {e.mood_label} ({e.mood}/10)
            </title>
          </g>
        ))}
        {[2, 5, 8].map((v) => (
          <text key={v} x={pad - 8} y={H - pad - ((v - 1) / 9) * (H - pad * 2) + 4} fontSize="9" fill="#ccc" textAnchor="end">
            {v}
          </text>
        ))}
      </svg>

      <div className="mood-dates">
        <span className="mood-date-label">{new Date(scored[0].created_at).toLocaleDateString()}</span>
        <span className="mood-date-label">{new Date(scored[scored.length - 1].created_at).toLocaleDateString()}</span>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="section-label">Mood legend</div>
        <div className="mood-legend">
          {[
            ["1–3", "Low / difficult", "#e05"],
            ["4–6", "Neutral / processing", "#eb3"],
            ["7–10", "Positive / energized", "#2a4"],
          ].map(([r, l, c]) => (
            <div key={r} className="mood-legend-item" style={{ background: c + "22" }}>
              <div className="mood-legend-dot" style={{ background: c }} />
              <span><strong>{r}</strong> — {l}</span>
            </div>
          ))}
        </div>
      </div>

      {entries.filter((e) => e.mood).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="section-label">Scored entries</div>
          {entries.filter((e) => e.mood).map((e) => (
            <div key={e.id} className="entry-card">
              <div className="entry-date">{new Date(e.created_at).toLocaleString()}</div>
              <span
                className="entry-mood"
                style={{
                  background: moodColor(e.mood) + "22",
                  color: moodColor(e.mood),
                }}
              >
                {e.mood_label} {e.mood}/10
              </span>
              <div className="entry-text" style={{ marginTop: 4 }}>
                {e.text.slice(0, 100)}
                {e.text.length > 100 ? "…" : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
