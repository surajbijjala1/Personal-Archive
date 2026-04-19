import { useState } from "react";
import { moodColor } from "../utils.js";

// ─── Bubble chart helpers ────────────────────────────────────────────────────

function buildBubbleData(entries) {
  const map = {};
  for (const e of entries) {
    const tag = e.activity || "🪞 Reflecting";
    if (!map[tag]) map[tag] = { tag, count: 0, moodSum: 0, moodCount: 0 };
    map[tag].count += 1;
    const score = e.mood_user ?? e.mood;
    if (score) {
      map[tag].moodSum += score;
      map[tag].moodCount += 1;
    }
  }
  return Object.values(map)
    .map((d) => ({ ...d, avgMood: d.moodCount > 0 ? d.moodSum / d.moodCount : 5 }))
    .sort((a, b) => b.count - a.count);
}

function BubbleChart({ entries }) {
  const [hovered, setHovered] = useState(null);
  const data = buildBubbleData(entries);
  if (data.length < 2) return null;

  const maxCount = Math.max(...data.map((d) => d.count));
  const minR = 30, maxR = 70;

  // Arrange bubbles: simple row layout, wrapping when needed
  // Sizes: radius proportional to count
  const bubbles = data.map((d) => ({
    ...d,
    r: minR + ((d.count - 1) / Math.max(1, maxCount - 1)) * (maxR - minR),
    color: moodColor(Math.round(d.avgMood)),
  }));

  return (
    <div style={{ marginTop: 28 }}>
      <div className="section-label">Where your best thoughts come from</div>
      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: 14 }}>
        Bubble size = entry count · Color = average mood
      </div>
      <div className="bubble-chart">
        {bubbles.map((b) => (
          <div
            key={b.tag}
            className="bubble"
            style={{
              width: b.r * 2,
              height: b.r * 2,
              borderRadius: "50%",
              background: b.color + "28",
              border: `2px solid ${b.color}60`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "default",
              position: "relative",
              flexShrink: 0,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={() => setHovered(b.tag)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{
              fontSize: b.r > 45 ? "13px" : "11px",
              fontWeight: 600,
              color: b.color,
              textAlign: "center",
              padding: "0 6px",
              lineHeight: 1.3,
              maxWidth: b.r * 1.6,
              wordBreak: "break-word",
              overflow: "hidden",
            }}>
              {b.tag.length > 14 ? b.tag.slice(0, 12) + "…" : b.tag}
            </div>
            <div style={{ fontSize: "11px", color: b.color + "cc", marginTop: 2 }}>
              ×{b.count}
            </div>

            {hovered === b.tag && (
              <div className="bubble-tooltip">
                <strong>{b.tag}</strong>
                <div>{b.count} {b.count === 1 ? "entry" : "entries"}</div>
                <div>Avg mood: {b.avgMood.toFixed(1)}/10</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MoodGraph({ entries }) {
  // Need at least 1 scored entry to show anything
  const aiScored = entries.filter((e) => e.mood);
  const userScored = entries.filter((e) => e.mood_user);

  if (aiScored.length < 1) {
    return (
      <div className="mood-empty">
        Save your first entry to start your mood timeline ✨
      </div>
    );
  }

  // Build graph data from up to 30 newest scored entries
  const graphEntries = aiScored.slice(0, 30).reverse();
  const W = 440, H = 120, pad = 28;
  const n = graphEntries.length;

  const xs = graphEntries.map((_, i) => pad + (n > 1 ? (i / (n - 1)) * (W - pad * 2) : (W - pad * 2) / 2));

  // AI line (mood — what the text sounds like)
  const ysAI = graphEntries.map((e) => H - pad - ((e.mood - 1) / 9) * (H - pad * 2));
  const pathAI = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ysAI[i]}`).join(" ");
  const areaAI =
    `M${xs[0]},${H - 6} ` +
    xs.map((x, i) => `L${x},${ysAI[i]}`).join(" ") +
    ` L${xs[xs.length - 1]},${H - 6} Z`;

  // User line (mood_user — how they actually felt)
  const ysUser = graphEntries.map((e) =>
    H - pad - (((e.mood_user ?? e.mood) - 1) / 9) * (H - pad * 2)
  );
  const pathUser = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ysUser[i]}`).join(" ");

  return (
    <div>
      <div className="panel-title">Mood Timeline</div>
      <div className="panel-sub">Your inner state alongside how your words read</div>

      {/* Legend */}
      <div className="mood-dual-legend">
        <span className="mood-legend-line mood-legend-line--user">— Your rating</span>
        <span className="mood-legend-line mood-legend-line--ai">— AI reading</span>
      </div>

      {/* Dual line graph */}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="mgAI" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* AI area fill (subtle) */}
        <path d={areaAI} fill="url(#mgAI)" />

        {/* AI line — indigo */}
        <path d={pathAI} fill="none" stroke="#6366f1" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />

        {/* User line — warm amber */}
        <path d={pathUser} fill="none" stroke="#a07030" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots — AI (small) */}
        {graphEntries.map((e, i) => (
          <circle key={`ai-${i}`} cx={xs[i]} cy={ysAI[i]} r="3.5"
            fill={moodColor(e.mood)} stroke="#fff" strokeWidth="1.2">
            <title>
              {new Date(e.created_at).toLocaleDateString()} · AI: {e.mood_label} ({e.mood}/10)
            </title>
          </circle>
        ))}

        {/* Dots — User (slightly larger) */}
        {graphEntries.map((e, i) => {
          const score = e.mood_user ?? e.mood;
          const label = e.mood_user_label ?? e.mood_label;
          const isUserSet = e.mood_user != null;
          return (
            <circle key={`user-${i}`} cx={xs[i]} cy={ysUser[i]} r={isUserSet ? 5 : 3.5}
              fill={moodColor(score)} stroke="#fff" strokeWidth="1.5"
              opacity={isUserSet ? 1 : 0.5}>
              <title>
                {new Date(e.created_at).toLocaleDateString()} · {isUserSet ? "You" : "AI default"}: {label} ({score}/10)
              </title>
            </circle>
          );
        })}

        {/* Y-axis labels */}
        {[2, 5, 8].map((v) => (
          <text key={v} x={pad - 8}
            y={H - pad - ((v - 1) / 9) * (H - pad * 2) + 4}
            fontSize="9" fill="#ccc" textAnchor="end">
            {v}
          </text>
        ))}
      </svg>

      {/* Date range */}
      <div className="mood-dates">
        <span className="mood-date-label">
          {new Date(graphEntries[0].created_at).toLocaleDateString()}
        </span>
        <span className="mood-date-label">
          {new Date(graphEntries[graphEntries.length - 1].created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Mood legend */}
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

      {/* Bubble chart */}
      {entries.length >= 3 && <BubbleChart entries={entries} />}

      {/* Scored entry list */}
      {aiScored.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="section-label">Scored entries</div>
          {aiScored.map((e) => {
            const userScore = e.mood_user;
            const aiScore = e.mood;
            return (
              <div key={e.id} className="entry-card">
                <div className="entry-date">{new Date(e.created_at).toLocaleString()}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                  {userScore != null && (
                    <span className="entry-mood" style={{
                      background: moodColor(userScore) + "22",
                      color: moodColor(userScore),
                    }}>
                      You: {e.mood_user_label} {userScore}/10
                    </span>
                  )}
                  {aiScore != null && (
                    <span className="entry-mood" style={{
                      background: "#6366f122",
                      color: "#6366f1",
                    }}>
                      AI: {e.mood_label} {aiScore}/10
                    </span>
                  )}
                </div>
                <div className="entry-text">
                  {e.text.slice(0, 100)}{e.text.length > 100 ? "…" : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
