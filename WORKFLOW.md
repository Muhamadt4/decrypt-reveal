# The "Decrypt Reveal" Portrait Effect — A Reusable Workflow

Turn a photo of yourself into an interactive hero: hovering reveals a hidden "hacker broadcast" version of the same scene through a cursor-following lens, with live glitches, particle effects, and real 3D depth parallax. Inspired by the Watch Dogs 2 / DedSec propaganda aesthetic and award-site particle portraits.

No 3D scanning, no photoshoot, no paid tools required. You need: one photo of yourself, a free AI image generator with image-to-image support (this guide was built with Gemini), a free depth-estimation tool, and vanilla HTML/CSS/JS (one optional WebGL shader, ~60 lines, no libraries).

---

## 1. How the effect works (the architecture)

The illusion is two perfectly-aligned images of the same scene stacked on top of each other, with a masked "lens" cutting through the top... inverted: the **normal photo** is the base, the **hacker version** sits above it, hidden by a CSS `mask-image` radial gradient whose position and radius are animated with JavaScript. Everything else is layered garnish:

```
z1  base photo            (or a WebGL canvas rendering it with depth parallax)
z2  ghost copies          (RGB-split glitch slices, shown in bursts)
z3  reveal frames         (2–3 variants of the hacker image, opacity-flipped)
z4  scanlines             (CSS repeating-linear-gradient)
z5  glitch tear           (full-width strip of the hacker image, flashed)
z6  vignette              (CSS radial-gradient)
z7  film grain            (SVG feTurbulence, jittered with steps() keyframes)
z8  particle canvas       (2D canvas: rim particles, dust, reticle cursor)
z10 HUD                   (mono-font labels: REC, coords, DECRYPTING %)
```

Layers 3–5 share one mask:

```css
mask-image: radial-gradient(circle at var(--mx) var(--my),
            #000 calc(var(--r) * 0.42), transparent var(--r));
```

A `requestAnimationFrame` loop lerps `--mx/--my` toward the cursor (factor ~0.13 — the lag is what makes it cinematic) and `--r` toward a target radius (0 when idle, ~30% of stage width on hover, ~75% of the stage diagonal while holding, which is the "full decrypt").

**The golden performance rule:** every animated property in the per-frame path must be `opacity`, `transform`, or `clip-path` (plus the mask variables). These run on the GPU compositor. No canvas pixel-pushing, no layout properties. This is why the whole effect runs smoothly on phones.

### The behaviors that make it feel alive
- **Intro sweep** — on page load the lens auto-opens over the face and drifts for ~2s, so visitors discover the interaction without being told.
- **Glitch bursts** — random every 0.7–2.6s while hovering, lasting 90–180ms: ghost copies flash with random `clip-path: inset()` slices and X offsets, the reveal micro-jitters ±2px, and there's a ~30% chance of a full-width tear.
- **Frame shimmer** — the hacker layer is 2–3 variants of the same image with different dot patterns; flipping their opacity makes the dots themselves crawl like a CRT re-dithering. Slow flicks while idle, rapid flips (~60ms) during bursts.
- **Hold to decrypt** — pointer-down expands the mask over the whole image with a `DECRYPTING ▓▓▓░░ 64%` HUD readout ending in `ACCESS GRANTED`.
- **Depth parallax** (optional WebGL upgrade) — the base photo is rendered through a tiny fragment shader that offsets UVs by a depth map times the cursor offset, so the subject genuinely shifts against the background in 3D.

### Fallbacks (don't skip these)
- `prefers-reduced-motion` → static photo, simple opacity crossfade on hover, no canvas.
- WebGL unavailable / shader fails → plain `<img>` stays (keep the GL canvas `display:none` until textures are confirmed loaded).
- Touch → pointer events + `touch-action: none` on the stage; drag scans, long-press decrypts.

---

## 2. The asset pipeline (where the real magic is)

Everything depends on one principle: **every derived asset is generated from the locked previous stage, never from the original photo.** The dependency tree:

```
your photo → LAYER 1 (scene) → LAYER 2 (hacker version) → variant frames / video
                    └→ depth map
```

If you regenerate a stage, everything downstream must be regenerated. So iterate each stage until you genuinely love it before spending runs on the next.

### Stage A — Layer 1: the photoreal scene
Pass: **your portrait photo** (identity reference). Text-to-image.

Design decisions that matter:
- **Seed the scene with "secrets."** The lens effect only invites exploration if ordinary objects transform in layer 2 (a monitor, sticky notes, a router, windows across the street). Write them into the layer-1 prompt as a dense object list. Expect the generator to nail ~70% of the list — re-roll and pick the densest result.
- **Fight the polish.** AI images default to staged product-render perfection. Demand grime explicitly: worn edges, smudges, flyaway hairs, film grain, asymmetry.
- **Ultra-wide lens = better parallax later**, but protect the face: keep the subject dead-center ("he stands two meters from the camera") and put face-warping terms in the negative prompt.
- **Match your site's palette** in the lighting description (name your actual hex values).
- If the image will sit under text, dictate the quiet zones ("bottom-left quadrant stays dark and empty").

Prompt skeleton (adapt the bracketed parts):

```
Cinematic photorealistic scene, landscape 16:9, high resolution (2880×1620), shot on
an ULTRA-WIDE cinema lens (14–16mm look): dramatic converging lines, slight barrel
character at the edges. The subject stands DEAD-CENTER where the lens has no
distortion — his face must stay natural; only the environment stretches.

CAMERA: slightly below chest height, tilted gently upward — low heroic angle.

IDENTITY & POSE: the person from the attached reference photo ([your features]).
Keep their EXACT pose from the reference. They are the FOREGROUND: chest-up, large
in frame, tack sharp, head upper-center, two meters from the camera.

BEHIND THEM (softly out of focus, every object recognizable through the blur):
[dense list of "secret" objects: screens with content, pinned notes, small lights,
personal items, a window/balcony with a view].

ANTI-POLISH: must NOT look staged. Real skin texture, flyaway hairs, fabric pilling,
dust motes, smudges, natural asymmetry, cinematic film grain. No retouching.

LIGHTING: harsh chiaroscuro, Caravaggio-style. Deep [your dark hex] shadows, never
pure black, pierced by small pools of [your accent hex] light. All four edges fall
into darkness.

COMPOSITION: subject dominant center, [your quiet zone] stays dark and empty. All
critical detail inside the central vertical third (survives a mobile 9:19.5 crop).
```

Negative: `warm dominant light, daylight, bright walls, luxury setup, RGB gaming
lights, saturated colors, flat even lighting, staged showroom look, airbrushed skin,
empty minimal desk, pure black, fisheye face warping, distorted facial features`

### Stage B — Layer 2: the hacker broadcast version
Pass **two images in this order**: (1) your locked layer 1, (2) a style reference
screenshot (DedSec broadcast or similar). Image-to-image, strength ~0.55–0.65.

Design decisions that matter:
- **Open the prompt with the "layout law."** Image models weight the prompt opening
  heaviest, and composition drift is the one thing that kills the effect. State that
  the output must be pixel-identical in composition before describing any styling.
- **Map each secret explicitly**: name each real object and what it becomes
  (notes → ciphertext, photos → surveillance frames with targeting brackets, LEDs →
  blinking data nodes, windows → each gets a faint targeting bracket).
- **Ban the glow.** "No glow, no bloom, no halos, no neon" — bloom is what makes AI
  glitch-art look like a cheap gaming poster instead of a raw broadcast.
- **Demand darkness**: "at least 60% of the frame is darkness; dots only resolve
  where light existed in IMAGE 1." The menace lives in what you can't see.
- **Realistic screens**: never ask for skulls/logos (models render clip-art icons).
  Describe terminal STRUCTURE instead: panes, columns, hexdump offsets, port-scan
  tables, a progress bar. Structure reads as real; symbols read as childish.

Prompt skeleton:

```
You are given TWO images:
- IMAGE 1: [describe your scene]. This is the SUBJECT and the LAYOUT LAW: the output
  must be PIXEL-IDENTICAL in composition — same angle, pose, framing, position and
  size of every object, same depth of field. NOTHING moves, is added, or removed.
- IMAGE 2: a hacker propaganda broadcast screenshot. This is the STYLE LAW: copy its
  visual treatment only. Do NOT copy its content, characters, or skull.

TRANSFORMATION: re-render IMAGE 1 entirely as a corrupted broadcast — everything
rebuilt from coarse, chunky, flat white and [accent hex] stipple dots and rough
ASCII-like clusters on deep [dark hex] (blue-leaning, never pure black). Dots look
printed and degraded, like a screen-burned CRT. NO glow, NO bloom, NO neon.

THE PERSON: same pose, same place, rebuilt in halftone dots — face clearly
recognizable, silhouette edges dissolving into scattered dot particles. Brutal
contrast: only the lit areas resolve into dense dots; the rest sinks into darkness,
traced by a thin broken dotted outline.

THE SECRETS (each object stays exactly in place, transformed, still defocused):
[one line per object: what it was → what it becomes]

ATMOSPHERE: fine dot particles drifting in the dark air; a few harsh horizontal
glitch tears; rough scanlines; heavy analog grain. Minimal and dirty — no particle
explosions, no decorative circuit patterns, no sparkles.

LIGHT LOGIC: dots only resolve where light existed in IMAGE 1. At least 60% of the
frame is darkness. Ominous, underground, surveillance-broadcast menace.
```

Negative: `glow, bloom, lens flare, neon, colorful, photorealistic areas, smooth
gradients, polished, 3D render, cartoon, poster art, changed composition, moved
objects, added objects, sharp background, readable real-world text, bright scene,
pure black`

**Fixing details without re-rolling:** when one element comes out wrong (usually a
screen), do a targeted edit — pass only the layer 2 image with "keep EVERYTHING
exactly as it is... change ONLY the following: [numbered fixes]." If a multi-part
edit drifts, run single-target edits sequentially. Floating ASCII wall-text is the
biggest "AI-generated" tell — always remove it.

### Stage C — Variant frames (the dot shimmer)
Pass: **your final layer 2 only.** Run twice for two variants.

```
Regenerate this EXACT image as the next frame of the same corrupted broadcast. The
composition is FROZEN — a viewer flipping between the two images should see the same
photograph; only the transmission corruption changes. Change ONLY: (1) re-dither
every halftone dot with different random placement, (2) new glitch tears at
different heights, (3) drifting particles at new positions, (4) the terminal text
scrolled to the next moment, progress bar advanced, (5) scanline/noise phase
shifted. Do NOT change: the face, brightness distribution, which areas are lit, or
any object's position.
```

Verify alignment: blend the base and each variant at 50% opacity — you should see ONE
clean image with only the tears ghosted. Double edges = misaligned = re-roll.

**Video alternative:** image-to-video generation gives organic motion. Key prompt
rules: locked-off camera (zero pan/zoom/drift), the person frozen (no breathing,
blinking, swaying), background elements animating INDEPENDENTLY ("never everything
at once" — synchronized pulsing reads as a cheap loop), continuous loopable rhythm
with no build-up or fade. Then either extract 4–6 evenly-spaced frames
(`ffmpeg -i clip.mp4 -vf "fps=2" f_%02d.png`) or use the looping muted `<video>`
itself as the reveal layer with the same CSS mask (smoother, ~1–3MB heavier).
Hard reject rule: ANY camera drift or subject movement — that's unfixable downstream.

### Stage D — Depth map (for the parallax)
Pass **layer 1** into a free monocular depth estimator (Depth Anything V2 spaces on
Hugging Face; MiDaS also works). Download the **grayscale** output (bright = near),
not the colored visualization. Preprocess: resize to your photo's exact aspect
ratio (~512px wide is plenty), apply a gaussian blur (radius 2–3) to smooth edges.

---

## 3. Implementation notes (the code side)

The full reference implementation is a single self-contained HTML file (~500 lines,
no dependencies). Rather than paste it all here, this section covers the parts that
aren't obvious and the bugs you WILL hit.

### The reveal loop (core mechanism)
```js
// per frame: lerp lens toward cursor, radius toward target, write CSS vars
S.lx = lerp(S.lx, S.px, 1 - Math.pow(1 - 0.13, dt * 60));   // frame-rate independent
S.r  = lerp(S.r, S.targetR + breath, 1 - Math.pow(1 - 0.085, dt * 60));
for (const el of [reveal, scanlines, ghost1, ghost2]) {
  el.style.setProperty('--mx', (S.lx * 100).toFixed(3) + '%');
  el.style.setProperty('--my', (S.ly * 100).toFixed(3) + '%');
  el.style.setProperty('--r',  Math.max(0, S.r).toFixed(1) + 'px');
}
```
`1 - Math.pow(1 - k, dt * 60)` makes lerp speed identical at 60Hz and 144Hz.

### Glitch bursts
A scheduler picks a random `nextGlitch` time; during a burst (~90–180ms), each frame
randomizes the ghosts' `clip-path: inset(y% 0 …)` slice, `translateX`, and opacity,
flips the reveal frame every ~60ms, and jitters the frame stack ±2px. Outside bursts
everything snaps clean. Bursts > continuous wiggle, always.

### The depth-parallax fragment shader (the whole thing)
```glsl
precision mediump float; varying vec2 v;
uniform sampler2D uT;   // photo
uniform sampler2D uD;   // depth map (bright = near)
uniform vec2 uO;        // cursor offset * strength (~0.017, 0.012)
void main(){
  float d  = texture2D(uD, v).r;
  float e  = 0.012;     // edge detection spread
  float gx = texture2D(uD, v+vec2(e,0.)).r - texture2D(uD, v-vec2(e,0.)).r;
  float gy = texture2D(uD, v+vec2(0.,e)).r - texture2D(uD, v-vec2(0.,e)).r;
  float edge = clamp(1.0 - 5.0*length(vec2(gx,gy)), 0.0, 1.0);
  gl_FragColor = vec4(texture2D(uT, v + uO*(d-0.5)*edge).rgb, 1.0);
}
```
The `edge` term is essential: without it, depth boundaries smear background pixels
across silhouettes in ugly streaks. It attenuates the offset wherever the depth
gradient is steep, pinning silhouettes in place. Drive `uO` from a slow-lerped
(~0.05) cursor offset tracked across the WHOLE page plus a faint sine drift so the
image breathes when the cursor is still. Use `CLAMP_TO_EDGE` texture wrapping.

### Bugs you will hit (we did)
1. **Compositor stacking:** an accelerated WebGL canvas can paint ABOVE later masked
   siblings in Chromium regardless of DOM order. Give every layer an explicit
   `z-index`. (Symptom: "the reveal stopped working" while the ring/particles still
   draw — the reveal is rendering underneath the canvas.)
2. **Temporal dead zone:** if your `resize()` handler touches GL state, make sure
   the initial `resize()` call runs AFTER the `let gl` declarations execute.
   (Symptom: `Cannot access 'gl' before initialization` and a dead page.)
3. **Opaque canvas before first draw:** a WebGL canvas with `alpha:false` composites
   as solid black before anything is drawn. Keep it `display:none` until textures
   are loaded and the first frame is safe, so the `<img>` fallback shows through.
4. **Never let GL kill the loop:** wrap the GL draw in try/catch inside your rAF —
   a lost context should degrade the parallax, not freeze the whole effect.

### Performance & delivery
- Assets: photo + hacker frames as WebP (~q85). The hacker layer at 2× display size
  keeps the stipple dots crisp on retina. A three-frame set lands around 700KB.
- Lazy-load the variant frames after page load — the CSS burst glitch covers the
  first seconds if someone hovers instantly.
- Cap `devicePixelRatio` at 2 for all canvases; pause the rAF loop when the tab is
  hidden or the section is off-screen (IntersectionObserver).
- Duplicated copies of the same image (ghosts, tear) cost nothing extra: the
  browser decodes each unique URL once.

---

## 4. Suggested build order

1. Generate layer 1 → iterate until locked.
2. Generate layer 2 → targeted-edit the screens → lock.
3. Static demo: two stacked images + the masked lens + hold-to-decrypt. (Already
   impressive; ship-able.)
4. Add bursts, ghosts, tear, scanlines, grain, HUD, particles.
5. Generate variants (or video) → add the frame shimmer.
6. Generate depth map → add the WebGL parallax with the edge-aware shader.
7. Fallbacks + performance guardrails → integrate into your site.

Each step is independently shippable, so you can stop wherever the effort/wow ratio
stops making sense for you.

## 5. Extension ideas (the "hard to imitate" tier)
- Rebuild the hacker layer as a real GPU particle field: sample the bright dots into
  ~50–150k points, render as gl.POINTS, displace them in the vertex shader with a
  cursor "touch trail" texture. The dots physically scatter and reform.
- Give the hacker layer its own depth response so both layers parallax.
- Audio: a faint broadcast hiss that intensifies during bursts (behind a user
  gesture, muted by default).

---

*Workflow developed iteratively: portrait → studio-background version → scene-based
version with seeded secrets → ultra-wide cinematic reframe → video-driven animation.
The single most transferable lesson: lock composition FIRST (the "layout law" prompt
opening + blend-verification), because alignment is the entire illusion.*
