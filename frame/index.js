/* Frame: a personal start page for Spotify. */
(function () {
  'use strict';

  const React = Spicetify.React;
  const h = React.createElement;
  const KEY = 'frame:workspaces:v1';
  const FRAME_VERSION = '0.1.1';
  const UPDATE_REPO = 'HaydenQL/frame-spicetify'; // Set to owner/repository after publishing FRAME.

  const DEFAULTS = {
    version: 1,
    active: 'Everyday',
    spaces: {
      Everyday: [
        { id: 'liked', name: 'Liked Songs', uri: 'spotify:collection:tracks', kind: 'Library' },
        { id: 'search', name: 'Search', uri: 'spotify:search', kind: 'Explore' },
        { id: 'library', name: 'Your Library', uri: 'spotify:collection', kind: 'Library' }
      ],
      Focus: [],
      Discovery: []
    }
  };

  function validItem(item) {
    return item && typeof item.id === 'string' && typeof item.name === 'string' &&
      typeof item.uri === 'string' && /^spotify:(playlist|album|artist|track|show|episode|collection|search)(:|$)/.test(item.uri) &&
      item.name.length <= 100 && item.uri.length <= 500;
  }

  function normalize(value) {
    if (!value || typeof value !== 'object' || !value.spaces || typeof value.spaces !== 'object') return structuredClone(DEFAULTS);
    const spaces = {};
    for (const [name, items] of Object.entries(value.spaces).slice(0, 12)) {
      if (!name || name.length > 32 || !Array.isArray(items)) continue;
      spaces[name] = items.filter(validItem).slice(0, 100);
    }
    if (!Object.keys(spaces).length) return structuredClone(DEFAULTS);
    return { version: 1, spaces, active: spaces[value.active] ? value.active : Object.keys(spaces)[0] };
  }

  function read() {
    try { return normalize(JSON.parse(Spicetify.LocalStorage.get(KEY))); }
    catch (_) { return structuredClone(DEFAULTS); }
  }
  function write(data) { Spicetify.LocalStorage.set(KEY, JSON.stringify(data)); }
  function pathFromUri(uri) {
    if (uri === 'spotify:collection:tracks') return '/collection/tracks';
    if (uri === 'spotify:collection') return '/collection';
    if (uri === 'spotify:search') return '/search';
    const match = /^spotify:(playlist|album|artist|track|show|episode):([A-Za-z0-9]+)$/.exec(uri);
    return match ? '/' + match[1] + '/' + match[2] : null;
  }
  function extractUri(input) {
    const value = input.trim();
    const uri = /^spotify:(playlist|album|artist|track|show|episode):[A-Za-z0-9]+$/.test(value) ? value : null;
    if (uri) return uri;
    try {
      const url = new URL(value);
      if (url.hostname !== 'open.spotify.com') return null;
      const match = /^\/(playlist|album|artist|track|show|episode)\/([A-Za-z0-9]+)/.exec(url.pathname);
      return match ? `spotify:${match[1]}:${match[2]}` : null;
    } catch (_) { return null; }
  }
  function saveFile(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'frame-workspaces.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function App() {
    const [data, setData] = React.useState(read);
    const [editing, setEditing] = React.useState(false);
    const [name, setName] = React.useState('');
    const [link, setLink] = React.useState('');
    const [error, setError] = React.useState('');
    const [newSpace, setNewSpace] = React.useState('');
    const file = React.useRef(null);
    const [release, setRelease] = React.useState(null);
    const [updateMessage, setUpdateMessage] = React.useState('');
    React.useEffect(() => {
      if (!UPDATE_REPO) { setUpdateMessage('Updates are not connected to a release repository yet.'); return; }
      let cancelled = false;
      fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
        .then(response => { if (!response.ok) throw Error('Release check failed'); return response.json(); })
        .then(result => {
          if (cancelled) return;
          const current = FRAME_VERSION.split('.').map(Number);
          const latest = String(result.tag_name || '').replace(/^v/, '').split('.').map(Number);
          if (latest.length !== 3 || latest.some(n => !Number.isInteger(n))) return;
          if (latest.some((n, i) => n > current[i] && latest.slice(0, i).every((x, j) => x === current[j]))) setRelease(result);
        }).catch(() => { if (!cancelled) setUpdateMessage('Could not check for updates.'); });
      return () => { cancelled = true; };
    }, []);

    const items = data.spaces[data.active] || [];
    const update = (fn) => setData(prev => {
      const next = normalize(fn(prev));
      try { write(next); } catch (_) { setError('Could not save locally. Check available storage.'); }
      return next;
    });
    const move = (index, delta) => update(prev => {
      const spaces = { ...prev.spaces }, list = [...spaces[prev.active]];
      const target = index + delta;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      spaces[prev.active] = list;
      return { ...prev, spaces };
    });
    const add = (event) => {
      event.preventDefault();
      const uri = extractUri(link);
      if (!uri || !name.trim()) { setError('Enter a name and a valid Spotify link or URI.'); return; }
      if (items.length >= 100) { setError('This workspace is full (100 items).'); return; }
      update(prev => ({ ...prev, spaces: { ...prev.spaces, [prev.active]: [...prev.spaces[prev.active], {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: name.trim().slice(0, 100), uri,
        kind: uri.split(':')[1]
      }] } }));
      setName(''); setLink(''); setError('');
    };
    const createSpace = () => {
      const value = newSpace.trim().slice(0, 32);
      if (!value || data.spaces[value] || Object.keys(data.spaces).length >= 12) { setError('Choose a unique workspace name (maximum 12).'); return; }
      update(prev => ({ ...prev, active: value, spaces: { ...prev.spaces, [value]: [] } }));
      setNewSpace(''); setError('');
    };
    const importFile = async (event) => {
      const selected = event.target.files?.[0];
      if (!selected) return;
      if (selected.size > 200000) { setError('Backup is too large.'); return; }
      try {
        const parsed = JSON.parse(await selected.text());
        if (!parsed || parsed.version !== 1 || !parsed.spaces || !Object.keys(parsed.spaces).length) throw Error('Invalid backup');
        update(() => normalize(parsed)); setError('Backup imported.');
      } catch (_) { setError('That file is not a valid Frame backup.'); }
      event.target.value = '';
    };
    const button = (label, fn, className = '') => h('button', { className: 'frame-button ' + className, onClick: fn, type: 'button' }, label);
    return h('main', { className: 'frame-root' },
      h('style', null, `
        .frame-root{font-family:inherit;color:var(--spice-text,#fff);padding:36px 40px 80px;max-width:1250px;margin:auto}
        .frame-root *{box-sizing:border-box}.frame-header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:32px}
        .frame-eyebrow{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--spice-subtext,#aaa)}
        .frame-title{font-size:clamp(36px,5vw,60px);font-weight:750;letter-spacing:-.055em;line-height:1.15;margin:9px 0}
        .frame-muted{color:var(--spice-subtext,#aaa);font-size:13px}.frame-actions{display:flex;gap:8px;flex-wrap:wrap}
        .frame-button{background:var(--spice-card,#252525);border:1px solid rgba(255,255,255,.12);color:inherit;border-radius:7px;padding:9px 13px;font:inherit;font-size:13px;cursor:pointer}
        .frame-button:hover{background:var(--spice-button-disabled,#444)}.frame-button.primary{background:var(--spice-button,#1db954);color:var(--spice-button-text,#000);border-color:transparent;font-weight:700}
        .frame-tabs{display:flex;gap:6px;flex-wrap:wrap;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,.12);margin-bottom:28px}
        .frame-tabs .selected{background:var(--spice-text,#fff);color:var(--spice-main,#111)}
        .frame-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:12px}
        .frame-tile{min-height:142px;border:1px solid rgba(255,255,255,.11);border-radius:10px;background:var(--spice-card,#222);padding:19px;display:flex;flex-direction:column;justify-content:space-between;transition:background .15s}
        .frame-tile:hover{background:var(--spice-highlight-elevated,#333)}.frame-kind{text-transform:uppercase;letter-spacing:.13em;font-size:10px;color:var(--spice-subtext,#aaa)}
        .frame-name{font-size:19px;font-weight:650;letter-spacing:-.025em;overflow-wrap:anywhere}.frame-tile-actions{display:flex;gap:6px;margin-top:14px}
        .frame-tile .frame-button{padding:5px 9px;font-size:11px}.frame-form{margin-top:28px;padding:20px;background:var(--spice-card,#222);border-radius:10px;max-width:720px}
        .frame-form h3{margin:0 0 14px}.frame-field{background:var(--spice-main,#111);color:inherit;border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:10px 12px;min-width:0;flex:1;font:inherit;font-size:13px}
        .frame-inputs{display:flex;gap:8px;flex-wrap:wrap}.frame-form-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.frame-empty{padding:50px 20px;text-align:center;border:1px dashed rgba(255,255,255,.2);border-radius:10px;color:var(--spice-subtext,#aaa)}
        .frame-update{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:15px;margin-bottom:20px}.frame-update p{margin:4px 0 0}.frame-error{color:#ffb4aa;font-size:12px;margin-top:14px}.frame-footer{margin-top:34px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      `),
      h('header', { className: 'frame-header' },
        h('div', null, h('div', { className: 'frame-eyebrow' }, 'FRAME / YOUR SPOTIFY'), h('h1', { className: 'frame-title' }, 'Your space.'), h('p', { className: 'frame-muted' }, 'Everything you actually use. Nothing you don’t.')),
        h('div', { className: 'frame-actions' }, button(editing ? 'Done editing' : 'Edit workspace', () => setEditing(!editing), editing ? 'primary' : ''))
      ),
      release && h('aside', { className: 'frame-update' },
        h('div', null, h('strong', null, `FRAME ${String(release.tag_name).slice(0, 24)} is available`),
          h('p', { className: 'frame-muted' }, 'The Windows updater installs verified releases automatically when enabled.')),
        button('Release notes', () => window.open(release.html_url, '_blank', 'noopener,noreferrer'))
      ),
      h('nav', { className: 'frame-tabs', 'aria-label': 'Workspaces' },
        ...Object.keys(data.spaces).map(space => button(space, () => update(prev => ({ ...prev, active: space })), space === data.active ? 'selected' : ''))
      ),
      items.length ? h('section', { className: 'frame-grid', 'aria-label': 'Pinned items' }, ...items.map((item, i) =>
        h('article', { className: 'frame-tile', key: item.id },
          h('div', null, h('div', { className: 'frame-kind' }, item.kind), h('div', { className: 'frame-name' }, item.name)),
          editing ? h('div', { className: 'frame-tile-actions' },
            button('←', () => move(i, -1)), button('→', () => move(i, 1)),
            button('Remove', () => update(prev => ({ ...prev, spaces: { ...prev.spaces, [prev.active]: prev.spaces[prev.active].filter(x => x.id !== item.id) } })))
          ) : button('Open ↗', () => {
            const path = pathFromUri(item.uri);
            if (path) Spicetify.Platform.History.push(path);
            else setError('This link could not be opened.');
          })
        )
      )) : h('div', { className: 'frame-empty' }, 'Nothing pinned here yet. Select Edit workspace to add something.'),
      editing && h('section', { className: 'frame-form' },
        h('h3', null, 'Pin something'),
        h('form', { onSubmit: add }, h('div', { className: 'frame-inputs' },
          h('input', { className: 'frame-field', placeholder: 'Display name', value: name, maxLength: 100, onChange: e => setName(e.target.value), required: true }),
          h('input', { className: 'frame-field', placeholder: 'Spotify link or URI', value: link, onChange: e => setLink(e.target.value), required: true }),
          h('button', { className: 'frame-button primary', type: 'submit' }, 'Add')
        )),
        h('div', { className: 'frame-form-row' },
          h('input', { className: 'frame-field', placeholder: 'New workspace name', value: newSpace, maxLength: 32, onChange: e => setNewSpace(e.target.value) }),
          button('Create workspace', createSpace),
          Object.keys(data.spaces).length > 1 && button('Delete current workspace', () => {
            if (!confirm(`Delete ${data.active}?`)) return;
            update(prev => { const spaces = { ...prev.spaces }; delete spaces[prev.active]; return { ...prev, spaces, active: Object.keys(spaces)[0] }; });
          })
        )
      ),
      h('footer', { className: 'frame-footer' }, button('Export setup', () => saveFile(data)), button('Import setup', () => file.current?.click()),
        h('input', { ref: file, type: 'file', accept: '.json,application/json', hidden: true, onChange: importFile }),
        h('span', { className: 'frame-muted' }, `FRAME ${FRAME_VERSION} · Saved locally.`)
      ),
      error && h('p', { className: 'frame-error', role: 'status' }, error)
    );
  }
  function render() { return h(App); }
  window.render = render;
})();
