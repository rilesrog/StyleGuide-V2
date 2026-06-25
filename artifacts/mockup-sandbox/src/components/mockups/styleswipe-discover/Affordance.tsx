export function Affordance() {
  const progress = 0.44;

  return (
    <div className="min-h-screen bg-black flex flex-col" style={{ fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-3">
        <p style={{ fontSize: 13, color: "#999", fontWeight: 500, marginBottom: 8 }}>Discover your aesthetic</p>
        <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "#fff", borderRadius: 2 }} />
        </div>
      </div>

      {/* Card with visible affordance overlays */}
      <div className="flex-1 mx-4 relative" style={{ minHeight: 0 }}>
        <div className="w-full rounded-2xl overflow-hidden relative" style={{ height: 480 }}>
          <img
            src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&h=700&fit=crop&q=80"
            alt="Interior"
            className="w-full h-full object-cover"
          />

          {/* LEFT swipe affordance — clearly visible "not for me" hint */}
          <div
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(220,50,50,0.85)",
              borderRadius: 10,
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              backdropFilter: "blur(4px)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>NOPE</span>
          </div>

          {/* RIGHT swipe affordance — clearly visible "love it" hint */}
          <div
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.9)",
              borderRadius: 10,
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              backdropFilter: "blur(4px)",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111", letterSpacing: "0.04em" }}>LOVE</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9,18 15,12 9,6" />
            </svg>
          </div>
        </div>

        {/* Explicit swipe hint below card */}
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <p style={{ fontSize: 12, color: "#555", letterSpacing: "0.04em" }}>← swipe or tap below →</p>
        </div>
      </div>

      {/* Large labeled buttons — maximum affordance */}
      <div className="px-5 pb-10 pt-4">
        <div style={{ display: "flex", gap: 16 }}>
          <button
            style={{
              flex: 1,
              height: 56,
              borderRadius: 14,
              background: "#111",
              border: "1.5px solid #333",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff5a5a" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Skip</span>
          </button>
          <button
            style={{
              flex: 1,
              height: 56,
              borderRadius: 14,
              background: "#fff",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#111">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Love it</span>
          </button>
        </div>
      </div>

      {/* Tradeoff callout */}
      <div className="px-5 pb-4">
        <p style={{ fontSize: 11, color: "#444", textAlign: "center", lineHeight: 1.5 }}>
          Tradeoff: maximum affordance clarity — card is shorter, controls take more vertical space
        </p>
      </div>
    </div>
  );
}
