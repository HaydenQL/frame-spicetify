/* FRAME global update notification. Runs across Spotify views. */
(function () {
  'use strict';
  if (window.__FRAME_UPDATES__) return;
  window.__FRAME_UPDATES__ = true;
  const REPO = 'HaydenQL/frame-spicetify';
  const VERSION = '0.1.4';
  const DISMISS_KEY = 'frame:dismissed-release';
  const compare = (a, b) => {
    const parse = v => /^v?\d+\.\d+\.\d+$/.test(v) ? v.replace(/^v/, '').split('.').map(Number) : null;
    const x = parse(a), y = parse(b);
    if (!x || !y) return false;
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
    return false;
  };
  const style = document.createElement('style');
  style.textContent = `
    #frame-update-toast{position:fixed;right:22px;bottom:105px;z-index:2147483000;width:min(360px,calc(100vw - 44px));background:var(--spice-card,#242424);color:var(--spice-text,#fff);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:17px;box-shadow:0 12px 40px #0009;font:13px/1.5 inherit}
    #frame-update-toast strong{font-size:15px}#frame-update-toast p{margin:8px 0 12px;color:var(--spice-subtext,#bbb)}
    #frame-update-toast .frame-toast-actions{display:flex;gap:8px;flex-wrap:wrap}
    #frame-update-toast button{background:var(--spice-main,#151515);color:inherit;border:1px solid #7776;border-radius:7px;padding:8px 10px;cursor:pointer}
    #frame-update-toast button:hover{filter:brightness(1.3)}
    #frame-update-toast pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:200px;overflow:auto;font:12px/1.5 inherit}
  `;
  document.head.appendChild(style);
  function notify(release) {
    const old = document.getElementById('frame-update-toast');
    if (old) old.remove();
    if (!compare(release.tag_name, VERSION) || localStorage.getItem(DISMISS_KEY) === release.tag_name) return;
    const panel = document.createElement('aside');
    panel.id = 'frame-update-toast';
    panel.setAttribute('role', 'status');
    const title = document.createElement('strong');
    title.textContent = 'FRAME ' + release.tag_name + ' is available';
    const info = document.createElement('p');
    info.textContent = 'See what changed or install when you are ready.';
    const notes = document.createElement('pre');
    notes.textContent = String(release.body || 'No release notes provided.').slice(0, 6000);
    notes.hidden = true;
    const actions = document.createElement('div');
    actions.className = 'frame-toast-actions';
    const button = (label, fn) => {
      const el = document.createElement('button');
      el.type = 'button'; el.textContent = label; el.addEventListener('click', fn);
      actions.appendChild(el); return el;
    };
    const notesButton = button('Release notes', () => {
      notes.hidden = !notes.hidden;
      notesButton.textContent = notes.hidden ? 'Release notes' : 'Hide notes';
    });
    button('Update now', () => {
      if (confirm('Install FRAME ' + release.tag_name + '? Spotify may reload and interrupt playback.')) {
        window.location.href = 'frame-update://install';
      }
    });
    button('Later', () => {
      localStorage.setItem(DISMISS_KEY, release.tag_name);
      panel.remove();
    });
    panel.append(title, info, notes, actions);
    document.body.appendChild(panel);
  }
  async function check() {
    try {
      const response = await fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { cache: 'no-store' });
      if (!response.ok) return;
      notify(await response.json());
    } catch (_) { /* No intrusive errors when offline. */ }
  }
  check();
  setInterval(check, 15 * 60 * 1000);
})();
