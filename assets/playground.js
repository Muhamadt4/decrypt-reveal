(() => {
  const $ = s => document.querySelector(s);
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1500); };

  // ── demo assets (relative paths, resolved to absolute for export) ──
  const DEMO = {
    base:'assets/demo/scene.webp', broadcast:'assets/demo/broadcast.webp',
    frames:['assets/demo/frame-1.webp','assets/demo/frame-2.webp'],
    depth:'assets/demo/depth.png', parallaxBase:'assets/demo/portrait.webp'
  };

  // ── default config (mirrors DecryptReveal.defaults) ──
  const D = DecryptReveal.defaults;
  const freshCfg = () => ({
    lensRadius:D.lensRadius, fullRadius:D.fullRadius, softness:D.softness, lag:D.lag, radiusLag:D.radiusLag,
    intro:D.intro, glitch:D.glitch, scanlines:D.scanlines, particles:D.particles, vignette:D.vignette,
    flipInterval:D.flipInterval, flipBurst:D.flipBurst,
    hideCursor:D.hideCursor, hud:D.hud, hudLabel:D.hudLabel, hint:D.hint,
    accent:D.accent, particleColor:D.particleColor, ghostTint:D.ghostTint,
    parallax:D.parallax, parX:D.parallaxStrength[0], parY:D.parallaxStrength[1]
  });

  // images state: {src, name, isDemo} per slot; frames = array
  // default playground state: only the two required layers are preloaded.
  // frames / depth / parallax are opt-in — the user adds their own.
  const freshImgs = () => ({
    base:{src:DEMO.base, name:'scene.webp', isDemo:true},
    broadcast:{src:DEMO.broadcast, name:'broadcast.webp', isDemo:true},
    depth:null,
    parallaxBase:null,
    frames:[]
  });

  let cfg = freshCfg();
  let imgs = freshImgs();
  let instance = null;

  // ── build the live instance ──
  function buildConfig() {
    return {
      images: {
        base: imgs.base.src, broadcast: imgs.broadcast.src,
        frames: imgs.frames.map(f => f.src),
        depth: imgs.depth ? imgs.depth.src : null,
        parallaxBase: imgs.parallaxBase ? imgs.parallaxBase.src : null
      },
      lensRadius:cfg.lensRadius, fullRadius:cfg.fullRadius, softness:cfg.softness,
      lag:cfg.lag, radiusLag:cfg.radiusLag,
      intro:cfg.intro, glitch:cfg.glitch, scanlines:cfg.scanlines, particles:cfg.particles,
      vignette:cfg.vignette, flipInterval:cfg.flipInterval, flipBurst:cfg.flipBurst,
      hideCursor:cfg.hideCursor, hud:cfg.hud, hudLabel:cfg.hudLabel, hint:cfg.hint,
      accent:cfg.accent, particleColor:cfg.particleColor, ghostTint:cfg.ghostTint,
      parallax:cfg.parallax, parallaxStrength:[cfg.parX, cfg.parY]
    };
  }
  let previewOn = true;   // keep the lens pinned open so every change is visible
  function rebuild() {
    if (instance) instance.destroy();
    $('#dr').innerHTML = '';
    try {
      instance = new DecryptReveal($('#dr'), buildConfig());
      if (previewOn && instance.setPreview) instance.setPreview(true);
    } catch(e){ console.error(e); }
    updateExport();
  }
  // cheap parameter change → mutate the running instance, no reset
  function applyLive(patch) { if (instance && instance.update) instance.update(patch); updateExport(); }
  // structural change (which layers exist / images) → fresh instance
  function applyStructural() { rebuild(); }

  // ── control factories ──
  // live keys apply to the running instance; parX/parY fold into parallaxStrength
  function liveApply(key) {
    if (key === 'parX' || key === 'parY') applyLive({ parallaxStrength: [cfg.parX, cfg.parY] });
    else applyLive({ [key]: cfg[key] });
  }
  function slider(mount, key, label, min, max, step, hint) {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<label>${label}<span class="val"></span></label>
      <input type="range" min="${min}" max="${max}" step="${step}">
      ${hint?`<div class="hint">${hint}</div>`:''}`;
    const inp = row.querySelector('input'), val = row.querySelector('.val');
    const fmt = v => (+v).toFixed(step < 1 ? 3 : 0);
    inp.value = cfg[key]; val.textContent = fmt(cfg[key]);
    inp.addEventListener('input', () => { cfg[key] = +inp.value; val.textContent = fmt(inp.value); liveApply(key); });
    mount.appendChild(row);
  }
  // toggles are structural (they add/remove layers) unless flagged live
  function toggle(mount, key, label, hint, live) {
    const row = document.createElement('label'); row.className = 'toggle';
    row.innerHTML = `<span>${label}${hint?`<div class="hint">${hint}</div>`:''}</span>
      <input type="checkbox" ${cfg[key]?'checked':''}><span class="sw"></span>`;
    row.querySelector('input').addEventListener('change', e => {
      cfg[key] = e.target.checked;
      live ? applyLive({ [key]: cfg[key] }) : applyStructural();
    });
    mount.appendChild(row);
  }
  function color(mount, key, label) {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<label>${label}</label>
      <div class="colorrow"><input type="color" value="${cfg[key]}"><span class="hex">${cfg[key]}</span></div>`;
    const inp = row.querySelector('input'), hex = row.querySelector('.hex');
    inp.addEventListener('input', () => { cfg[key] = inp.value; hex.textContent = inp.value; liveApply(key); });
    mount.appendChild(row);
  }
  function textField(mount, key, label, hint) {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<label>${label}</label><input type="text" value="${cfg[key]}">${hint?`<div class="hint">${hint}</div>`:''}`;
    row.querySelector('input').addEventListener('input', e => { cfg[key] = e.target.value; liveApply(key); });
    mount.appendChild(row);
  }

  // ── image slots ──
  const SLOTS = [
    {key:'base', label:'Base · the scene', req:true, sub:'Layer 1 — the photoreal photo'},
    {key:'broadcast', label:'Broadcast · corrupted', req:true, sub:'Layer 2 — generated from the base'},
    {key:'depth', label:'Depth map', req:false, sub:'Grayscale, bright = near → adds 3D parallax',
      ref:'No depth map? Drop your <b>base</b> photo into a free depth estimator — '
        + '<a href="https://huggingface.co/spaces/depth-anything/Depth-Anything-V2" target="_blank" rel="noopener">Depth Anything V2</a> '
        + 'or <a href="https://huggingface.co/spaces/pytorch/MiDaS" target="_blank" rel="noopener">MiDaS</a> — '
        + 'download the <b>grayscale</b> output (not the coloured one), then add it here.'},
    {key:'parallaxBase', label:'Parallax base', req:false, sub:'Image the depth map moves — defaults to the base photo'}
  ];
  function fileToDataURL(file) {
    return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  }
  function renderSlots() {
    const mount = $('#imageSlots'); mount.innerHTML = '';
    SLOTS.forEach(s => {
      const cur = imgs[s.key];
      const slot = document.createElement('div'); slot.className = 'slot';
      slot.innerHTML = `
        <img class="thumb" src="${cur?cur.src:''}" alt="" style="${cur?'':'visibility:hidden'}">
        <div class="meta">
          <div class="name">${cur?cur.name:'— none —'}</div>
          <div class="sub">${s.sub}${s.req?' <span class="req">· required</span>':(cur?'':' · optional, not used')}</div>
          <div style="margin-top:.45rem;display:flex;gap:.4rem">
            <label class="btn sm" style="position:relative;overflow:hidden">${cur?'Replace':'+ Add'}<input type="file" accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
            ${(!s.req && cur)?'<button type="button" class="btn sm ghost dr-remove">Remove</button>':''}
          </div>
          ${(s.ref && !cur)?`<div class="slotref">${s.ref}</div>`:''}
        </div>`;
      slot.querySelector('input').addEventListener('change', async e => {
        const f = e.target.files[0]; if (!f) return;
        imgs[s.key] = {src:await fileToDataURL(f), name:f.name, isDemo:false};
        renderSlots(); rebuild();
      });
      const rm = slot.querySelector('.dr-remove');
      if (rm) rm.addEventListener('click', () => { imgs[s.key] = null; renderSlots(); rebuild(); });
      mount.appendChild(slot);
    });
    // frames (multiple)
    const fslot = document.createElement('div'); fslot.className = 'slot multi';
    fslot.innerHTML = `<div class="meta">
        <div class="name">Shimmer frames · ${imgs.frames.length}</div>
        <div class="sub">Re-dithered variants — flipped for the CRT crawl${imgs.frames.length?'':' · optional'}</div>
        <div class="framethumbs">${imgs.frames.map((f,i)=>`<span class="fthumb"><img src="${f.src}" alt=""><button type="button" class="fremove" data-i="${i}" title="Remove ${f.name}">×</button></span>`).join('') || '<span class="sub" style="opacity:.6">none added</span>'}</div>
        <div style="margin-top:.5rem;display:flex;gap:.4rem">
          <label class="btn sm" style="position:relative;overflow:hidden">+ Add<input type="file" accept="image/*" multiple style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
          ${imgs.frames.length?'<button type="button" class="btn sm ghost" id="clearFrames">Clear all</button>':''}
        </div>
      </div>`;
    fslot.querySelector('input').addEventListener('change', async e => {
      for (const f of e.target.files) imgs.frames.push({src:await fileToDataURL(f), name:f.name, isDemo:false});
      renderSlots(); rebuild();
    });
    const clr = fslot.querySelector('#clearFrames');
    if (clr) clr.addEventListener('click', () => { imgs.frames = []; renderSlots(); rebuild(); });
    fslot.querySelectorAll('.fremove').forEach(b => b.addEventListener('click', () => {
      imgs.frames.splice(+b.dataset.i, 1); renderSlots(); rebuild();
    }));
    $('#imageSlots').appendChild(fslot);
  }

  // ── build all panels ──
  function buildControls() {
    const L = $('#lensCtrls'); L.innerHTML='';
    slider(L,'lensRadius','Hover radius',0.10,0.45,0.005,'Lens size on hover (fraction of width)');
    slider(L,'fullRadius','Decrypt radius',0.40,1.20,0.01,'Lens size while holding (fraction of diagonal)');
    slider(L,'softness','Edge softness',0,0.9,0.01,'Inner solid fraction of the mask');
    slider(L,'lag','Cursor lag',0.03,0.40,0.005,'Lower = laggier / more cinematic');
    slider(L,'radiusLag','Radius lag',0.02,0.30,0.005);

    const B = $('#behaviorCtrls'); B.innerHTML='';
    toggle(B,'intro','Auto intro sweep','Opens the lens on load so visitors notice it');
    toggle(B,'glitch','Glitch bursts');
    toggle(B,'scanlines','Scanlines');
    toggle(B,'particles','Particle canvas');
    toggle(B,'vignette','Vignette');
    slider(B,'flipInterval','Frame interval · idle',150,2000,10,'ms between shimmer-frame flips (needs 2+ frames)');
    slider(B,'flipBurst','Frame interval · burst',30,400,5,'ms between flips during a glitch burst');
    toggle(B,'hideCursor','Hide OS cursor','Draw the reticle instead');
    toggle(B,'hud','Show HUD');
    toggle(B,'parallax','WebGL depth parallax','Needs a depth map');
    slider(B,'parX','Parallax X',0,0.06,0.001,'Horizontal shift strength');
    slider(B,'parY','Parallax Y',0,0.06,0.001,'Vertical shift strength');

    const C = $('#colorCtrls'); C.innerHTML='';
    color(C,'accent','Accent');
    color(C,'particleColor','Particles / reticle');
    toggle(C,'ghostTint','RGB-split ghost tint','',true);

    const H = $('#hudCtrls'); H.innerHTML='';
    textField(H,'hudLabel','Signal label');
    textField(H,'hint','Hint text','Shown until the first hover');
  }

  // ── export code generation ──
  let exportTab = 'snippet';
  function imgPathForExport(o, fallbackName) {
    // demo images export as their repo-relative path; uploaded images export as the saved filename
    return o.isDemo ? o.src : o.name;
  }
  function nonDefault() {
    const d = freshCfg(); const out = {};
    for (const k in cfg) if (cfg[k] !== d[k]) out[k] = cfg[k];
    return out;
  }
  // list the non-default scalar options (parX/parY fold into parallaxStrength)
  function optionEntries() {
    const nd = nonDefault();
    const entries = Object.keys(nd).filter(k => k !== 'parX' && k !== 'parY').map(k => [k, cfg[k]]);
    if (nd.parX !== undefined || nd.parY !== undefined) entries.push(['parallaxStrength', [cfg.parX, cfg.parY]]);
    return entries;
  }
  function configLiteral(paths) {
    const img = [`base:      '${paths.base}'`, `broadcast: '${paths.broadcast}'`];
    if (paths.frames.length) img.push(`frames:    [${paths.frames.map(f=>`'${f}'`).join(', ')}]`);
    if (paths.depth) img.push(`depth:     '${paths.depth}'`);
    if (paths.parallaxBase) img.push(`parallaxBase: '${paths.parallaxBase}'`);
    const opts = optionEntries();
    const lines = ['  images: {'];
    img.forEach((l, i) => lines.push('    ' + l + (i < img.length - 1 ? ',' : '')));
    lines.push('  }' + (opts.length ? ',' : ''));
    opts.forEach(([k, v], i) => {
      const val = Array.isArray(v) ? `[${v.join(', ')}]` : (typeof v === 'string' ? `'${v}'` : v);
      lines.push(`  ${k}: ${val}` + (i < opts.length - 1 ? ',' : ''));
    });
    return lines.join('\n');
  }
  function currentPaths() {
    return {
      base: imgPathForExport(imgs.base),
      broadcast: imgPathForExport(imgs.broadcast),
      frames: imgs.frames.map(f=>imgPathForExport(f)),
      depth: (cfg.parallax && imgs.depth) ? imgPathForExport(imgs.depth) : (imgs.depth?imgPathForExport(imgs.depth):null),
      parallaxBase: imgs.parallaxBase ? imgPathForExport(imgs.parallaxBase) : null
    };
  }
  function snippetCode() {
    const paths = currentPaths();
    return `<link rel="stylesheet" href="decrypt-reveal.css">

<div id="hero"></div>

<script src="decrypt-reveal.js"><\/script>
<script>
  DecryptReveal('#hero', {
${configLiteral(paths)}
  });
<\/script>`;
  }
  function configCode() {
    const paths = currentPaths();
    const obj = { images: { base: paths.base, broadcast: paths.broadcast } };
    if (paths.frames.length) obj.images.frames = paths.frames;
    if (paths.depth) obj.images.depth = paths.depth;
    if (paths.parallaxBase) obj.images.parallaxBase = paths.parallaxBase;
    optionEntries().forEach(([k, v]) => { obj[k] = v; });
    return JSON.stringify(obj, null, 2);
  }
  // filenames the AI agent should expect in the working folder
  function localName(o, fallback) {
    if (!o) return null;
    return o.isDemo ? o.src.split('/').pop() : o.name;
  }
  function wiringPrompt() {
    const files = [];
    files.push('- decrypt-reveal.js   (the effect library)');
    files.push('- decrypt-reveal.css  (the effect styles)');
    files.push('- ' + localName(imgs.base) + '   (base image / layer 1)');
    files.push('- ' + localName(imgs.broadcast) + '   (broadcast image / layer 2)');
    if (imgs.frames.length) files.push('- ' + imgs.frames.map(f=>localName(f)).join(', ') + '   (shimmer frames)');
    if (imgs.depth) files.push('- ' + localName(imgs.depth) + '   (grayscale depth map, for parallax)');
    if (imgs.parallaxBase) files.push('- ' + localName(imgs.parallaxBase) + '   (image the depth map moves)');

    // config with local filenames
    const paths = {
      base: localName(imgs.base), broadcast: localName(imgs.broadcast),
      frames: imgs.frames.map(f=>localName(f)),
      depth: (cfg.parallax && imgs.depth) ? localName(imgs.depth) : null,
      parallaxBase: imgs.parallaxBase ? localName(imgs.parallaxBase) : null
    };
    const conf = { images: { base: paths.base, broadcast: paths.broadcast } };
    if (paths.frames.length) conf.images.frames = paths.frames;
    if (paths.depth) conf.images.depth = paths.depth;
    if (paths.parallaxBase) conf.images.parallaxBase = paths.parallaxBase;
    optionEntries().forEach(([k,v]) => { conf[k] = v; });

    return `I want to add the "Decrypt Reveal" hover effect to my website. Run this in the folder that already contains these files:

${files.join('\n')}

If any of the images above are missing, stop and tell me which ones — do not invent placeholders.

Please:
1. Copy decrypt-reveal.js and decrypt-reveal.css into my project's asset folder (keep the same filenames), and copy the image files into my images/asset folder.
2. In the page where the hero should appear, add a container element (e.g. <div id="hero"></div>) sized how I want the hero to look.
3. Link the stylesheet in <head> and load the script before </body>:
   <link rel="stylesheet" href="PATH/decrypt-reveal.css">
   <script src="PATH/decrypt-reveal.js"><\/script>
4. Initialise it with exactly this configuration (adjust only the image paths to wherever you placed the files):

DecryptReveal('#hero', ${JSON.stringify(conf, null, 2)});

5. Make sure the container has a height (the effect fills its container) and that nothing overlaps it with pointer-events. Keep everything self-contained — the library has no dependencies. Then show me the final markup you added and where.`;
  }

  function updateExport() {
    $('#exportCode').textContent = exportTab==='snippet' ? snippetCode() : configCode();
    const pc = $('#promptCode'); if (pc) pc.textContent = wiringPrompt();
    const anyUpload = !imgs.base.isDemo || !imgs.broadcast.isDemo || imgs.frames.some(f=>!f.isDemo)
      || (imgs.depth&&!imgs.depth.isDemo) || (imgs.parallaxBase&&!imgs.parallaxBase.isDemo);
    $('#exportNote').innerHTML = anyUpload
      ? 'Snippet references your files by name — save each uploaded image next to your page (or use the standalone export to inline everything).'
      : 'Using the demo images. Swap in your own above, then re-copy. Grab <span class="mono">decrypt-reveal.js</span> + <span class="mono">.css</span> from the <a href="dist/">dist</a> folder.';
  }

  // ── standalone .html export (inlines everything, works even from file://) ──
  // Image → data URI via a canvas (no fetch needed; same-origin files won't taint).
  function toDataURL(o) {
    return new Promise(resolve => {
      if (!o) return resolve(null);
      if (o.src.startsWith('data:')) return resolve(o.src);
      const im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
          c.getContext('2d').drawImage(im, 0, 0);
          resolve(c.toDataURL('image/webp', 0.9));
        } catch(e){ resolve(null); }
      };
      im.onerror = () => resolve(null);
      im.src = o.src;
    });
  }
  // The effect's CSS and JS are embedded in this page (see the #dr-css-src <style>
  // and #dr-lib-src <script> in playground.html, filled by build-playground.js).
  // Reading their textContent works offline (file://) with no fetch — so the
  // standalone export always inlines the real library.
  async function getCSS() {
    const el = document.getElementById('dr-css-src');
    if (el && el.textContent.trim()) return el.textContent.trim();
    try { const r = await fetch('dist/decrypt-reveal.css'); if (r.ok) return await r.text(); } catch(e){}
    return null;
  }
  async function getJS() {
    const el = document.getElementById('dr-lib-src');
    if (el && el.textContent.trim()) return el.textContent.trim();
    try { const r = await fetch('dist/decrypt-reveal.js'); if (r.ok) return await r.text(); } catch(e){}
    return null;
  }
  async function downloadStandalone() {
   try {
    toast('Building…');
    const [css, js] = await Promise.all([getCSS(), getJS()]);
    const di = {
      base: await toDataURL(imgs.base),
      broadcast: await toDataURL(imgs.broadcast),
      frames: (await Promise.all(imgs.frames.map(toDataURL))).filter(Boolean),
      depth: cfg.parallax ? await toDataURL(imgs.depth) : null,
      parallaxBase: await toDataURL(imgs.parallaxBase)
    };
    const conf = buildConfig();
    conf.images = di;
    // If JS/CSS couldn't be read (opened via file://), reference the dist/ files instead of inlining.
    const cssBlock = css ? `<style>\n${css}\n</style>` : `<link rel="stylesheet" href="dist/decrypt-reveal.css">`;
    const jsBlock  = js  ? `<script>\n${js}\n<\/script>`  : `<script src="dist/decrypt-reveal.js"><\/script>`;
    const offlineNote = (css && js) ? '' :
      `<!-- Opened via file:// so the library couldn't be inlined; this file references the dist/ folder.\n` +
      `     Re-export while serving over http(s) for a truly single-file build. -->\n`;
    const html =
`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Decrypt Reveal</title>
${offlineNote}${cssBlock}
<style>
body{margin:0;background:#001B2E;display:grid;place-items:center;min-height:100vh}
#hero{width:100vw;height:100vh}
</style></head><body>
<div id="hero"></div>
${jsBlock}
<script>
if (typeof DecryptReveal === 'function') {
  DecryptReveal('#hero', ${JSON.stringify(conf, null, 2)});
} else {
  document.getElementById('hero').innerHTML =
    '<div style="color:#B4D7E8;font-family:monospace;max-width:32rem;padding:2rem;line-height:1.7;text-align:center">' +
    'This standalone build could not load <b>decrypt-reveal.js</b>.<br><br>' +
    'It was exported from a playground opened via <b>file://</b>, so the library was referenced instead of inlined. ' +
    'Re-export while the playground is served over http(s) (e.g. GitHub Pages, or run <code>python -m http.server</code> locally) ' +
    'for a true single-file build.' +
    '</div>';
}
<\/script>
</body></html>`;
    const blob = new Blob([html], {type:'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'decrypt-reveal.html';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);   // revoke late — early revoke aborts the download
    toast((css && js) ? 'Downloaded — single self-contained file' : 'Downloaded (references dist/ — see note)');
   } catch (err) {
    console.error('standalone export failed:', err);
    toast('Export failed — see console');
   }
  }

  // ── wire up ──
  $('#copyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText($('#exportCode').textContent).then(()=>toast('Copied')).catch(()=>toast('Copy failed'));
  });
  $('#downloadBtn').addEventListener('click', downloadStandalone);
  $('#copyPromptBtn').addEventListener('click', () => {
    navigator.clipboard.writeText($('#promptCode').textContent).then(()=>toast('Prompt copied')).catch(()=>toast('Copy failed'));
  });
  document.querySelectorAll('.tabbar .btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tabbar .btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); exportTab = b.dataset.tab; updateExport();
  }));
  function pinUI() {
    const b = $('#pinBtn');
    b.textContent = previewOn ? '◉ Lens held open' : '○ Lens follows cursor';
    b.classList.toggle('primary', previewOn);
  }
  function setPin(on) { previewOn = on; pinUI(); if (instance && instance.setPreview) instance.setPreview(on); }
  $('#pinBtn').addEventListener('click', () => setPin(!previewOn));
  // replay intro: drop the pin and rebuild so the fresh instance plays its intro sweep
  $('#reload').addEventListener('click', () => { previewOn = false; pinUI(); rebuild(); });
  $('#resetDemo').addEventListener('click', () => { imgs = freshImgs(); renderSlots(); rebuild(); });
  $('#resetCfg').addEventListener('click', () => { cfg = freshCfg(); buildControls(); rebuild(); });

  renderSlots(); buildControls(); rebuild(); setPin(true);
})();
