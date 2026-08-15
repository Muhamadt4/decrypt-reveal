# Implementing Decrypt Reveal

Three ways to ship, from easiest to most integrated. Pick one.

---

## Option 1 — Standalone file (zero setup)

1. Open the [**Playground**](playground.html), load your images, tune the look.
2. Click **⤓ Standalone .html**.
3. You get a single self-contained `.html` file with the library, styles, and images all inlined. Open it anywhere, email it, or drop it on any host.

> The library and styles are embedded directly in the playground page, so the export works even when you open the playground straight from disk (`file://`) — no server needed.

---

## Option 2 — Drop-in (recommended for real sites)

### Components you need

Put these in your project. The two library files come from this repo's [`dist/`](dist/); the images you generate yourself.

| File | Required? | Where to get it |
|---|---|---|
| `decrypt-reveal.js` | ✅ | [`dist/decrypt-reveal.js`](dist/decrypt-reveal.js) — zero dependencies |
| `decrypt-reveal.css` | ✅ | [`dist/decrypt-reveal.css`](dist/decrypt-reveal.css) |
| **base** image (layer 1) | ✅ | Any AI image generator — see [WORKFLOW.md](WORKFLOW.md) |
| **broadcast** image (layer 2) | ✅ | Image-to-image *from* layer 1 — see [WORKFLOW.md](WORKFLOW.md) |
| shimmer **frames** | optional | Re-dithered variants of layer 2 |
| **depth** map | optional | A free depth estimator ([Depth Anything V2](https://huggingface.co/spaces/depth-anything/Depth-Anything-V2) / [MiDaS](https://huggingface.co/spaces/pytorch/MiDaS)) — download the **grayscale** output |

### Wire it up

```html
<!-- in <head> -->
<link rel="stylesheet" href="decrypt-reveal.css">

<!-- where the hero goes -->
<div id="hero" style="width:100%;height:80vh"></div>

<!-- before </body> -->
<script src="decrypt-reveal.js"></script>
<script>
  DecryptReveal('#hero', {
    images: {
      base:      'scene.webp',
      broadcast: 'broadcast.webp'
    }
  });
</script>
```

The container **must have a height** — the effect fills whatever box you give it. See the [full option list](README.md#options) and [`examples/`](examples/).

---

## Option 3 — Let an AI agent wire it up

If you use a coding agent (Claude Code, Cursor, etc.), it can install and wire everything for you.

**Steps:**

1. Make one folder. Put in it: `decrypt-reveal.js`, `decrypt-reveal.css`, and your image files (base, broadcast, and any optional frames/depth map).
2. Open your coding agent **in that folder** — this matters, because the prompt tells the agent to read the files already sitting there.
3. Paste the prompt below. (The [playground](playground.html) generates this same prompt pre-filled with your exact settings — use its **Copy prompt** button for a version tuned to your configuration.)

### The wiring prompt

```text
I want to add the "Decrypt Reveal" hover effect to my website. Run this in the
folder that already contains these files:

- decrypt-reveal.js   (the effect library)
- decrypt-reveal.css  (the effect styles)
- scene.webp          (base image / layer 1)
- broadcast.webp      (broadcast image / layer 2)
- (optional) frame-1.webp, frame-2.webp   (shimmer frames)
- (optional) depth.png                    (grayscale depth map, for parallax)

If any of the images above are missing, stop and tell me which ones — do not
invent placeholders.

Please:
1. Copy decrypt-reveal.js and decrypt-reveal.css into my project's asset folder
   (keep the same filenames), and copy the image files into my images folder.
2. In the page where the hero should appear, add a container element
   (e.g. <div id="hero"></div>) sized how I want the hero to look.
3. Link the stylesheet in <head> and load the script before </body>:
     <link rel="stylesheet" href="PATH/decrypt-reveal.css">
     <script src="PATH/decrypt-reveal.js"></script>
4. Initialise it with this configuration (adjust only the image paths to wherever
   you placed the files):

   DecryptReveal('#hero', {
     images: {
       base:      'scene.webp',
       broadcast: 'broadcast.webp'
     }
   });

5. Make sure the container has a height (the effect fills its container) and that
   nothing overlaps it capturing pointer events. Keep everything self-contained —
   the library has no dependencies. Then show me the final markup you added and where.
```

> **Why "run it in the same folder"?** The agent installs the files that already exist locally instead of guessing at URLs or fabricating stand-in assets. If a file is missing, the prompt makes it tell you rather than invent one.

---

## Framework notes

- **React / Vue / Svelte** — call `DecryptReveal(ref, {...})` after the container mounts, and call the returned instance's `.destroy()` on unmount. It's framework-agnostic; it just needs a DOM element.
- **Next.js / SSR** — initialise inside an effect that runs on the client only (the library touches `window`/`matchMedia`).
- **Content Security Policy** — the effect is inline-free except the WebGL shader source (a string in the JS). No external requests, no eval.

See [README.md](README.md) for the complete API and [WORKFLOW.md](WORKFLOW.md) for generating the images.
