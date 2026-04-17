export default function AiChat() {
  return (
    <div className="panel-right" style={{ height: "100%" }}>
      <div className="panel-title">Your AI Companion</div>
      <div className="panel-sub">Powered entirely by your own words</div>

      <div className="ai-placeholder">
        <div className="ai-placeholder-icon">🤖</div>
        <div className="ai-placeholder-title">Coming Soon</div>
        <div className="ai-placeholder-desc">
          Your AI companion will live here — able to search and reflect on your journal entries using your own words.
          <br /><br />
          We're integrating Ollama for a fully local, private AI experience.
        </div>
        <div style={{ 
          marginTop: 8, 
          padding: "8px 16px", 
          background: "var(--bg-tertiary)", 
          borderRadius: "var(--radius-sm)", 
          fontSize: "12px", 
          color: "var(--text-muted)" 
        }}>
          Phase 2 · Local AI with Ollama
        </div>
      </div>
    </div>
  );
}
