/* ============================================================
   Consent-gated Google Analytics (GA4)
   Loads GA only after the visitor accepts — nothing tracks
   before that — and honours the browser's Do-Not-Track signal.
   Drop-in:
     <script src="assets/analytics.js" data-ga="G-XXXXXXXXXX"></script>
   ============================================================ */
(function () {
  'use strict';
  var self = document.currentScript;
  var GA_ID = self && self.getAttribute('data-ga');
  if (!GA_ID) return;

  var KEY = 'dr-analytics-consent';       // 'granted' | 'denied'
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}

  var dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1';

  function loadGA() {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
  }

  function remember(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  // Honour a prior choice or a DNT signal without showing anything.
  if (stored === 'granted') { loadGA(); return; }
  if (stored === 'denied' || dnt) return;

  // ── first visit: show a slim, on-brand consent banner ──
  var css = '\
  .dr-consent{position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:9999;max-width:34rem;margin:0 auto;\
    background:rgba(2,8,16,.94);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);\
    border:1px solid rgba(126,184,218,.35);color:#E8E8E8;\
    font-family:"IBM Plex Sans",system-ui,sans-serif;font-weight:300;font-size:.82rem;line-height:1.6;\
    padding:.95rem 1.05rem;display:flex;gap:.9rem;align-items:center;flex-wrap:wrap;\
    box-shadow:0 .5rem 2rem rgba(0,0,0,.4)}\
  .dr-consent p{margin:0;flex:1 1 16rem;color:rgba(232,232,232,.8)}\
  .dr-consent a{color:#B4D7E8}\
  .dr-consent .dr-btns{display:flex;gap:.5rem;flex:0 0 auto}\
  .dr-consent button{font-family:"IBM Plex Mono",monospace;font-size:.68rem;letter-spacing:.1em;\
    text-transform:uppercase;padding:.5rem .85rem;border:1px solid #7EB8DA;background:transparent;\
    color:#B4D7E8;cursor:pointer;transition:.15s}\
  .dr-consent button:hover{background:rgba(126,184,218,.14)}\
  .dr-consent button.dr-accept{background:#7EB8DA;color:#020810}\
  .dr-consent button.dr-accept:hover{background:#B4D7E8}';

  function build() {
    var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    var bar = document.createElement('div');
    bar.className = 'dr-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Analytics consent');
    bar.innerHTML =
      '<p>This site uses <b>Google Analytics</b> to count visitors. No data is collected until you accept. ' +
      'See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">how Google uses data</a>.</p>' +
      '<div class="dr-btns">' +
      '<button type="button" class="dr-decline">Decline</button>' +
      '<button type="button" class="dr-accept">Accept</button>' +
      '</div>';
    document.body.appendChild(bar);
    bar.querySelector('.dr-accept').addEventListener('click', function () {
      remember('granted'); bar.remove(); loadGA();
    });
    bar.querySelector('.dr-decline').addEventListener('click', function () {
      remember('denied'); bar.remove();
    });
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
