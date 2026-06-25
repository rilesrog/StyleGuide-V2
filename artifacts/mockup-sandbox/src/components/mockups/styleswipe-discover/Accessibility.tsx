export function Accessibility() {
  const yesCount = 11;
  const total = 25;
  const progress = yesCount / total;

  return (
    <div className="min-h-screen bg-black flex flex-col" style={{ fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}>
      {/* Large readable header with explicit progress label */}
      <div className="px-5 pt-12 pb-4">
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1.2, marginBottom: 14 }}>
          Discover your<br />aesthetic
        </h1>
        {/* Thick labelled progress bar — WCAG compliant contrast */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 8, background: "#2a2a2a", borderRadius: 4 }}>
            <div
              style={{
                height: "100%",
                width: `${progress * 100}%`,
                background: "#fff",
                borderRadius: 4,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          {/* Explicit numeric label — no ambiguity */}
          <span style={{ fontSize: 13, color: "#999", fontWeight: 600, whiteSpace: "nowrap", minWidth: 40 }}>
            {yesCount}/{total}
          </span>
        </div>
      </div>

      {/* Photo with strong border for focus visibility */}
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ height: 460, border: "2px solid #2a2a2a" }}>
        <img
          src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&h=700&fit=crop&q=80"
          alt="Modern living room interior"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Large high-contrast buttons — 80px touch targets, well spaced */}
      <div
        style={{
          padding: "24px 24px 12px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 48,
        }}
      >
        {/* Dismiss — large, high contrast */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <button
            aria-label="Skip this photo"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#111",
              border: "2px solid #444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff5a5a" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span style={{ fontSize: 11, color: "#666", fontWeight: 500, letterSpacing: "0.05em" }}>SKIP</span>
        </div>

        {/* Like — large, maximum contrast */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <button
            aria-label="Love this photo"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#fff",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 0 0 4px rgba(255,255,255,0.15)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#111">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
          <span style={{ fontSize: 11, color: "#999", fontWeight: 500, letterSpacing: "0.05em" }}>LOVE IT</span>
        </div>
      </div>

      {/* Tradeoff callout */}
      <div className="px-5 pb-6 pt-2">
        <p style={{ fontSize: 11, color: "#444", textAlign: "center", lineHeight: 1.5 }}>
          Tradeoff: maximum readability — larger text + touch targets compress the photo area
        </p>
      </div>
    </div>
  );
}
