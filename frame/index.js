/* Frame: a personal start page for Spotify. */
(function () {
  'use strict';

  const React = Spicetify.React;
  const h = React.createElement;
  const KEY = 'frame:workspaces:v1';
  const FRAME_VERSION = '0.2.3';
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
    const [addOpen, setAddOpen] = React.useState(false);
    const [pinMenu, setPinMenu] = React.useState(null);
    const [customAccent, setCustomAccent] = React.useState('#1db954');
    const [backgrounds, setBackgrounds] = React.useState(() => { try { return JSON.parse(Spicetify.LocalStorage.get('frame:backgrounds:v1') || '{}'); } catch (_) { return {}; } });
    const [backgroundError, setBackgroundError] = React.useState('');
    const [helperStatus, setHelperStatus] = React.useState('');
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
    const [uploadingImage, setUploadingImage] = React.useState(false);
    const [pinSizeValue, setPinSizeValue] = React.useState('normal');
    
    
    const [resizePreview, setResizePreview] = React.useState(null);
    const [shuffleOnPlay, setShuffleOnPlay] = React.useState(() => Spicetify.LocalStorage.get('frame:shuffle:v1') === 'true');
    const [undo, setUndo] = React.useState(null);
    const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);
    const [showShortcuts, setShowShortcuts] = React.useState(false);
    const [playbackError, setPlaybackError] = React.useState('');
    const [themeBySpace, setThemeBySpace] = React.useState(() => { try { return JSON.parse(Spicetify.LocalStorage.get('frame:themes:v1') || '{}'); } catch (_) { return {}; } });
    const [recentPins, setRecentPins] = React.useState(() => { try { return JSON.parse(Spicetify.LocalStorage.get('frame:recent:v1') || '[]'); } catch (_) { return []; } });
    const [showQuick, setShowQuick] = React.useState(true);
    const [artworkStatus, setArtworkStatus] = React.useState('');
    const [diagnosing, setDiagnosing] = React.useState(false);
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
    const visibleItems = items.map((item, index) => ({ item, index })).filter(({ item }) => (!showFavoritesOnly || item.favorite) && (item.name + ' ' + item.kind).toLowerCase().includes(filter.toLowerCase())).sort((a,b) => Number(!!b.item.favorite)-Number(!!a.item.favorite) || a.index-b.index);
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
    const editPin = item => { setPinMenu(null); setPinRename(item.id); setPinRenameValue(item.name); setPinLinkValue(item.uri); setPinImageValue(item.image || ''); setPinSizeValue(item.size || 'normal'); setError(''); };
    const toggleFavorite = item => update(prev => ({ ...prev, spaces: { ...prev.spaces, [prev.active]: prev.spaces[prev.active].map(x => x.id === item.id ? { ...x, favorite: !x.favorite } : x) } }));
    const uploadImage = async event => {
      const f = event.target.files?.[0]; if (!f) return;
      if (!f.type.startsWith('image/') || f.size > 8000000) { setError('Choose an image smaller than 8 MB.'); return; }
      setUploadingImage(true);
      try {
        const image = new Image();
        const url = URL.createObjectURL(f);
        try {
          await new Promise((resolve,reject) => { image.onload=resolve; image.onerror=reject; image.src=url; });
          const canvas = document.createElement('canvas'); const scale = Math.min(1,480/Math.max(image.width,image.height));
          canvas.width=Math.max(1,Math.round(image.width*scale)); canvas.height=Math.max(1,Math.round(image.height*scale));
          canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
          setPinImageValue(canvas.toDataURL('image/jpeg',0.75)); setError('');
        } finally { URL.revokeObjectURL(url); }
      } catch (_) { setError('Could not read that image. Try JPG or PNG.'); }
      setUploadingImage(false); event.target.value='';
    };
    const savePinName = event => {
      event.preventDefault();
      if (!pinRename) return;
      const value = pinRenameValue.trim().slice(0, 100);
      const uri = extractUri(pinLinkValue) || (['spotify:collection:tracks','spotify:collection','spotify:search'].includes(pinLinkValue.trim()) ? pinLinkValue.trim() : null);
      if (!value || !uri) { setError('Enter a name and valid Spotify link or URI.'); return; }
      if (pinImageValue.trim() && !/^(https:\/\/|data:image\/jpeg;base64,)/.test(pinImageValue.trim())) { setError('Custom artwork must use an HTTPS image URL.'); return; }
      update(prev => ({ ...prev, spaces: { ...prev.spaces,
        [prev.active]: prev.spaces[prev.active].map(item => item.id === pinRename ? { ...item, name: value, uri, kind: uri.split(':')[1], image: pinImageValue.trim(), size: pinSizeValue, favorite: item.favorite } : item)
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
    const reorder = (sourceId, targetId) => {
      if (!sourceId || !targetId || sourceId === targetId) return;
      update(prev => {
        const list = [...prev.spaces[prev.active]].sort((a,b) => Number(!!b.favorite)-Number(!!a.favorite));
        const from = list.findIndex(x => x.id === sourceId);
        const to = list.findIndex(x => x.id === targetId);
        if (from < 0 || to < 0) return prev;
        const [moved] = list.splice(from,1);
        const destination = list.findIndex(x => x.id === targetId);
        list.splice(destination,0,moved);
        // Persist favorites first, including after dragging or unfavoriting.
        list.sort((a,b) => Number(!!b.favorite)-Number(!!a.favorite));
        return { ...prev, spaces: { ...prev.spaces, [prev.active]: list } };
      });
    };
    const resizePin = (id, width, height) => update(prev => ({ ...prev, spaces: { ...prev.spaces, [prev.active]: prev.spaces[prev.active].map(x => x.id === id ? { ...x, width: Math.max(1,Math.min(4,width)), height: Math.max(150,Math.min(560,height)) } : x) } }));
    const startResize = (event, item) => {
      event.stopPropagation(); event.preventDefault();
      const node = event.currentTarget.closest('.frame-tile'); if (!node) return;
      const grid = node.parentElement, styles = getComputedStyle(grid);
      const columns = styles.gridTemplateColumns.split(' ').filter(Boolean).length || 1;
      const gap = parseFloat(styles.columnGap) || 10;
      const unit = (grid.clientWidth - gap*(columns-1))/columns + gap;
      const startX = event.clientX, startY = event.clientY;
      const startWidth = item.width || (item.size === 'large' ? 2 : 1);
      const startHeight = item.height || Math.round(node.getBoundingClientRect().height);
      let last = { id:item.id,width:startWidth,height:startHeight };
      setResizePreview(last);
      const move = e => { last = { id:item.id,width:Math.max(1,Math.min(columns,4,startWidth+Math.round((e.clientX-startX)/unit))),height:Math.max(150,Math.min(560,Math.round((startHeight+e.clientY-startY)/10)*10)) }; setResizePreview(last); };
      const finish = e => { window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',finish); window.removeEventListener('pointercancel',finish); if(e.type==='pointerup')resizePin(item.id,last.width,last.height); setResizePreview(null); };
      window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
    };
    const toggleCover = item => update(prev => ({ ...prev, spaces: { ...prev.spaces, [prev.active]: prev.spaces[prev.active].map(x => x.id === item.id ? { ...x, cover: !x.cover } : x) } }));
    const toggleShuffle = () => setShuffleOnPlay(prev => { const next=!prev;try{Spicetify.LocalStorage.set('frame:shuffle:v1',String(next));}catch(_){}return next; });
    const rememberPin = item => {
      setRecentPins(prev => {
        const next = [{ uri: item.uri, name: item.name, image: item.image || '' }, ...prev.filter(x => x.uri !== item.uri)].slice(0, 8);
        try { Spicetify.LocalStorage.set('frame:recent:v1', JSON.stringify(next)); } catch (_) {}
        return next;
      });
    };
    const openPin = item => { const path = pathFromUri(item.uri); if (path) { rememberPin(item); Spicetify.Platform.History.push(path); } else setError('This link could not be opened.'); };
    const setTheme = value => {
      setThemeBySpace(prev => {
        const next = { ...prev, [data.active]: value };
        try { Spicetify.LocalStorage.set('frame:themes:v1', JSON.stringify(next)); } catch (_) {}
        return next;
      });
    };
    const setBackground = image => {
      setBackgrounds(prev => {
        const next = { ...prev, [data.active]: image };
        try { Spicetify.LocalStorage.set('frame:backgrounds:v1', JSON.stringify(next)); setBackgroundError(''); }
        catch (_) { setBackgroundError('Background could not be saved. Try a smaller image.'); }
        return next;
      });
    };
    const uploadBackground = async event => {
      const file = event.target.files?.[0]; if (!file) return;
      if (!file.type.startsWith('image/') || file.size > 10000000) { setBackgroundError('Select an image smaller than 10 MB.'); return; }
      const blobUrl = URL.createObjectURL(file);
      try {
        const image = new Image();
        await new Promise((resolve,reject) => { image.onload=resolve; image.onerror=reject; image.src=blobUrl; });
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1200/Math.max(image.width,image.height));
        canvas.width = Math.max(1,Math.round(image.width*scale));
        canvas.height = Math.max(1,Math.round(image.height*scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image,0,0,canvas.width,canvas.height);
        // Sample visible pixels and choose a vibrant but readable accent.
        const pixels = ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let best = [29,185,84], bestScore = -1;
        const step = Math.max(4,Math.floor(pixels.length/6000/4)*4);
        for (let i=0;i<pixels.length;i+=step) {
          const red=pixels[i],green=pixels[i+1],blue=pixels[i+2];
          const max=Math.max(red,green,blue),min=Math.min(red,green,blue);
          const saturation=max-min;
          const score=saturation * (1-Math.abs(max-180)/255);
          if(score>bestScore && max>60 && max<250) { bestScore=score; best=[red,green,blue]; }
        }
        const accent='#'+best.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
        setBackground(canvas.toDataURL('image/jpeg',0.68));
        setTheme(accent);
      } catch (_) { setBackgroundError('Could not load that background image.'); }
      finally { URL.revokeObjectURL(blobUrl); event.target.value=''; }
    };
    React.useEffect(() => {
      const selectors = ['.Root__nav-bar','.Root__main-view','.main-view-container'];
      const touched = selectors.map(s=>document.querySelector(s)).filter(Boolean);
      const old = touched.map(el=>el.style.background);
      const accent = themeBySpace[data.active]?.startsWith('#') ? themeBySpace[data.active] : ({ green:'#1db954', violet:'#a78bfa', blue:'#60a5fa', rose:'#fb7185', amber:'#fbbf24' })[themeBySpace[data.active]] || '#1db954';
      touched.forEach(el => { el.style.background = 'linear-gradient(145deg,' + accent + '25, #101010 72%)'; });
      return () => touched.forEach((el,i) => { el.style.background=old[i]; });
    }, [data.active, themeBySpace]);
    const checkHelper = async () => {
      setHelperStatus('Checking local update helper…');
      try {
        const response = await fetch('http://127.0.0.1:43891/status', { signal: AbortSignal.timeout(3000) });
        if (!response.ok) throw Error('HTTP ' + response.status);
        const status = await response.json();
        setHelperStatus('Update helper: ' + (status.message || status.status || 'connected'));
      } catch (_) { setHelperStatus('Update helper not reachable. Install frame-update-helper.zip from the latest GitHub release.'); }
    };
    const diagnoseArtwork = async () => {
      const sample = items.find(x => x.uri.startsWith('spotify:playlist:')) || items.find(x => /^spotify:(album|artist|track):/.test(x.uri));
      if (!sample) { setArtworkStatus('Add a playlist, album or artist pin first.'); return; }
      setDiagnosing(true);
      try {
        const result = await spotifyArtwork(sample.uri);
        setArtworkStatus(result ? 'Spotify returned an artwork URL for "' + sample.name + '". If the tile still shows a note, the image may be blocked from loading.' : 'Spotify did not return artwork for "' + sample.name + '". This can be an API permission or metadata compatibility issue.');
      } catch (e) { setArtworkStatus('Artwork request failed: ' + String(e?.message || e)); }
      setDiagnosing(false);
    };
    const playPin = async item => {
      try {
        const type = item.uri.split(':')[1];
        if (!['playlist','album','artist','track'].includes(type)) { openPin(item); return; }
        if (!Spicetify.Player?.playUri) throw Error('Spotify playback API unavailable');
        if (Spicetify.Player.setShuffle) await Spicetify.Player.setShuffle(shuffleOnPlay);
        await Spicetify.Player.playUri(item.uri);
        rememberPin(item);
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
      setName(''); setLink(''); setError(''); setAddOpen(false);
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
    return h('main', { className: 'frame-root', style: { '--frame-accent': themeBySpace[data.active]?.startsWith('#') ? themeBySpace[data.active] : (({ green:'#1db954', violet:'#a78bfa', blue:'#60a5fa', rose:'#fb7185', amber:'#fbbf24' })[themeBySpace[data.active]] || '#1db954'), backgroundImage: backgrounds[data.active] ? 'linear-gradient(180deg,#080808b8,#080808ed),url(' + backgrounds[data.active] + ')' : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }, onClick: () => { if(contextMenu) setContextMenu(null); if(pinMenu) setPinMenu(null); } },
      h('style', null, `
        .frame-resize-outline{position:fixed;z-index:2147483000;pointer-events:none;border:2px dashed #1db954;background:#ffffff1a;box-sizing:border-box;border-radius:10px}.frame-resize-outline span{position:absolute;bottom:-28px;right:0;background:#111;color:#fff;padding:3px 8px;border-radius:5px;font-size:11px}.frame-root .frame-pin-resize{left:auto;right:7px;bottom:7px;cursor:nwse-resize;opacity:.8}.frame-root .frame-pin-delete{right:38px}.frame-root .frame-tile{overflow:hidden;min-height:150px}.frame-root .frame-cover-tile .frame-artwork{position:absolute;inset:0;width:100%;height:100%;aspect-ratio:auto;margin:0;z-index:0}.frame-root .frame-cover-tile .frame-artwork img{width:100%;height:100%;object-fit:cover}.frame-root .frame-cover-tile:before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#0003 10%,#0001 32%,#000e 100%);z-index:1;pointer-events:none}.frame-root .frame-cover-tile .frame-kind,.frame-root .frame-cover-tile .frame-name{position:relative;z-index:2;text-shadow:0 1px 4px #000,0 2px 12px #000}.frame-root .frame-cover-tile .frame-kind{margin-top:65px}.frame-root .frame-cover-tile .frame-tile-footer,.frame-root .frame-cover-tile .frame-pin-star,.frame-root .frame-cover-tile .frame-pin-delete,.frame-root .frame-cover-tile .frame-pin-resize{z-index:3}

        .frame-modal-overlay{position:fixed;inset:0;z-index:2147483640;display:flex;align-items:center;justify-content:center;padding:20px;background:#000b;overflow:auto}.frame-modal-panel{width:min(460px,100%);max-height:calc(100dvh - 40px);overflow-y:auto;background:var(--spice-card,#262626);border:1px solid #ffffff30;border-radius:14px;padding:24px;box-shadow:0 24px 80px #000b;color:var(--spice-text,#fff);margin:auto}.frame-modal-panel .frame-field{display:block;width:100%;margin:10px 0}.frame-modal-panel .frame-inputs{display:flex;flex-direction:column;align-items:stretch;gap:10px}.frame-modal-panel .frame-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.frame-modal-panel h3{margin:0 0 15px}.frame-modal-panel input[type=file]{max-width:100%}.frame-add-tile{min-height:185px;border:2px dashed color-mix(in srgb,var(--frame-accent) 55%,#666);background:color-mix(in srgb,var(--frame-accent) 7%,#171717);color:inherit;border-radius:12px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px}.frame-add-tile span{font-size:44px;line-height:1}.frame-add-tile small{font-size:13px}.frame-add-tile:hover{background:color-mix(in srgb,var(--frame-accent) 19%,#171717)}.frame-pin-resize{position:absolute;bottom:6px;left:6px;z-index:4;opacity:0;background:#111a;color:white;border:0;border-radius:5px;cursor:ew-resize;touch-action:none}.frame-tile:hover .frame-pin-resize,.frame-pin-resize:focus-visible{opacity:1}.frame-root .frame-tile{display:flex;flex-direction:column}.frame-root .frame-tile .frame-tile-click{flex:0 0 auto}.frame-root .frame-tile .frame-tile-footer{margin-top:auto;padding-top:4px}.frame-root .frame-tile .frame-artwork{aspect-ratio:2.3}.frame-root .frame-tile{min-height:185px}.frame-root .frame-grid{grid-auto-flow:row dense}

        .frame-root{font-family:inherit;color:var(--spice-text,#fff);padding:20px 22px 55px;max-width:1600px;margin:auto;background:radial-gradient(ellipse at 15% 0%,color-mix(in srgb,var(--frame-accent) 16%,transparent),transparent 52%);min-height:100%}
        .frame-root *{box-sizing:border-box}.frame-root .frame-tile{background:linear-gradient(155deg,color-mix(in srgb,var(--frame-accent) 13%,var(--spice-card,#242424)),var(--spice-card,#242424));position:relative;min-height:0;padding:12px}.frame-root .frame-tile:hover{border-color:var(--frame-accent)}.frame-root .frame-artwork{height:auto;aspect-ratio:1.8;margin-bottom:8px}.frame-root .frame-tile.frame-tile-large .frame-artwork{aspect-ratio:2.6}.frame-root .frame-grid{grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}.frame-root .frame-tile .frame-name{font-size:15px}.frame-root .frame-quick{background:color-mix(in srgb,var(--frame-accent) 9%,var(--spice-card,#242424))}.frame-pin-star{position:absolute;right:8px;top:8px;z-index:3;opacity:0;border:0;border-radius:50%;background:#111b;color:white;cursor:pointer;padding:5px 8px;font-size:18px}.frame-tile:hover .frame-pin-star,.frame-pin-star:focus-visible,.frame-pin-star.is-favorite{opacity:1}.frame-pin-delete{position:absolute;right:8px;bottom:8px;border:0;background:#1119;color:#ffb4aa;cursor:pointer;border-radius:6px;opacity:0}.frame-tile:hover .frame-pin-delete,.frame-pin-delete:focus-visible{opacity:1}.frame-root .frame-dialog-overlay{z-index:2147483000;overflow:auto;align-items:center}.frame-root .frame-dialog{max-height:calc(100vh - 32px);overflow-y:auto;flex-shrink:0}.frame-root .frame-dialog .frame-field{display:block;width:100%;margin:10px 0}.frame-root .frame-pin-play{width:33px;height:33px;font-size:14px}.frame-root .frame-button.primary,.frame-root .frame-pin-play{background:var(--frame-accent,#1db954)}.frame-root .frame-tab.frame-tab-drop,.frame-root .frame-tile.frame-drop-target{outline-color:var(--frame-accent,#1db954)}.frame-quick{margin:0 0 20px;padding:14px;border-radius:12px;background:var(--spice-card,#252525)}.frame-quick h3{font-size:14px;margin:0 0 10px}.frame-quick-items{display:flex;gap:8px;flex-wrap:wrap}.frame-quick-item{border:1px solid #ffffff22;background:var(--spice-main,#151515);color:inherit;padding:8px 12px;border-radius:8px;cursor:pointer;font:inherit;font-size:12px}.frame-quick-item:hover{border-color:var(--frame-accent,#1db954)}.frame-theme-select{max-width:170px;flex:0 0 auto}.frame-header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:32px}
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
      h('section', { className: 'frame-form-row', style: { alignItems: 'center', marginBottom: 18 } },
        h('label', { className: 'frame-muted' }, 'Workspace accent'),
        h('select', { className: 'frame-field frame-theme-select', value: (themeBySpace[data.active] || 'green').startsWith('#') ? 'custom' : (themeBySpace[data.active] || 'green'), onChange: e => { if(e.target.value==='custom') setTheme(customAccent); else setTheme(e.target.value); }, 'aria-label': 'Workspace accent color' },
          ...[['green','Spotify green'],['violet','Violet'],['blue','Blue'],['rose','Rose'],['amber','Amber'],['custom','Custom color']].map(([value,label]) => h('option', { key: value, value }, label))),
        (themeBySpace[data.active] || '').startsWith('#') && h('input', { type: 'color', title: 'Custom accent color', value: themeBySpace[data.active], onChange: e => { setCustomAccent(e.target.value); setTheme(e.target.value); } }),
        h('label', { className: 'frame-button', style: { cursor: 'pointer' } }, 'Background image', h('input', { type: 'file', accept: 'image/*', hidden: true, onChange: uploadBackground })),
        backgrounds[data.active] && button('Clear background', () => setBackground('')),
        backgroundError && h('span', { className: 'frame-error' }, backgroundError),
        button(showQuick ? 'Hide quick access' : 'Show quick access', () => setShowQuick(!showQuick)),
        button(diagnosing ? 'Checking artwork…' : 'Diagnose artwork', diagnoseArtwork),
        artworkStatus && h('span', { className: 'frame-muted', role: 'status' }, artworkStatus)
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
        null
      ),
      contextMenu && Spicetify.ReactDOM.createPortal(h('div', { className: 'frame-menu', style: { left: contextMenu.x, top: contextMenu.y },
        onClick: e => e.stopPropagation() },
        h('button', { onClick: () => openDialog('rename', contextMenu.space) }, 'Rename'),
        h('button', { onClick: () => duplicateSpace(contextMenu.space) }, 'Duplicate'),
        Object.keys(data.spaces).length > 1 && h('button', { onClick: () => openDialog('delete', contextMenu.space) }, 'Delete')
      ), document.body),
      pinMenu && Spicetify.ReactDOM.createPortal(h('div', { className: 'frame-menu', style: { left: pinMenu.x, top: pinMenu.y }, onClick: e => e.stopPropagation() },
        h('button', { onClick: () => editPin(pinMenu.item) }, 'Edit pin'),
        h('button', { onClick: () => { toggleFavorite(pinMenu.item); setPinMenu(null); } }, pinMenu.item.favorite ? 'Unfavorite' : 'Favorite'),
        h('button', { onClick: () => { duplicatePin(pinMenu.item); setPinMenu(null); } }, 'Duplicate'),
        h('button', { onClick: () => { toggleCover(pinMenu.item); setPinMenu(null); } }, pinMenu.item.cover ? 'Use normal artwork' : 'Use full-cover artwork'),
        h('button', { onClick: () => { removePin(pinMenu.item.id); setPinMenu(null); } }, 'Remove')
      ), document.body),
      pinRename && Spicetify.ReactDOM.createPortal(h('div', { className: 'frame-modal-overlay', onClick: () => setPinRename(null) },
        h('form', { className: 'frame-dialog frame-modal-panel', onClick: e => e.stopPropagation(), onSubmit: savePinName },
          h('h3', null, 'Edit pin'),
          h('input', { className: 'frame-field', autoFocus: true, maxLength: 100, required: true,
            'aria-label': 'Pin display name', value: pinRenameValue, onChange: e => setPinRenameValue(e.target.value) }),
          h('input', { className: 'frame-field', maxLength: 500, required: true, placeholder: 'Spotify link or URI', 'aria-label': 'Pin Spotify link or URI', value: pinLinkValue, onChange: e => setPinLinkValue(e.target.value) }),
          h('input', { className: 'frame-field', maxLength: 250000, placeholder: 'Optional HTTPS artwork URL', 'aria-label': 'Custom artwork URL', value: pinImageValue, onChange: e => setPinImageValue(e.target.value) }),
          h('label', { className: 'frame-muted' }, uploadingImage ? 'Processing image…' : 'Or upload a JPG/PNG file'),
          h('input', { type: 'file', accept: 'image/*', onChange: uploadImage }),
          h('select', { className: 'frame-field', value: pinSizeValue, onChange: e => setPinSizeValue(e.target.value), 'aria-label': 'Pin size' },
            h('option', { value: 'normal' }, 'Normal tile'), h('option', { value: 'large' }, 'Large tile')),
          error && h('p', { className: 'frame-error' }, error),
          h('div', { className: 'frame-dialog-actions' },
            button('Cancel', () => { setPinRename(null); setError(''); }),
            h('button', { className: 'frame-button primary', type: 'submit' }, 'Save pin')
          )
        )
      ), document.body),
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
      showQuick && h('section', { className: 'frame-quick', 'aria-label': 'Quick access' },
        h('h3', null, 'Favorites across workspaces'),
        h('div', { className: 'frame-quick-items' }, ...Object.entries(data.spaces).flatMap(([space, list]) => list.filter(x => x.favorite).map(item =>
          h('button', { key: space + ':' + item.id, className: 'frame-quick-item', type: 'button', title: 'Open ' + item.name + ' from ' + space, onClick: () => openPin(item) }, '★ ' + item.name + ' · ' + space)))),
        h('h3', { style: { marginTop: 14 } }, 'Recently opened in FRAME'),
        h('div', { className: 'frame-quick-items' }, ...recentPins.map(item =>
          h('button', { key: item.uri, className: 'frame-quick-item', type: 'button', onClick: () => openPin(item) }, '↗ ' + item.name))),
        !recentPins.length && h('p', { className: 'frame-muted' }, 'Open a pin to start your recent list.')
      ),
      h('div', { className: 'frame-form-row', style: { marginBottom: '18px', alignItems: 'center' } },
        h('input', { className: 'frame-field', placeholder: 'Search this workspace', value: filter, onChange: e => setFilter(e.target.value), 'aria-label': 'Search this workspace' }),
        button(shuffleOnPlay ? 'Shuffle: On' : 'Shuffle: Off', toggleShuffle, shuffleOnPlay ? 'primary' : ''),
        button(showFavoritesOnly ? 'Show all pins' : 'Favorites only', () => setShowFavoritesOnly(!showFavoritesOnly)),
        button(showShortcuts ? 'Hide tips' : 'Tips', () => setShowShortcuts(!showShortcuts)),
        undo && button('Undo last removal', () => { update(() => JSON.parse(undo)); setUndo(null); dragIndex.current = null; setDragOver(null); })
      ),
      showShortcuts && h('p', { className: 'frame-shortcuts' }, 'Click a tile to open it. ▶ plays with your Shuffle setting. Right-click for full-cover artwork. Drag the corner to resize.'),
      playbackError && h('p', { className: 'frame-error' }, playbackError),
      items.length > 1 && !filter.trim() && h('p', { className: 'frame-drag-help' }, 'Drag pins to rearrange them. Favorites stay at the top. Drag workspace tabs to reorder them too.'),
      h('section', { className: 'frame-grid', 'aria-label': 'Pinned items' }, ...visibleItems.map(({ item, index: i }) =>
        h('article', { className: 'frame-tile' + (item.cover ? ' frame-cover-tile' : '') + (item.size === 'large' ? ' frame-tile-large' : '') + (dragOver === item.id ? ' frame-drop-target' : ''), key: item.id, 'data-frame-pin': item.id, style: { gridColumn: 'span ' + (item.width || (item.size === 'large' ? 2 : 1)), height: (item.height || 195) + 'px' },
          onContextMenu: e => { e.preventDefault(); setPinMenu({ item, x: Math.min(e.clientX,window.innerWidth-190), y: Math.min(e.clientY,window.innerHeight-190) }); },
          draggable: !filter.trim(),
          onDragStart: e => { if (filter.trim()) { e.preventDefault(); return; } dragIndex.current = item.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item.id); },
          onDragOver: e => { if (!filter.trim() && dragIndex.current !== null) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(item.id); } },
          onDrop: e => { e.preventDefault(); if (!filter.trim()) reorder(dragIndex.current, item.id); dragIndex.current = null; setDragOver(null); },
          onDragEnd: () => { dragIndex.current = null; setDragOver(null); }
        },
          h('div', { className: 'frame-tile-click', role: 'link', tabIndex: 0, onClick: () => { if (dragIndex.current === null) openPin(item); }, onKeyDown: e => { if (e.key === 'Enter') openPin(item); } }, h(Artwork, { item }), h('div', { className: 'frame-kind' }, item.kind), h('div', { className: 'frame-name' }, (item.favorite ? '★ ' : '') + item.name)),
          h('button', { className: 'frame-pin-star' + (item.favorite ? ' is-favorite' : ''), title: item.favorite ? 'Unfavorite' : 'Favorite', 'aria-label': item.favorite ? 'Unfavorite' : 'Favorite', type: 'button', onClick: e => { e.stopPropagation(); toggleFavorite(item); } }, item.favorite ? '★' : '☆'),
          h('div', { className: 'frame-tile-footer' }, h('button', { className: 'frame-pin-play', type: 'button', title: 'Play ' + item.name, 'aria-label': 'Play ' + item.name, onClick: e => { e.stopPropagation(); playPin(item); } }, '▶')),
          h('button', { className: 'frame-pin-resize', draggable: false, title: 'Drag to resize width and height', 'aria-label': 'Resize tile', type: 'button', onPointerDown: e => startResize(e,item), onClick: e => e.stopPropagation() }, '◢'),
          h('button', { className: 'frame-pin-delete', title: 'Remove pin', 'aria-label': 'Remove pin', type: 'button', onClick: e => { e.stopPropagation(); removePin(item.id); } }, '×')
        )
      ), h('button', { className: 'frame-add-tile', type: 'button', title: 'Add pin', 'aria-label': 'Add pin', onClick: () => { setAddOpen(true); setError(''); } }, h('span', null, '+'), h('small', null, 'Add a pin'))),
      resizePreview && Spicetify.ReactDOM.createPortal(h('div', { className: 'frame-resize-outline', style: (() => { const el = document.querySelector('.frame-tile[data-frame-pin="' + resizePreview.id + '"]'); if (!el) return { display:'none' }; const rect = el.getBoundingClientRect(), grid=el.parentElement, styles=getComputedStyle(grid), cols=styles.gridTemplateColumns.split(' ').filter(Boolean).length||1, gap=parseFloat(styles.columnGap)||10, unit=(grid.clientWidth-gap*(cols-1))/cols+gap; return { left:rect.left+'px',top:rect.top+'px',width:(unit*resizePreview.width-gap)+'px',height:resizePreview.height+'px' }; })() }, h('span', null, resizePreview.width + ' columns × ' + resizePreview.height + 'px')),document.body),
      addOpen && Spicetify.ReactDOM.createPortal(h('div', { className: 'frame-modal-overlay', onClick: () => setAddOpen(false) }, h('section', { className: 'frame-form frame-modal-panel', onClick: e => e.stopPropagation() },
        h('div', { className: 'frame-form-row', style: { justifyContent: 'space-between' } }, h('h3', null, 'Add a pin'), button('Cancel', () => setAddOpen(false))),
        h('p', { className: 'frame-muted' }, 'Paste a Spotify playlist, album, artist, or track link and give it a name.'),
        h('form', { onSubmit: add }, h('div', { className: 'frame-inputs' },
          h('input', { className: 'frame-field', placeholder: 'Display name', value: name, maxLength: 100, onChange: e => setName(e.target.value), required: true }),
          h('input', { className: 'frame-field', placeholder: 'Spotify link or URI', value: link, onChange: e => setLink(e.target.value), required: true }),
          h('button', { className: 'frame-button primary', type: 'submit' }, 'Add')
        )),

      )), document.body),
      h('footer', { className: 'frame-footer' }, button('Export setup', () => saveFile(data)), button('Import setup', () => file.current?.click()), button('Test update notification', () => window.dispatchEvent(new Event('frame:test-update-notification'))), button('Check update helper', checkHelper), helperStatus && h('span', { className: 'frame-muted', role: 'status' }, helperStatus),
        h('input', { ref: file, type: 'file', accept: '.json,application/json', hidden: true, onChange: importFile }),
        h('span', { className: 'frame-muted' }, `FRAME ${FRAME_VERSION} · Saved locally.`)
      ),
      error && h('p', { className: 'frame-error', role: 'status' }, error)
    );
  }
  function render() { return h(App); }
  window.render = render;
})();
