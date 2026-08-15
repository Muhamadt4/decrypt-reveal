/* Embeds dist/decrypt-reveal.{js,css} into playground.html so the playground's
   "Standalone .html" export works even when the page is opened via file://
   (where fetch is blocked). Run this whenever you change the dist/ files:

     node build-playground.js

   It fills the #dr-css-src <style> and #dr-lib-src <script> blocks in place.
   The library must contain no literal </script> (its header comment avoids it). */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

const css = fs.readFileSync(path.join(ROOT, 'dist/decrypt-reveal.css'), 'utf8').trim();
const js  = fs.readFileSync(path.join(ROOT, 'dist/decrypt-reveal.js'), 'utf8');

if (js.includes('</script>')) {
  console.error('ERROR: dist/decrypt-reveal.js contains "</script>" — it would break the embed. Escape or remove it.');
  process.exit(1);
}

let html = fs.readFileSync(path.join(ROOT, 'playground.html'), 'utf8');

function fill(html, id, tag, body) {
  const re = new RegExp(`(<${tag} id="${id}">)[\\s\\S]*?(</${tag}>)`);
  if (!re.test(html)) { console.error(`ERROR: could not find <${tag} id="${id}"> block in playground.html`); process.exit(1); }
  return html.replace(re, `$1\n${body}\n$2`);
}

html = fill(html, 'dr-css-src', 'style', css);
html = fill(html, 'dr-lib-src', 'script', js.trimEnd());

fs.writeFileSync(path.join(ROOT, 'playground.html'), html);
console.log(`Embedded ${(css.length/1024).toFixed(1)} KB CSS + ${(js.length/1024).toFixed(1)} KB JS into playground.html`);
