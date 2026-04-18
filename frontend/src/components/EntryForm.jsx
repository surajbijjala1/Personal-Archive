import { useState, useRef } from "react";

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

export default function EntryForm({ onSave, saving, customTags = [], onAddTag, onRemoveTag }) {
  const [thought, setThought] = useState("");
  const [activity, setActivity] = useState(null);
  const [customAct, setCustomAct] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [tagError, setTagError] = useState("");
  const newTagRef = useRef(null);

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

  const handleAddTag = async () => {
    const tag = newTag.trim();
    if (!tag) return;
    if (tag.length > 30) { setTagError("Max 30 characters"); return; }
    setTagError("");
    try {
      await onAddTag(tag);
      setNewTag("");
      setAddingTag(false);
    } catch (e) {
      setTagError(e.message || "Failed to add tag");
    }
  };

  const startAddTag = () => {
    setAddingTag(true);
    setNewTag("");
    setTagError("");
    setTimeout(() => newTagRef.current?.focus(), 50);
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
        {/* Built-in activity chips */}
        {ACTIVITIES.map((a) => (
          <button
            key={a.label}
            className={`activity-chip ${activity === a.label ? "activity-chip--selected" : ""}`}
            onClick={() => setActivity(activity === a.label ? null : a.label)}
          >
            {a.icon} {a.label}
          </button>
        ))}

        {/* Custom tag chips */}
        {customTags.map((tag) => (
          <div key={tag} className="custom-tag-wrapper">
            <button
              className={`activity-chip custom-tag-chip ${activity === tag ? "activity-chip--selected" : ""}`}
              onClick={() => setActivity(activity === tag ? null : tag)}
            >
              🏷 {tag}
            </button>
            <button
              className="custom-tag-remove"
              title={`Remove "${tag}"`}
              onClick={(e) => { e.stopPropagation(); onRemoveTag(tag); }}
            >
              ✕
            </button>
          </div>
        ))}

        {/* Add tag button / inline input */}
        {addingTag ? (
          <div className="add-tag-row">
            <input
              ref={newTagRef}
              className="add-tag-input"
              placeholder="e.g. Swimming"
              value={newTag}
              maxLength={30}
              onChange={(e) => { setNewTag(e.target.value); setTagError(""); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTag();
                if (e.key === "Escape") { setAddingTag(false); setNewTag(""); }
              }}
            />
            <button className="add-tag-save" onClick={handleAddTag}>Add</button>
            <button className="add-tag-cancel" onClick={() => { setAddingTag(false); setNewTag(""); }}>✕</button>
          </div>
        ) : (
          <button className="activity-chip add-tag-btn" onClick={startAddTag}>
            + Add tag
          </button>
        )}
      </div>

      {tagError && <div className="tag-error">{tagError}</div>}

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
