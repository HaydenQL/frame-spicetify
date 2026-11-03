/* Frame: a personal start page for Spotify. */
(function () {
  'use strict';

  const React = Spicetify.React;
  const h = React.createElement;
  const KEY = 'frame:workspaces:v1';
  const FRAME_VERSION = '0.2.0';
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
  const artworkCache = new Map();
  async function spotifyArtwork(uri) {
    const match = /^spotify:(playlist|album|artist|track|show|episode):([A-Za-z0-9]+)$/.exec(uri);
    if (!match) return '';
    const [, type, id] = match;
    const api = Spicetify.CosmosAsync;
    const toImage = value => { if (typeof value !== 'string') return ''; if (/^https:\/\//.test(value)) return value; const id = /^spotify:image:([a-zA-Z0-9]+)$/.exec(value); return id ? 'https://i.scdn.co/image/' + id[1] : ''; };
    const fromImages = list => (Array.isArray(list) ? list : []).map(x => toImage(typeof x === 'string' ? x : x?.url || x?.uri)).find(Boolean) || '';
    const endpoints = {
      playlist: 'https://api.spotify.com/v1/playlists/' + id + '?fields=images',
      album: 'https://api.spotify.com/v1/albums/' + id,
      artist: 'https://api.spotify.com/v1/artists/' + id,
      track: 'https://api.spotify.com/v1/tracks/' + id,
      show: 'https://api.spotify.com/v1/shows/' + id,
      episode: 'https://api.spotify.com/v1/episodes/' + id
    };
    if (type === 'playlist' && Spicetify.Platform?.PlaylistAPI?.getPlaylist) {
      try {
        const result = await Spicetify.Platform.PlaylistAPI.getPlaylist(uri);
        const image = toImage(result?.metadata?.picture) || toImage(result?.metadata?.image) ||
          fromImages(result?.metadata?.images) || fromImages(result?.images) ||
          toImage(result?.playlist?.metadata?.picture);
        if (image) return image;
      } catch (_) {}
    }
    // Use Spotify's own authenticated API, not the public oEmbed endpoint
    // (which is often blocked from inside the Spotify desktop client).
    if (api && typeof api.get === 'function') {
      try {
        const result = await api.get(endpoints[type]);
        const images = type === 'track' ? result?.album?.images : result?.images;
        const image = fromImages(images);
        if (typeof image === 'string' && /^https:\/\//.test(image)) return image;
      } catch (_) {}
    }
    // Spicetify's internal metadata endpoint is a secondary fallback.
    if (api && typeof api.get === 'function') {
      try {
        const meta = await api.get('sp://core-playlist/v1/playlist/' + id + '/metadata');
        const image = fromImages(meta?.images) || toImage(meta?.picture) || toImage(meta?.image);
        if (type === 'playlist' && typeof image === 'string') {
          if (image) return image;
        }
      } catch (_) {}
    }
    if (type === 'playlist' && api?.get) {
      for (const endpoint of ['sp://core-playlist/v1/playlist/' + id, 'sp://playlist/v2/playlist/' + id]) {
        try {
          const result = await api.get(endpoint);
          const image = toImage(result?.metadata?.picture) || toImage(result?.metadata?.image) ||
            fromImages(result?.metadata?.images) || fromImages(result?.images);
          if (image) return image;
        } catch (_) {}
      }
    }
    return '';
  }
  function Artwork({ item }) {
    const [url, setUrl] = React.useState(() => item.image || artworkCache.get(item.uri) || '');
    React.useEffect(() => {
      let alive = true;
      setUrl(item.image || artworkCache.get(item.uri) || '');
      if (item.image || artworkCache.has(item.uri)) return () => { alive = false; };
      spotifyArtwork(item.uri).then(image => {
        if (image) artworkCache.set(item.uri, image);
        if (alive) setUrl(image);
      });
      return () => { alive = false; };
    }, [item.uri, item.image]);
    const type = item.uri.split(':')[1];
    const symbol = ({ playlist: '♫', album: '◉', artist: '✦', track: '♪', show: '◈', episode: '◈', collection: '♥', search: '⌕' })[type] || '♫';
    return h('div', { className: 'frame-artwork frame-artwork-' + type },
      url ? h('img', { src: url, alt: '', loading: 'lazy', onError: () => setUrl('') }) : h('span', { 'aria-hidden': true }, symbol)
    );
  }
  function App() {
    const [data, setData] = React.useState(read);
    const [editing, setEditing] = React.useState(false);
    const [name, setName] = React.useState('');
    const [link, setLink] = React.useState('');
    const [error, setError] = React.useState('');
    const [newSpace, setNewSpace] = React.useState('');
    const [dialog, setDialog] = React.useState(null);
    const [contextMenu, setContextMenu] = React.useState(null);
    const [filter, setFilter] = React.useState('');
    const file = React.useRef(null);
    const dragIndex = React.useRef(null);
    const [dragOver, setDragOver] = React.useState(null);
    const [pinRename, setPinRename] = React.useState(null);
    const [pinRenameValue, setPinRenameValue] = React.useState('');
    const [pinLinkValue, setPinLinkValue] = React.useState('');
    const [pinImageValue, setPinImageValue] = React.useState('');
    const [pinSizeValue, setPinSizeValue] = React.useState('normal');
    const [pinFavoriteValue, setPinFavoriteValue] = React.useState(false);
    const [sortMode, setSortMode] = React.useState('custom');
    const [compact, setCompact] = React.useState(false);
    const [undo, setUndo] = React.useState(null);
    const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);
    const [showShortcuts, setShowShortcuts] = React.useState(false);
    const [playbackError, setPlaybackError] = React.useState('');
    const tabDrag = React.useRef(null);
    const [tabDrop, setTabDrop] = React.useState(null);
    const [release, setRelease] = React.useState(null);
    const [latestNotes, setLatestNotes] = React.useState(null);
    const [notesOpen, setNotesOpen] = React.useState(false);
    React.useEffect(() => {
      let cancelled = false;
      let timer;
      const cached = sessionStorage.getItem('frame:latest-notes');
      if (cached) { try { setLatestNotes(JSON.parse(cached)); } catch (_) {} }
      const check = async () => {
        try {
          const response = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`, {
            headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store'
          });
          if (!response.ok) return;
          const result = await response.json();
          if (cancelled) return;
          setLatestNotes(result);
          try { sessionStorage.setItem('frame:latest-notes', JSON.stringify(result)); } catch (_) {}
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
    const visibleItems = items.map((item, index) => ({ item, index })).filter(({ item }) => (!showFavoritesOnly || item.favorite) && (item.name + ' ' + item.kind).toLowerCase().includes(filter.toLowerCase())).sort((a,b) => sortMode === 'name' ? a.item.name.localeCompare(b.item.name) : sortMode === 'favorites' ? Number(!!b.item.favorite) - Number(!!a.item.favorite) : a.index-b.index);
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
    const savePinName = event => {
      event.preventDefault();
      if (!pinRename) return;
      const value = pinRenameValue.trim().slice(0, 100);
      const uri = extractUri(pinLinkValue) || (['spotify:collection:tracks','spotify:collection','spotify:search'].includes(pinLinkValue.trim()) ? pinLinkValue.trim() : null);
      if (!value || !uri) { setError('Enter a name and valid Spotify link or URI.'); return; }
      if (pinImageValue.trim() && !/^https:\/\//.test(pinImageValue.trim())) { setError('Custom artwork must use an HTTPS image URL.'); return; }
      update(prev => ({ ...prev, spaces: { ...prev.spaces,
        [prev.active]: prev.spaces[prev.active].map(item => item.id === pinRename ? { ...item, name: value, uri, kind: uri.split(':')[1], image: pinImageValue.trim(), size: pinSizeValue, favorite: pinFavoriteValue } : item)
      } }));
      setPinRename(null); setPinRenameValue(''); setPinLinkValue(''); setPinImageValue(''); setError('');
    };
    const reorderSpace = (from, to) => {
      if (!from || !to || from === to) return;
      update(prev => {
        const entries = Object.entries(prev.spaces);
        const source = entries.findIndex(([name]) => name === from);
        const destination = entries.findIndex(([name]) => name === to);
        if (source < 0 || destination < 0) return prev;
        const [moved] = entries.splice(source, 1);
        entries.splice(destination, 0, moved);
        return { ...prev, spaces: Object.fromEntries(entries) };
      });
    };
    const reorder = (from, to) => {
      if (from === null || from === to || from < 0 || to < 0) return;
      update(prev => {
        const spaces = { ...prev.spaces }, list = [...spaces[prev.active]];
        if (from >= list.length || to >= list.length) return prev;
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        spaces[prev.active] = list;
        return { ...prev, spaces };
      });
    };
    const openPin = item => { const path = pathFromUri(item.uri); if (path) Spicetify.Platform.History.push(path); else setError('This link could not be opened.'); };
    const playPin = async item => {
      try {
        const type = item.uri.split(':')[1];
        if (!['playlist','album','artist','track'].includes(type)) { openPin(item); return; }
        if (!Spicetify.Player?.playUri) throw Error('Spotify playback API unavailable');
        await Spicetify.Player.playUri(item.uri);
        setPlaybackError('');
      } catch (_) { setPlaybackError('Could not start playback here. Open the pin to play it in Spotify.'); }
    };
    const removePin = id => {
      const snapshot = JSON.stringify(data);
      update(prev => ({ ...prev, spaces: { ...prev.spaces, [prev.active]: prev.spaces[prev.active].filter(x => x.id !== id) } }));
      setUndo(snapshot);
      dragIndex.current = null; setDragOver(null);
    };
    const duplicatePin = item => {
      if (items.length >= 100) { setError('Workspace is full.'); return; }
      update(prev => ({ ...prev, spaces: { ...prev.spaces, [prev.active]: [...prev.spaces[prev.active], { ...item, id: String(Date.now()) + '-' + Math.random().toString(36).slice(2), name: item.name + ' copy' }] } }));
    };
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
    const duplicateSpace = space => {
      const base = (space.slice(0, 24) + ' copy').slice(0, 32);
      let target = base, suffix = 2;
      while (data.spaces[target] && suffix < 100) target = base.slice(0, 29) + ' ' + suffix++;
      if (Object.keys(data.spaces).length >= 12) { setError('Maximum 12 workspaces.'); return; }
      update(prev => ({ ...prev, active: target, spaces: { ...prev.spaces,
        [target]: prev.spaces[space].map(item => ({ ...item, id: item.id + '-copy-' + Date.now() })) } }));
      setContextMenu(null);
    };
    const submitDialog = event => {
      event.preventDefault();
      if (!dialog) return;
      const value = newSpace.trim().slice(0, 32);
      if (dialog.type === 'create') {
        if (!value || data.spaces[value] || Object.keys(data.spaces).length >= 12) {
          setError('Choose a unique workspace name (maximum 12).'); return;
        }
        createSpace();
      } else if (dialog.type === 'rename') {
        if (!value || (value !== dialog.space && data.spaces[value])) {
          setError('Choose a unique workspace name.'); return;
        }
        update(prev => {
          const spaces = {};
          for (const [key, items] of Object.entries(prev.spaces)) spaces[key === dialog.space ? value : key] = items;
          return { ...prev, active: prev.active === dialog.space ? value : prev.active, spaces };
        });
      } else if (dialog.type === 'delete') {
        if (Object.keys(data.spaces).length <= 1) { setError('Keep at least one workspace.'); return; }
        update(prev => {
          const spaces = { ...prev.spaces };
          delete spaces[dialog.space];
          return { ...prev, spaces, active: prev.active === dialog.space ? Object.keys(spaces)[0] : prev.active };
        });
      }
      setDialog(null); setContextMenu(null); setNewSpace(''); setError('');
    };
    const openDialog = (type, space) => {
      setContextMenu(null);
      setError('');
      setNewSpace(type === 'rename' ? space : '');
      setDialog({ type, space });
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
    return h('main', { className: 'frame-root' + (compact ? ' frame-compact' : ''), onClick: () => contextMenu && setContextMenu(null) },
      h('style', null, `
        .frame-root{font-family:inherit;color:var(--spice-text,#fff);padding:36px 40px 80px;max-width:1250px;margin:auto}
        .frame-root *{box-sizing:border-box}.frame-header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:32px}
        .frame-eyebrow{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--spice-subtext,#aaa)}
        .frame-title{font-size:clamp(36px,5vw,60px);font-weight:750;letter-spacing:-.055em;line-height:1.15;margin:9px 0}
        .frame-muted{color:var(--spice-subtext,#aaa);font-size:13px}.frame-actions{display:flex;gap:8px;flex-wrap:wrap}
        .frame-button{background:var(--spice-card,#252525);border:1px solid rgba(255,255,255,.12);color:inherit;border-radius:7px;padding:9px 13px;font:inherit;font-size:13px;cursor:pointer}
        .frame-button:hover{background:var(--spice-button-disabled,#444)}.frame-button.primary{background:var(--spice-button,#1db954);color:var(--spice-button-text,#000);border-color:transparent;font-weight:700}
        .frame-tabs{display:flex;gap:6px;flex-wrap:wrap;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,.12);margin-bottom:28px}
        .frame-tabs{align-items:center;transition:all .18s ease}.frame-tab{position:relative}.frame-tab .frame-button{white-space:nowrap}
        .frame-plus{width:35px;height:35px;border-radius:50%;font-size:23px;line-height:1;padding:0;transition:transform .15s,background .15s}
        .frame-plus:hover{transform:scale(1.08)}.frame-menu{position:fixed;z-index:99999;min-width:170px;padding:5px;background:var(--spice-card,#262626);border:1px solid #ffffff30;border-radius:9px;box-shadow:0 12px 32px #0008}
        .frame-menu button{display:block;width:100%;text-align:left;border:0;background:transparent;color:inherit;padding:10px 12px;border-radius:6px;cursor:pointer}.frame-menu button:hover{background:#ffffff20}
        .frame-dialog-overlay{position:fixed;inset:0;background:#0009;z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px}
        .frame-dialog{background:var(--spice-card,#242424);border:1px solid #ffffff2a;border-radius:14px;padding:24px;width:min(420px,100%);box-shadow:0 20px 65px #0008}
        .frame-dialog h3{margin:0 0 10px}.frame-dialog p{font-size:13px;color:var(--spice-subtext,#bbb)}
        .frame-dialog .frame-field{width:100%;margin:10px 0}.frame-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
        .frame-workspace-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
        .frame-workspace-toolbar h2{margin:0;font-size:21px;letter-spacing:-.025em}
        .frame-tabs .selected{background:var(--spice-text,#fff);color:var(--spice-main,#111)}
        .frame-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:12px}
        .frame-tile.frame-tile-large{grid-column:span 2}.frame-tile-click{cursor:pointer;flex:1}.frame-tile-click:focus-visible{outline:2px solid var(--spice-button,#1db954);border-radius:7px}.frame-pin-play{align-self:flex-start;border-radius:50%;width:40px;height:40px;padding:0;font-size:19px;background:var(--spice-button,#1db954);color:#000;border:0;cursor:pointer}.frame-pin-play:hover{transform:scale(1.06)}.frame-tile-footer{display:flex;align-items:center;justify-content:flex-end;margin-top:10px}.frame-shortcuts{font-size:12px;color:var(--spice-subtext,#aaa);margin:12px 0}.frame-tile[draggable=true] .frame-tile-click{cursor:grab}.frame-compact .frame-artwork{height:80px}.frame-compact .frame-tile{min-height:165px;padding:12px}.frame-compact .frame-grid{grid-template-columns:repeat(auto-fill,minmax(165px,1fr))}.frame-tile{min-height:225px;border:1px solid rgba(255,255,255,.11);border-radius:10px;background:var(--spice-card,#222);padding:19px;display:flex;flex-direction:column;justify-content:space-between;transition:background .15s}
        .frame-tile:hover{background:var(--spice-highlight-elevated,#333)}.frame-tab[draggable=true]{cursor:grab}.frame-tab.frame-tab-drop{outline:2px solid var(--spice-button,#1db954);border-radius:8px}.frame-artwork{height:124px;border-radius:9px;overflow:hidden;display:flex;align-items:center;justify-content:center;margin-bottom:13px;background:linear-gradient(135deg,#264a68,#37244d);font-size:62px;color:#fff;user-select:none}.frame-artwork img{height:100%;width:100%;object-fit:cover}.frame-artwork-collection{background:linear-gradient(135deg,#5a2ac5,#b24687)}.frame-artwork-search{background:linear-gradient(135deg,#225d55,#319f82)}.frame-artwork-artist{background:linear-gradient(135deg,#73442e,#b76a46)}.frame-artwork-album{background:linear-gradient(135deg,#263f7b,#895bb0)}.frame-artwork-track{background:linear-gradient(135deg,#205947,#438d73)}.frame-tile[draggable=true]{cursor:grab}.frame-tile[draggable=true]:active{cursor:grabbing}.frame-tile.frame-drop-target{outline:2px solid var(--spice-button,#1db954);outline-offset:2px}.frame-drag-help{font-size:12px;color:var(--spice-subtext,#aaa);margin:0 0 12px}.frame-kind{text-transform:uppercase;letter-spacing:.13em;font-size:10px;color:var(--spice-subtext,#aaa)}
        .frame-name{font-size:19px;font-weight:650;letter-spacing:-.025em;overflow-wrap:anywhere}.frame-tile-actions{display:flex;gap:6px;margin-top:14px}
        .frame-tile .frame-button{padding:5px 9px;font-size:11px}.frame-form{margin-top:28px;padding:20px;background:var(--spice-card,#222);border-radius:10px;max-width:720px}
        .frame-form h3{margin:0 0 10px}.frame-form{max-width:600px}.frame-form .frame-inputs{align-items:center}.frame-field{background:var(--spice-main,#111);color:inherit;border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:10px 12px;min-width:0;flex:1;font:inherit;font-size:13px}
        .frame-inputs{display:flex;gap:8px;flex-wrap:wrap}.frame-form-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.frame-empty{padding:50px 20px;text-align:center;border:1px dashed rgba(255,255,255,.2);border-radius:10px;color:var(--spice-subtext,#aaa)}
        .frame-update{position:fixed;right:24px;bottom:105px;z-index:9999;width:min(360px,calc(100vw - 48px));background:var(--spice-card,#242424);box-shadow:0 12px 36px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:18px}.frame-update p{margin:8px 0 12px}.frame-update-actions{display:flex;gap:8px;flex-wrap:wrap}.frame-notes{white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto;font-size:12px;line-height:1.5;padding:10px 0}.frame-error{color:#ffb4aa;font-size:12px;margin-top:14px}.frame-footer{margin-top:34px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      `),
      h('header', { className: 'frame-header' },
        h('div', null, h('div', { className: 'frame-eyebrow' }, 'FRAME / YOUR SPOTIFY'),
          h('h1', { className: 'frame-title' }, 'Your space.'),
          h('p', { className: 'frame-muted' }, 'Everything you actually use. Nothing you don’t.'))
      ),
      h('section', { className: 'frame-form', style: { marginTop: 0, marginBottom: 24, maxWidth: 'none' } },
        h('div', { className: 'frame-form-row', style: { alignItems: 'center', justifyContent: 'space-between', marginTop: 0 } },
          h('strong', null, 'FRAME release notes'),
          button(notesOpen ? 'Hide release notes' : 'View release notes', () => setNotesOpen(!notesOpen))
        ),
        notesOpen && h('div', { className: 'frame-notes' },
          latestNotes ? `Latest: ${latestNotes.tag_name}\n\n${String(latestNotes.body || 'No release notes provided.').replace(/^Full Changelog:.*$/gmi, '').trim().slice(0, 6000)}` : 'Release notes are unavailable while offline.')
      ),
      h('nav', { className: 'frame-tabs', 'aria-label': 'Workspaces' },
        ...Object.keys(data.spaces).map(space => h('div', { className: 'frame-tab' + (tabDrop === space ? ' frame-tab-drop' : ''), key: space,
          draggable: true,
          onDragStart: e => { tabDrag.current = space; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', space); },
          onDragOver: e => { if (tabDrag.current) { e.preventDefault(); setTabDrop(space); } },
          onDrop: e => { e.preventDefault(); reorderSpace(tabDrag.current, space); tabDrag.current = null; setTabDrop(null); },
          onDragEnd: () => { tabDrag.current = null; setTabDrop(null); },
          onContextMenu: e => { e.preventDefault(); setContextMenu({ space, x: Math.max(8, Math.min(e.clientX, window.innerWidth - 190)), y: Math.max(8, Math.min(e.clientY, window.innerHeight - 170)) }); }
        }, button(space, () => { setEditing(false); setFilter(''); update(prev => ({ ...prev, active: space })); }, space === data.active ? 'selected' : ''))),
        h('button', { className: 'frame-button frame-plus', title: 'Create workspace', 'aria-label': 'Create workspace',
          onClick: () => openDialog('create', '') }, '+')
      ),
      h('div', { className: 'frame-workspace-toolbar' },
        h('h2', null, data.active),
        button(editing ? 'Done editing' : 'Edit workspace', () => { setFilter(''); setEditing(!editing); }, editing ? 'primary' : '')
      ),
      contextMenu && Spicetify.ReactDOM.createPortal(h('div', { className: 'frame-menu', style: { left: contextMenu.x, top: contextMenu.y },
        onClick: e => e.stopPropagation() },
        h('button', { onClick: () => openDialog('rename', contextMenu.space) }, 'Rename'),
        h('button', { onClick: () => duplicateSpace(contextMenu.space) }, 'Duplicate'),
        Object.keys(data.spaces).length > 1 && h('button', { onClick: () => openDialog('delete', contextMenu.space) }, 'Delete')
      ), document.body),
      pinRename && h('div', { className: 'frame-dialog-overlay', onClick: () => setPinRename(null) },
        h('form', { className: 'frame-dialog', onClick: e => e.stopPropagation(), onSubmit: savePinName },
          h('h3', null, 'Edit pin'),
          h('input', { className: 'frame-field', autoFocus: true, maxLength: 100, required: true,
            'aria-label': 'Pin display name', value: pinRenameValue, onChange: e => setPinRenameValue(e.target.value) }),
          h('input', { className: 'frame-field', maxLength: 500, required: true, placeholder: 'Spotify link or URI', 'aria-label': 'Pin Spotify link or URI', value: pinLinkValue, onChange: e => setPinLinkValue(e.target.value) }),
          h('input', { className: 'frame-field', maxLength: 1000, placeholder: 'Optional custom HTTPS artwork URL', 'aria-label': 'Custom artwork URL', value: pinImageValue, onChange: e => setPinImageValue(e.target.value) }),
          h('label', null, h('input', { type: 'checkbox', checked: pinFavoriteValue, onChange: e => setPinFavoriteValue(e.target.checked) }), ' Favorite pin'),
          h('select', { className: 'frame-field', value: pinSizeValue, onChange: e => setPinSizeValue(e.target.value), 'aria-label': 'Pin size' },
            h('option', { value: 'normal' }, 'Normal tile'), h('option', { value: 'large' }, 'Large tile')),
          error && h('p', { className: 'frame-error' }, error),
          h('div', { className: 'frame-dialog-actions' },
            button('Cancel', () => { setPinRename(null); setError(''); }),
            h('button', { className: 'frame-button primary', type: 'submit' }, 'Save pin')
          )
        )
      ),
      dialog && h('div', { className: 'frame-dialog-overlay', onClick: () => setDialog(null) },
        h('form', { className: 'frame-dialog', onClick: e => e.stopPropagation(), onSubmit: submitDialog },
          h('h3', null, dialog.type === 'create' ? 'Create workspace' : dialog.type === 'rename' ? 'Rename workspace' : 'Delete workspace?'),
          dialog.type === 'delete'
            ? h('p', null, `Delete "${dialog.space}" and its pinned items from FRAME? This cannot be undone.`)
            : h('input', { className: 'frame-field', autoFocus: true, maxLength: 32, required: true,
                placeholder: 'Workspace name', value: newSpace, onChange: e => setNewSpace(e.target.value) }),
          error && h('p', { className: 'frame-error' }, error),
          h('div', { className: 'frame-dialog-actions' },
            button('Cancel', () => setDialog(null)),
            h('button', { className: 'frame-button primary', type: 'submit' },
              dialog.type === 'delete' ? 'Delete workspace' : dialog.type === 'rename' ? 'Save name' : 'Create')
          )
        )
      ),
      h('div', { className: 'frame-form-row', style: { marginBottom: '18px', alignItems: 'center' } },
        h('input', { className: 'frame-field', placeholder: 'Search this workspace', value: filter, onChange: e => setFilter(e.target.value), 'aria-label': 'Search this workspace' }),
        h('select', { className: 'frame-field', style: { flex: '0 0 auto' }, value: sortMode, onChange: e => setSortMode(e.target.value), 'aria-label': 'Sort pins' },
          h('option', { value: 'custom' }, 'Custom order'), h('option', { value: 'name' }, 'Name A-Z'), h('option', { value: 'favorites' }, 'Favorites first')),
        button(compact ? 'Comfortable view' : 'Compact view', () => setCompact(!compact)),
        button(showFavoritesOnly ? 'Show all pins' : 'Favorites only', () => setShowFavoritesOnly(!showFavoritesOnly)),
        button(showShortcuts ? 'Hide tips' : 'Tips', () => setShowShortcuts(!showShortcuts)),
        undo && button('Undo last removal', () => { update(() => JSON.parse(undo)); setUndo(null); dragIndex.current = null; setDragOver(null); setSortMode('custom'); })
      ),
      showShortcuts && h('p', { className: 'frame-shortcuts' }, 'Click a tile to open it. Use its green play button to start music. Drag tiles in Custom order. Use Edit workspace to change artwork, tile size or destinations.'),
      playbackError && h('p', { className: 'frame-error' }, playbackError),
      items.length > 1 && !filter.trim() && h('p', { className: 'frame-drag-help' }, 'Drag pins to rearrange them. Drag workspace tabs to reorder them too.'),
      visibleItems.length ? h('section', { className: 'frame-grid', 'aria-label': 'Pinned items' }, ...visibleItems.map(({ item, index: i }) =>
        h('article', { className: 'frame-tile' + (item.size === 'large' ? ' frame-tile-large' : '') + (dragOver === i ? ' frame-drop-target' : ''), key: item.id,
          draggable: !filter.trim() && sortMode === 'custom',
          onDragStart: e => { if (filter.trim() || sortMode !== 'custom') { e.preventDefault(); return; } dragIndex.current = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item.id); },
          onDragOver: e => { if (sortMode === 'custom' && !filter.trim() && dragIndex.current !== null) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(i); } },
          onDrop: e => { e.preventDefault(); if (sortMode === 'custom' && !filter.trim()) reorder(dragIndex.current, i); dragIndex.current = null; setDragOver(null); },
          onDragEnd: () => { dragIndex.current = null; setDragOver(null); }
        },
          h('div', { className: 'frame-tile-click', role: 'link', tabIndex: 0, onClick: () => { if (!editing && dragIndex.current === null) openPin(item); }, onKeyDown: e => { if (e.key === 'Enter') openPin(item); } }, h(Artwork, { item }), h('div', { className: 'frame-kind' }, item.kind), h('div', { className: 'frame-name' }, (item.favorite ? '★ ' : '') + item.name)),
          editing ? h('div', { className: 'frame-tile-actions' },
            
            button('Edit', () => { setPinRename(item.id); setPinRenameValue(item.name); setPinLinkValue(item.uri); setPinImageValue(item.image || ''); setPinSizeValue(item.size || 'normal'); setPinFavoriteValue(!!item.favorite); setError(''); }),
            button('Copy', () => duplicatePin(item)),
            button('Remove', () => removePin(item.id))
          ) : h('div', { className: 'frame-tile-footer' }, h('button', { className: 'frame-pin-play', type: 'button', title: 'Play ' + item.name, 'aria-label': 'Play ' + item.name, onClick: e => { e.stopPropagation(); playPin(item); } }, '▶'))
        )
      )) : h('div', { className: 'frame-empty' }, 'Nothing pinned here yet. Select Edit workspace to add something.'),
      editing && h('section', { className: 'frame-form' },
        h('h3', null, 'Add a pin'),
        h('p', { className: 'frame-muted' }, 'Paste a Spotify playlist, album, artist, or track link and give it a name.'),
        h('form', { onSubmit: add }, h('div', { className: 'frame-inputs' },
          h('input', { className: 'frame-field', placeholder: 'Display name', value: name, maxLength: 100, onChange: e => setName(e.target.value), required: true }),
          h('input', { className: 'frame-field', placeholder: 'Spotify link or URI', value: link, onChange: e => setLink(e.target.value), required: true }),
          h('button', { className: 'frame-button primary', type: 'submit' }, 'Add')
        )),

      ),
      h('footer', { className: 'frame-footer' }, button('Export setup', () => saveFile(data)), button('Import setup', () => file.current?.click()), button('Test update notification', () => window.dispatchEvent(new Event('frame:test-update-notification'))),
        h('input', { ref: file, type: 'file', accept: '.json,application/json', hidden: true, onChange: importFile }),
        h('span', { className: 'frame-muted' }, `FRAME ${FRAME_VERSION} · Saved locally.`)
      ),
      error && h('p', { className: 'frame-error', role: 'status' }, error)
    );
  }
  function render() { return h(App); }
  window.render = render;
})();
