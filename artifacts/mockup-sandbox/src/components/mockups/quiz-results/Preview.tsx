import React from "react";

const COLORS = [
  { name: "Terracotta", hex: "#C4784A" },
  { name: "Deep Teal",  hex: "#2D5A6B" },
  { name: "Mustard",    hex: "#C9A227" },
  { name: "Plum",       hex: "#7B5B8A" },
];

const MATERIALS = ["Marble", "Rattan", "Velvet", "Oak", "Linen", "Brass"];

const TAGS = ["Wabi-sabi", "Layered", "Free-spirited", "Grounded", "Global", "Expressive", "Organic", "Curated", "Serene", "Mindful"];

const MATERIAL_IMAGES: Record<string, string> = {
  Marble: "https://images.pexels.com/photos/12956025/pexels-photo-12956025.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  Rattan: "https://www.sketchuptextureclub.com/public/texture_m/0070-synthetic-wicker-texture-seamless.jpg",
  Velvet: "https://static.vecteezy.com/system/resources/thumbnails/035/328/570/small/pink-velvet-fabric-texture-used-as-background-empty-pink-fabric-background-luxury-of-soft-and-smooth-textile-material-there-is-space-for-text-photo.jpg",
  Oak:    "https://www.sketchuptextureclub.com/public/texture/111-teak-wood-fine-medium-color-texture-seamless.jpg",
  Linen:  "https://images.pexels.com/photos/1487713/pexels-photo-1487713.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  Brass:  "https://images.pexels.com/photos/20536223/pexels-photo-20536223/free-photo-of-textured-stone-surface-with-natural-patterns.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}

function makeGradient(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const toHex = (rv: number, gv: number, bv: number) =>
    `#${rv.toString(16).padStart(2,"0")}${gv.toString(16).padStart(2,"0")}${bv.toString(16).padStart(2,"0")}`;
  const tint  = toHex(Math.round(r+(255-r)*0.42), Math.round(g+(255-g)*0.42), Math.round(b+(255-b)*0.42));
  const shade = toHex(Math.round(r*0.58), Math.round(g*0.58), Math.round(b*0.58));
  return `linear-gradient(135deg, ${tint}, ${hex}, ${shade})`;
}

export default function Preview() {
  return (
    <div style={{ background:"#fff", minHeight:"100vh", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth:390, margin:"0 auto", padding:"52px 20px 32px", display:"flex", flexDirection:"column", gap:18 }}>

      {/* Header */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, paddingBottom:4 }}>
        <div style={{ width:48, height:48, borderRadius:24, background:"rgba(0,0,0,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>✦</div>
        <div style={{ fontSize:26, fontWeight:700, textAlign:"center", letterSpacing:-0.5, color:"#111" }}>Your Style Profile</div>
      </div>

      {/* Color Palette */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"1.2px", color:"#999" }}>Color Palette</div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          {COLORS.map((c, i) => (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:7, flex:1 }}>
              <div style={{
                width:64, height:64, borderRadius:"50%",
                background: makeGradient(c.hex),
                boxShadow:"0 3px 10px rgba(0,0,0,0.18)"
              }} />
              <div style={{ fontSize:11, fontWeight:500, textAlign:"center", lineHeight:1.3, maxWidth:70, color:"#111" }}>{c.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Materials */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"1.2px", color:"#999" }}>Materials & Textures</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {MATERIALS.map((m, i) => (
            <div key={i} style={{ position:"relative", borderRadius:12, overflow:"hidden", aspectRatio:"1.05" }}>
              <img
                src={MATERIAL_IMAGES[m] ?? ""}
                alt={m}
                style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
              />
              <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"6px 8px", background:"rgba(0,0,0,0.52)" }}>
                <div style={{ fontSize:11, fontWeight:600, color:"#fff", lineHeight:1.3 }}>{m}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"1.2px", color:"#999" }}>Your Aesthetic</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
          {TAGS.map((t, i) => (
            <div key={i} style={{ padding:"6px 12px", borderRadius:20, border:"1px solid rgba(0,0,0,0.18)", background:"rgba(0,0,0,0.04)", fontSize:12, fontWeight:500, color:"#111" }}>
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button style={{ width:"100%", padding:"15px 0", borderRadius:16, background:"#111", color:"#fff", fontSize:16, fontWeight:600, border:"none", cursor:"pointer", marginTop:4 }}>
        Explore StyleSwipe →
      </button>
    </div>
  );
}
