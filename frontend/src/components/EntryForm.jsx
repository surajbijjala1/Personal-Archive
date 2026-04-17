import { useState } from "react";

const ACTIVITIES = [
  { icon: "🧘", label: "Sitting alone" },
  { icon: "🏋️", label: "Working out" },
  { icon: "🚶", label: "Walking" },
  { icon: "▶️", label: "Watching a video" },
  { icon: "📖", label: "Reading" },
  { icon: "💬", label: "In conversation" },
  { icon: "🌅", label: "Just woke up" },
  { icon: "🌙", label: "Can't sleep" },
  { icon: "🚿", label: "In the shower" },
  { icon: "✏️", label: "Other" },
];

export default function EntryForm({ onSave, saving }) {
  const [thought, setThought] = useState("");
  const [activity, setActivity] = useState(null);
  const [customAct, setCustomAct] = useState("");

  const getActivityLabel = () => {
    if (!activity) return null;
    if (activity === "Other") return customAct.trim() || "Other";
    const match = ACTIVITIES.find((a) => a.label === activity);
    return match ? `${match.icon} ${activity}` : activity;
  };

  const handleSave = async () => {
    if (!thought.trim()) return;
    await onSave(thought.trim(), getActivityLabel());
    setThought("");
    setActivity(null);
    setCustomAct("");
  };

  return (
    <div>
      <div className="panel-title">Capture a Thought</div>
      <div className="panel-sub">What's on your mind right now?</div>

      <textarea
        className="entry-textarea"
        placeholder="Write freely..."
        value={thought}
        onChange={(e) => setThought(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
        }}
      />

      <div className="activity-label">Where were you when this came to you?</div>
      <div className="activity-grid">
        {ACTIVITIES.map((a) => (
          <button
            key={a.label}
            className={`activity-chip ${activity === a.label ? "activity-chip--selected" : ""}`}
            onClick={() => setActivity(activity === a.label ? null : a.label)}
          >
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      {activity === "Other" && (
        <input
          className="custom-activity-input"
          placeholder="Describe your context..."
          value={customAct}
          onChange={(e) => setCustomAct(e.target.value)}
        />
      )}

      <button className="save-btn" onClick={handleSave} disabled={saving || !thought.trim()}>
        {saving ? "Saving..." : "Save Entry"}
      </button>
    </div>
  );
}
