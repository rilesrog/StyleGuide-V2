export function Hierarchy() {
  const progress = 0.44;

  return (
    <div className="min-h-screen bg-black flex flex-col" style={{ fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}>
      {/* Minimal chrome — recedes so photo dominates */}
      <div className="px-5 pt-12 pb-3 flex flex-col gap-2">
        <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#666", textTransform: "uppercase", fontWeight: 600 }}>
          Discover your aesthetic
        </p>
        {/* Ultra-thin progress bar — present but quiet */}
        <div style={{ height: 2, background: "#222", borderRadius: 1 }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "#fff", borderRadius: 1 }} />
        </div>
      </div>

      {/* Photo — primary content, visually dominant */}
      <div className="flex-1 mx-4 relative" style={{ minHeight: 0 }}>
        <div className="w-full h-full rounded-2xl overflow-hidden relative" style={{ minHeight: 580 }}>
          <img
            src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&h=900&fit=crop&q=80"
            alt="Interior"
            className="w-full h-full object-cover"
            style={{ display: "block" }}
          />
          {/* Gradient at bottom — buttons float over image */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 160,
              background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
              borderRadius: "0 0 16px 16px",
            }}
          />
          {/* Action buttons overlaid on photo gradient */}
          <div
            style={{
              position: "absolute",
              bottom: 28,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              gap: 40,
            }}
          >
            <button
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.12)",
                border: "1.5px solid rgba(255,255,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(8px)",
                cursor: "pointer",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff5a5a" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <button
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "#fff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#111" stroke="none">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tradeoff callout */}
      <div className="px-5 py-4">
        <p style={{ fontSize: 11, color: "#444", textAlign: "center", lineHeight: 1.5 }}>
          Tradeoff: photo as sole focus — chrome is near-invisible, navigation hierarchy is implicit
        </p>
      </div>
    </div>
  );
}
