/* FRAME global update notification. Runs across Spotify views. */
(function () {
  'use strict';
  if (window.__FRAME_UPDATES__) return;
  window.__FRAME_UPDATES__ = true;
  const REPO = 'HaydenQL/frame-spicetify';
  const VERSION = '0.1.7';
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
    #frame-update-dialog-backdrop{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:20px}
    #frame-update-dialog{width:min(430px,100%);padding:24px;background:var(--spice-card,#242424);color:var(--spice-text,#fff);border:1px solid rgba(255,255,255,.2);border-radius:14px;box-shadow:0 24px 70px #0009}
    #frame-update-dialog h2{font-size:21px;margin:0 0 12px}#frame-update-dialog p{color:var(--spice-subtext,#bbb);font-size:13px;line-height:1.6}
    #frame-update-dialog .frame-dialog-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px}
    #frame-update-dialog button{border:1px solid #7776;background:var(--spice-main,#151515);color:inherit;border-radius:8px;padding:10px 14px;cursor:pointer}
    #frame-update-dialog button.frame-primary{background:var(--spice-button,#1db954);color:var(--spice-button-text,#000);border:0;font-weight:700}
  `;
  document.head.appendChild(style);
  function confirmUpdate(version, preview = false) {
    document.getElementById('frame-update-dialog-backdrop')?.remove();
    const backdrop = document.createElement('div');
    backdrop.id = 'frame-update-dialog-backdrop';
    const dialog = document.createElement('section');
    dialog.id = 'frame-update-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'frame-update-dialog-title');
    const title = document.createElement('h2');
    title.id = 'frame-update-dialog-title';
    title.textContent = 'Install FRAME ' + version + '?';
    const message = document.createElement('p');
    message.textContent = preview ? 'Preview only. No files will change.' : 'FRAME will launch your local updater. Spotify may reload and briefly interrupt playback while the update is applied.';
    const actions = document.createElement('div');
    actions.className = 'frame-dialog-actions';
    const cancel = document.createElement('button');
    cancel.textContent = 'Not now';
    const install = document.createElement('button');
    install.className = 'frame-primary';
    install.textContent = preview ? 'Finish test' : 'Update now';
    const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = event => { if (event.key === 'Escape') close(); };
    cancel.addEventListener('click', close);
    install.addEventListener('click', () => {
      close();
      if (!preview) window.location.href = 'frame-update://install';
    });
    backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });
    document.addEventListener('keydown', onKey);
    actions.append(cancel, install);
    dialog.append(title, message, actions);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    cancel.focus();
  }
  function notify(release, preview = false) {
    const old = document.getElementById('frame-update-toast');
    if (old) old.remove();
    if (!preview && (!compare(release.tag_name, VERSION) || localStorage.getItem(DISMISS_KEY) === release.tag_name)) return;
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
      confirmUpdate(release.tag_name, preview);
    });
    button('Later', () => {
      if (!preview) localStorage.setItem(DISMISS_KEY, release.tag_name);
      panel.remove();
    });
    panel.append(title, info, notes, actions);
    document.body.appendChild(panel);
  }
  window.addEventListener('frame:test-update-notification', () => {
    notify({ tag_name: 'v9.9.9 (preview)', body: 'FRAME preview: release notes and confirmation. No files are changed.' }, true);
  });
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
