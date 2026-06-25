---
name: Quiz results material images
description: Reliable image URL sources for material texture tiles on the quiz results screen.
---

## Rule
Pexels (`images.pexels.com`) and Pinterest (`i.pinimg.com/originals/`) URLs load reliably in both browser and React Native native. SketchUp Texture Club works but may show a small watermark. Vecteezy thumbnail URLs (`static.vecteezy.com/system/resources/thumbnails/`) are blocked by hotlink protection in the browser (CORS) but load fine in the native app via the device network stack.

**Why:** The quiz results MaterialTile component has an `onError` fallback (dark gray tile) for any URL that fails. Browser-only hotlink failures don't matter for the shipped product, but they do break mockup sandbox previews — use Pexels for anything that also needs to render in the canvas mockup.

**How to apply:** When adding or updating material images, prefer Pexels first. Fall back to Pinterest originals. Only use Vecteezy if the material genuinely has no good Pexels equivalent and you don't need the mockup preview to render it.

## Known working URLs (key materials)
- Marble: `https://images.pexels.com/photos/4709486/pexels-photo-4709486.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400`
- Velvet: `https://images.pexels.com/photos/6044191/pexels-photo-6044191.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400`
- Brass: `https://images.pexels.com/photos/3467946/pexels-photo-3467946.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400`
- Linen/Cotton: `https://images.pexels.com/photos/1487713/pexels-photo-1487713.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400`
- Stone: `https://images.pexels.com/photos/20536223/...`
- Rattan: `https://i.pinimg.com/originals/5a/ec/30/5aec30db18cef864ce24386f96fee596.jpg`
- Oak/Teak/Wood: `https://www.sketchuptextureclub.com/public/texture/111-teak-wood-fine-medium-color-texture-seamless.jpg`
