/* FRAME global update notification. Runs across Spotify views. */
(function () {
  'use strict';
  if (window.__FRAME_UPDATES__) return;
  window.__FRAME_UPDATES__ = true;
  const REPO = 'HaydenQL/frame-spicetify';
  const VERSION = '0.2.4';
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

    #frame-update-dialog{width:min(430px,100%);padding:24px;background:var(--spice-card,#242424);color:var(--spice-text,#fff);border:1px solid rgba(255,255,255,.2);border-radius:14px;box-shadow:0 24px 70px #0009}
    #frame-update-dialog h2{font-size:21px;margin:0 0 12px}#frame-update-dialog p{color:var(--spice-subtext,#bbb);font-size:13px;line-height:1.6}
    #frame-update-dialog .frame-dialog-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px}
    #frame-update-dialog button{border:1px solid #7776;background:var(--spice-main,#151515);color:inherit;border-radius:8px;padding:10px 14px;cursor:pointer}
    #frame-update-dialog button.frame-primary{background:var(--spice-button,#1db954);color:var(--spice-button-text,#000);border:0;font-weight:700}
  `;
  document.head.appendChild(style);
  const BRIDGE = 'http://127.0.0.1:43891';
  async function launchUpdate(info) {
    // A local helper, when installed, gives an actual update status instead of
    // relying on Spotify's blocked external-protocol navigation.
    try {
      const response = await fetch(BRIDGE + '/status', { cache: 'no-store', signal: AbortSignal.timeout(2500) });
      if (!response.ok) throw Error('FRAME update helper is unavailable');
      const state = await response.json();
      if (!state.nonce) throw Error('FRAME helper handshake failed');
      const started = await fetch(BRIDGE + '/install', {
        method: 'POST', headers: { 'X-Frame-Nonce': state.nonce }, signal: AbortSignal.timeout(4000)
      });
      if (!started.ok && started.status !== 409) throw Error('FRAME helper rejected the update');
      info.textContent = 'Updating FRAME… You can keep listening. Installation status will appear here.';
      for (let i=0;i<90;i++) {
        await new Promise(resolve => setTimeout(resolve,2000));
        const progress = await fetch(BRIDGE + '/status', { cache: 'no-store' }).then(r => r.json());
        info.textContent = progress.message || progress.status;
        if (progress.status === 'success' || progress.status === 'error') return;
      }
      info.textContent = 'Update is still running. Check the helper log if it does not finish.';
    } catch (error) {
      info.textContent = 'One-click updater unavailable: ' + (error?.message || 'helper not connected') + '. Install the FRAME update helper once to enable reliable in-app updates.';
    }
  }
  const manualCommand = 'cd "$env:LOCALAPPDATA\\FrameUpdater"; .\\Update-Frame.ps1';
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
    button(preview ? 'Test update button' : 'Update now', () => {
      if (preview) {
        const info = panel.querySelector('p');
        if (info) info.textContent = 'Test successful. A real update would launch the Windows updater now.';
        return;
      }
      launchUpdate(info);
    });
    button('Copy PowerShell command', async () => {
      if (preview) { info.textContent = 'Preview only. No command copied.'; return; }
      try {
        await navigator.clipboard.writeText(manualCommand);
        info.textContent = 'Copied. Open PowerShell and paste the command to update FRAME and see any errors.';
      } catch (_) {
        info.textContent = 'Clipboard unavailable. Run this in PowerShell: ' + manualCommand;
      }
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
