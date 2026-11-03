/* Frame: a personal start page for Spotify. */
(function () {
  'use strict';

  const React = Spicetify.React;
  const h = React.createElement;
  const KEY = 'frame:workspaces:v1';
  const FRAME_VERSION = '0.1.4';
  const UPDATE_REPO = 'HaydenQL/frame-spicetify';

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
    const [filter, setFilter] = React.useState('');
    const file = React.useRef(null);
    const [release, setRelease] = React.useState(null);
    const [latestNotes, setLatestNotes] = React.useState(null);
    const [notesOpen, setNotesOpen] = React.useState(false);
    const [showNotes, setShowNotes] = React.useState(false);
    const [dismissedVersion, setDismissedVersion] = React.useState('');
    React.useEffect(() => {
      let cancelled = false;
      let timer;
      const check = async () => {
        try {
          const response = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`, {
            headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store'
          });
          if (!response.ok) return;
          const result = await response.json();
          if (cancelled) return;
          setLatestNotes(result);
          const parse = v => /^v?\d+\.\d+\.\d+$/.test(v) ? v.replace(/^v/, '').split('.').map(Number) : null;
          const current = parse(FRAME_VERSION);
          const latest = parse(String(result.tag_name || ''));
          if (!latest || !current) return;
          const newer = latest[0] > current[0] ||
            (latest[0] === current[0] && latest[1] > current[1]) ||
            (latest[0] === current[0] && latest[1] === current[1] && latest[2] > current[2]);
          setRelease(newer ? result : null);
        } catch (_) { /* Offline or rate-limited: do not interrupt listening. */ }
      };
      check();
      timer = setInterval(check, 15 * 60 * 1000);
      return () => { cancelled = true; clearInterval(timer); };
    }, []);

    const items = data.spaces[data.active] || [];
    const visibleItems = items.map((item, index) => ({ item, index })).filter(({ item }) => (item.name + ' ' + item.kind).toLowerCase().includes(filter.toLowerCase()));
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
        .frame-update{position:fixed;right:24px;bottom:105px;z-index:9999;width:min(360px,calc(100vw - 48px));background:var(--spice-card,#242424);box-shadow:0 12px 36px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:18px}.frame-update p{margin:8px 0 12px}.frame-update-actions{display:flex;gap:8px;flex-wrap:wrap}.frame-notes{white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto;font-size:12px;line-height:1.5;padding:10px 0}.frame-error{color:#ffb4aa;font-size:12px;margin-top:14px}.frame-footer{margin-top:34px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      `),
      h('header', { className: 'frame-header' },
        h('div', null, h('div', { className: 'frame-eyebrow' }, 'FRAME / YOUR SPOTIFY'), h('h1', { className: 'frame-title' }, 'Your space.'), h('p', { className: 'frame-muted' }, 'Everything you actually use. Nothing you don’t.')),
        h('div', { className: 'frame-actions' }, button(editing ? 'Done editing' : 'Edit workspace', () => setEditing(!editing), editing ? 'primary' : ''))
      ),
      h('section', { className: 'frame-form', style: { marginTop: 0, marginBottom: 24, maxWidth: 'none' } },
        h('div', { className: 'frame-form-row', style: { alignItems: 'center', justifyContent: 'space-between', marginTop: 0 } },
          h('strong', null, 'FRAME release notes'),
          button(notesOpen ? 'Hide release notes' : 'View release notes', () => setNotesOpen(!notesOpen))
        ),
        notesOpen && h('div', { className: 'frame-notes' },
          latestNotes ? `Latest: ${latestNotes.tag_name}\n\n${String(latestNotes.body || 'No release notes provided.').slice(0, 6000)}` : 'Release notes are unavailable while offline.')
      ),
      h('nav', { className: 'frame-tabs', 'aria-label': 'Workspaces' },
        ...Object.keys(data.spaces).map(space => button(space, () => update(prev => ({ ...prev, active: space })), space === data.active ? 'selected' : ''))
      ),
      h('div', { className: 'frame-form-row', style: { marginBottom: '18px' } }, h('input', { className: 'frame-field', placeholder: 'Search this workspace', value: filter, onChange: e => setFilter(e.target.value), 'aria-label': 'Search this workspace' })),
      visibleItems.length ? h('section', { className: 'frame-grid', 'aria-label': 'Pinned items' }, ...visibleItems.map(({ item, index: i }) =>
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
          button('Duplicate workspace', () => {
            const base = data.active + ' copy';
            let candidate = base, n = 2;
            while (data.spaces[candidate]) candidate = base + ' ' + n++;
            if (Object.keys(data.spaces).length >= 12) { setError('Maximum 12 workspaces.'); return; }
            const target = candidate.slice(0, 32);
            if (data.spaces[target]) { setError('Choose a shorter workspace name first.'); return; }
            update(prev => ({ ...prev, active: target, spaces: { ...prev.spaces, [target]: prev.spaces[prev.active].map(item => ({ ...item, id: item.id + '-copy-' + Date.now() })) } }));
          }),
          button('Rename workspace', () => {
            const next = prompt('New workspace name', data.active)?.trim().slice(0, 32);
            if (!next || (next !== data.active && data.spaces[next])) return;
            update(prev => {
              const spaces = {};
              for (const [key, value] of Object.entries(prev.spaces)) spaces[key === prev.active ? next : key] = value;
              return { ...prev, active: next, spaces };
            });
          }),
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
