'use strict';

(function () {
  // ── IndexedDB ─────────────────────────────────────────
  let _db = null;

  function openDB() {
    return new Promise((res, rej) => {
      if (_db) return res(_db);
      const req = indexedDB.open('portfolio-admin', 1);
      req.onupgradeneeded = e => {
        e.target.result.createObjectStore('images', { keyPath: 'id' });
      };
      req.onsuccess = e => { _db = e.target.result; res(_db); };
      req.onerror = rej;
    });
  }

  function idbPut(data) {
    return openDB().then(db => new Promise((res, rej) => {
      const tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').put(data).onsuccess = () => res();
      tx.onerror = rej;
    }));
  }

  function idbGet(id) {
    return openDB().then(db => new Promise((res, rej) => {
      const tx = db.transaction('images', 'readonly');
      tx.objectStore('images').get(id).onsuccess = e => res(e.target.result);
      tx.onerror = rej;
    }));
  }

  const blobURLCache = new Map();

  async function getBlobURL(id) {
    if (blobURLCache.has(id)) return blobURLCache.get(id);
    const rec = await idbGet(id);
    if (!rec) return null;
    const url = URL.createObjectURL(rec.blob);
    blobURLCache.set(id, url);
    return url;
  }

  // ── Load overrides into PROJECTS ──────────────────────
  window.loadAdminData = async function (projects) {
    try {
      const stored = JSON.parse(localStorage.getItem('portfolio-projects') || '[]');
      for (const saved of stored) {
        const target = projects.find(p => p.idx === saved.idx);
        if (!target) continue;
        if (saved.name        !== undefined) target.name        = saved.name;
        if (saved.color)                     target.color       = saved.color;
        if (saved.description !== undefined) target.description = saved.description;
        if (saved.thumbnail   !== undefined) target.thumbnail   = saved.thumbnail;
        if (saved.content)                   target.content     = saved.content;
      }
    } catch (e) {}

    // Resolve IDB blob URLs
    const tasks = [];
    for (const proj of projects) {
      if (proj.thumbnail && typeof proj.thumbnail === 'object' && proj.thumbnail.id) {
        tasks.push(getBlobURL(proj.thumbnail.id).then(url => { if (url) proj.thumbnail = url; }));
      }
      for (const item of (proj.content || [])) {
        if (item.type === 'image' && item.id && !item.src) {
          tasks.push(getBlobURL(item.id).then(url => { if (url) item.src = url; }));
        }
      }
    }
    await Promise.all(tasks);
  };

  // ── Admin state ───────────────────────────────────────
  let selectedIdx = null;
  let isOpen      = false;
  let dragItemIdx = null;

  // ── Panel ─────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'admin-panel';
  panel.innerHTML = `
    <div id="admin-header">
      <span>PORTFOLIO ADMIN</span>
      <button id="admin-close">×</button>
    </div>
    <div id="admin-grid-wrap">
      <div id="admin-grid"></div>
    </div>
    <div id="admin-editor">
      <p id="admin-empty">← Виберіть слот проєкту</p>
      <div id="admin-form" style="display:none">

        <div class="af">
          <label>Назва проєкту</label>
          <input type="text" id="af-name" placeholder="Oyvdoma">
        </div>

        <div class="af">
          <label>Колір (фон без зображення)</label>
          <input type="color" id="af-color">
        </div>

        <div class="af">
          <label>Опис</label>
          <textarea id="af-desc" rows="3" placeholder="Короткий опис кейсу..."></textarea>
        </div>

        <div class="af">
          <label>Мініатюра (thumbnail)</label>
          <div class="admin-drop-zone" id="af-thumb-zone">
            <img id="af-thumb-img" style="display:none" alt="">
            <span class="admin-drop-hint" id="af-thumb-hint">Перетягни зображення або вкажи шлях</span>
            <input type="text" id="af-thumb-path" placeholder="assets/media/cases/…webp">
          </div>
        </div>

        <div class="af">
          <label>Контент кейсу <small>— зображення / відео (тягни для сортування)</small></label>
          <div class="admin-drop-zone" id="af-content-zone">
            <span class="admin-drop-hint">Перетягни зображення сюди</span>
          </div>
          <div id="af-content-list"></div>
          <button class="admin-sm-btn" id="af-add-video">+ Додати відео (embed)</button>
        </div>

        <div class="admin-actions">
          <button id="af-save">ЗБЕРЕГТИ</button>
          <button id="af-export">ЗАПИСАТИ В ФАЙЛ</button>
        </div>

      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // ── Toggle button ─────────────────────────────────────
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'admin-toggle';
  toggleBtn.textContent = '⚙';
  toggleBtn.title = 'Portfolio Admin (⌘⇧E)';
  document.body.appendChild(toggleBtn);

  function openAdmin() {
    isOpen = true;
    panel.classList.add('is-open');
    toggleBtn.classList.add('is-active');
    renderGrid();
  }

  function closeAdmin() {
    isOpen = false;
    panel.classList.remove('is-open');
    toggleBtn.classList.remove('is-active');
  }

  toggleBtn.addEventListener('click', () => isOpen ? closeAdmin() : openAdmin());
  panel.querySelector('#admin-close').addEventListener('click', closeAdmin);

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      isOpen ? closeAdmin() : openAdmin();
    }
    if (e.key === 'Escape' && isOpen) closeAdmin();
  });

  // ── Grid ──────────────────────────────────────────────
  function renderGrid() {
    const grid = panel.querySelector('#admin-grid');
    const projects = window.portfolioAdmin?.getProjects() || [];
    grid.innerHTML = '';
    projects.forEach(proj => {
      const cell = document.createElement('button');
      cell.className = 'admin-cell' + (proj.idx === selectedIdx ? ' is-sel' : '');
      if (typeof proj.thumbnail === 'string' && proj.thumbnail) {
        cell.style.backgroundImage = `url(${proj.thumbnail})`;
        cell.style.backgroundSize  = 'cover';
        cell.style.backgroundPosition = 'center';
      } else {
        cell.style.backgroundColor = proj.color;
      }
      const num = document.createElement('span');
      num.textContent = proj.idx;
      cell.appendChild(num);
      if (proj.name) {
        const dot = document.createElement('i');
        dot.className = 'admin-cell-dot';
        cell.appendChild(dot);
      }
      cell.addEventListener('click', () => selectProject(proj.idx));
      grid.appendChild(cell);
    });
  }

  // ── Editor ────────────────────────────────────────────
  function selectProject(idx) {
    selectedIdx = idx;
    const proj = window.portfolioAdmin?.getProjects()[idx];
    if (!proj) return;
    renderGrid();

    panel.querySelector('#admin-empty').style.display    = 'none';
    panel.querySelector('#admin-form').style.display     = '';
    panel.querySelector('#af-name').value                = proj.name || '';
    panel.querySelector('#af-color').value               = proj.color || '#888888';
    panel.querySelector('#af-desc').value                = proj.description || '';

    const thumbImg  = panel.querySelector('#af-thumb-img');
    const thumbHint = panel.querySelector('#af-thumb-hint');
    const thumbPath = panel.querySelector('#af-thumb-path');
    if (typeof proj.thumbnail === 'string' && proj.thumbnail) {
      thumbPath.value          = proj.thumbnail;
      thumbImg.src             = proj.thumbnail;
      thumbImg.style.display   = 'block';
      thumbHint.style.display  = 'none';
    } else {
      thumbPath.value          = '';
      thumbImg.style.display   = 'none';
      thumbHint.style.display  = '';
    }

    renderContentList(proj);
  }

  function renderContentList(proj) {
    const list = panel.querySelector('#af-content-list');
    list.innerHTML = '';
    (proj.content || []).forEach((item, i) => {
      const row = document.createElement('div');
      row.className  = 'admin-row' + (item.type === 'video' ? ' is-video-row' : '');
      row.draggable  = item.type !== 'video'; // disable drag while editing embed
      row.dataset.index = i;

      const handle = document.createElement('span');
      handle.className = 'admin-handle';
      handle.textContent = '⠿';

      const del = document.createElement('button');
      del.className  = 'admin-del';
      del.textContent = '×';
      del.addEventListener('click', () => { proj.content.splice(i, 1); renderContentList(proj); });

      if (item.type === 'video') {
        const ta = document.createElement('textarea');
        ta.className   = 'admin-embed-ta';
        ta.rows        = 3;
        ta.value       = item.embed || '';
        ta.placeholder = '<iframe src="https://player.vimeo.com/..."></iframe>';
        ta.addEventListener('input', () => { proj.content[i].embed = ta.value; });
        row.append(handle, ta, del);
      } else {
        const thumb = document.createElement('div');
        thumb.className = 'admin-row-thumb';
        if (item.src) thumb.style.backgroundImage = `url(${item.src})`;

        const lbl = document.createElement('span');
        lbl.className  = 'admin-row-lbl';
        lbl.textContent = item.filename || item.src?.split('/').pop() || 'Зображення';

        row.append(handle, thumb, lbl, del);
      }

      row.addEventListener('dragstart', e => {
        dragItemIdx = i;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', () => {
        dragItemIdx = null;
        document.querySelectorAll('.admin-row').forEach(r => r.classList.remove('dragging','over'));
      });
      row.addEventListener('dragover', e => {
        if (dragItemIdx === null || dragItemIdx === i) return;
        e.preventDefault();
        document.querySelectorAll('.admin-row').forEach(r => r.classList.remove('over'));
        row.classList.add('over');
      });
      row.addEventListener('drop', e => {
        e.preventDefault();
        if (dragItemIdx === null || dragItemIdx === i) return;
        const moved = proj.content.splice(dragItemIdx, 1)[0];
        proj.content.splice(i, 0, moved);
        renderContentList(proj);
      });

      list.appendChild(row);
    });
  }

  function renderVideosList(proj) {
    const list = panel.querySelector('#af-videos-list');
    list.innerHTML = '';
    (proj.videos || []).forEach((vid, i) => {
      const row  = document.createElement('div');
      row.className = 'admin-video-row';
      const ta   = document.createElement('textarea');
      ta.rows    = 2;
      ta.value   = vid.embed || '';
      ta.placeholder = '<iframe src="…"></iframe>';
      ta.addEventListener('input', () => { proj.videos[i] = { type: 'video', embed: ta.value }; });
      const del  = document.createElement('button');
      del.className  = 'admin-del';
      del.textContent = '×';
      del.addEventListener('click', () => { proj.videos.splice(i, 1); renderVideosList(proj); });
      row.append(ta, del);
      list.appendChild(row);
    });
  }

  // ── File handling ─────────────────────────────────────
  async function handleFiles(files, target) {
    const proj = selectedIdx !== null ? window.portfolioAdmin?.getProjects()[selectedIdx] : null;
    if (!proj) { openAdmin(); return; }

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const id  = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await idbPut({ id, blob: file, filename: file.name });
      const url = URL.createObjectURL(file);
      blobURLCache.set(id, url);

      if (target === 'thumbnail') {
        proj.thumbnail = url;
        proj._thumbId  = id;
        const ti = panel.querySelector('#af-thumb-img');
        ti.src = url; ti.style.display = 'block';
        panel.querySelector('#af-thumb-hint').style.display = 'none';
        panel.querySelector('#af-thumb-path').value = '';
      } else {
        if (!proj.content) proj.content = [];
        proj.content.push({ type: 'image', id, src: url, filename: file.name });
        renderContentList(proj);
      }
    }
  }

  function makeDropZone(el, target) {
    el.addEventListener('dragover', e => {
      if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); el.classList.add('active'); }
    });
    el.addEventListener('dragleave', () => el.classList.remove('active'));
    el.addEventListener('drop', e => {
      e.preventDefault(); el.classList.remove('active');
      handleFiles(e.dataTransfer.files, target);
    });
  }

  makeDropZone(panel.querySelector('#af-thumb-zone'), 'thumbnail');
  makeDropZone(panel.querySelector('#af-content-zone'), 'content');

  panel.querySelector('#af-thumb-path').addEventListener('change', function () {
    const proj = selectedIdx !== null ? window.portfolioAdmin?.getProjects()[selectedIdx] : null;
    if (!proj || !this.value.trim()) return;
    proj.thumbnail = this.value.trim();
    const ti = panel.querySelector('#af-thumb-img');
    ti.src = proj.thumbnail; ti.style.display = 'block';
    panel.querySelector('#af-thumb-hint').style.display = 'none';
  });

  panel.querySelector('#af-add-video').addEventListener('click', () => {
    const proj = selectedIdx !== null ? window.portfolioAdmin?.getProjects()[selectedIdx] : null;
    if (!proj) return;
    if (!proj.content) proj.content = [];
    proj.content.push({ type: 'video', embed: '' });
    renderContentList(proj);
  });

  // ── Save ──────────────────────────────────────────────
  panel.querySelector('#af-save').addEventListener('click', () => {
    const proj = selectedIdx !== null ? window.portfolioAdmin?.getProjects()[selectedIdx] : null;
    if (!proj) return;

    proj.name        = panel.querySelector('#af-name').value.trim();
    proj.color       = panel.querySelector('#af-color').value;
    proj.description = panel.querySelector('#af-desc').value.trim();
    const tp         = panel.querySelector('#af-thumb-path').value.trim();
    if (tp && !proj._thumbId) proj.thumbnail = tp;

    const toSave = {
      idx:         proj.idx,
      name:        proj.name,
      color:       proj.color,
      description: proj.description,
      thumbnail:   proj._thumbId ? { id: proj._thumbId } : proj.thumbnail,
      content: (proj.content || []).map(item => ({
        type:     item.type,
        src:      item.id ? null : item.src,
        id:       item.id  || null,
        filename: item.filename || null,
        embed:    item.embed   || null,
      })),
      videos: proj.videos || [],
    };

    let stored = [];
    try { stored = JSON.parse(localStorage.getItem('portfolio-projects') || '[]'); } catch (e) {}
    const ex = stored.findIndex(p => p.idx === proj.idx);
    if (ex >= 0) stored[ex] = toSave; else stored.push(toSave);
    localStorage.setItem('portfolio-projects', JSON.stringify(stored));

    window.portfolioAdmin?.setProject(proj.idx, proj);
    renderGrid();

    const btn = panel.querySelector('#af-save');
    const orig = btn.textContent;
    btn.textContent = 'ЗБЕРЕЖЕНО ✓';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });

  // ── Write to portfolio-data.js ────────────────────────
  let _fileHandle = null; // cached after first pick

  async function loadFileHandle() {
    if (_fileHandle) {
      // verify permission is still granted
      const perm = await _fileHandle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') return _fileHandle;
    }
    try {
      _fileHandle = await window.showSaveFilePicker({
        suggestedName: 'portfolio-data.js',
        types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }],
        startIn: 'downloads',
      });
      return _fileHandle;
    } catch (e) {
      return null; // user cancelled
    }
  }

  function buildDataFileContent() {
    const projects = window.portfolioAdmin?.getProjects() || [];
    const modified = projects.filter(p =>
      p.name || p.description || p.content.length > 0 ||
      (p.thumbnail && p.thumbnail !== null)
    );
    const lines = [
      '// Auto-generated by Portfolio Admin — do not edit manually.',
      '// To update: use the admin panel (⌘⇧E) and click ЗАПИСАТИ В ФАЙЛ.',
      'window.__portfolioData = [',
    ];
    modified.forEach(proj => {
      const thumb = (typeof proj.thumbnail === 'string' && proj.thumbnail && !proj._thumbId)
        ? `'${proj.thumbnail}'` : 'null';
      const allContent = (proj.content || []).map(item => {
        if (item.type === 'video') {
          return `    { type: 'video', embed: ${JSON.stringify(item.embed || '')} }`;
        }
        if (item.type === 'image' && item.src && !item.id) {
          return `    { type: 'image', src: '${item.src}' }`;
        }
        return null;
      }).filter(Boolean).join(',\n');
      const desc = (proj.description || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      lines.push(`  {`);
      lines.push(`    idx: ${proj.idx}, color: '${proj.color}', name: '${proj.name}',`);
      lines.push(`    thumbnail: ${thumb},`);
      lines.push(`    content: [\n${allContent}\n    ],`);
      lines.push(`    description: '${desc}',`);
      lines.push(`  },`);
    });
    lines.push('];');
    return lines.join('\n');
  }

  panel.querySelector('#af-export').addEventListener('click', async () => {
    const content = buildDataFileContent();
    const btn = panel.querySelector('#af-export');

    if (typeof window.showSaveFilePicker === 'function') {
      const handle = await loadFileHandle();
      if (!handle) return;
      try {
        const perm = await handle.requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') throw new Error('no permission');
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        btn.textContent = 'ЗАПИСАНО ✓';
        setTimeout(() => { btn.textContent = 'ЗАПИСАТИ В ФАЙЛ'; }, 2000);
      } catch (e) {
        fallbackDownload(content);
      }
    } else {
      fallbackDownload(content);
    }
  });

  function fallbackDownload(content) {
    const blob = new Blob([content], { type: 'text/javascript' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: 'portfolio-data.js',
    });
    a.click(); URL.revokeObjectURL(a.href);
  }

  // ── Global drop opens admin ───────────────────────────
  document.addEventListener('dragover', e => {
    if (e.dataTransfer.types.includes('Files')) e.preventDefault();
  });
  document.addEventListener('drop', e => {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    if (!isOpen) openAdmin();
    setTimeout(() => handleFiles(e.dataTransfer.files, 'content'), 200);
  });

  // ── Styles ────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #admin-toggle {
      position: fixed; bottom: 10px; right: 10px;
      z-index: 9999; width: 28px; height: 28px;
      border-radius: 6px; border: none;
      background: rgba(255,255,255,0.12); color: #fff;
      font-size: 14px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    #admin-toggle.is-active { background: rgba(255,255,255,0.28); }

    #admin-panel {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: 340px; z-index: 9998;
      background: rgba(14,14,14,0.97);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-left: 1px solid rgba(255,255,255,0.07);
      display: flex; flex-direction: column;
      font-family: 'Inter', sans-serif; font-size: 12px; color: #ccc;
      transform: translateX(100%);
      transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    #admin-panel.is-open { transform: translateX(0); }

    #admin-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.07);
      font-size: 10px; font-weight: 700; letter-spacing: 0.8px; color: #fff;
      flex-shrink: 0;
    }
    #admin-close {
      background: none; border: none; color: #888; font-size: 18px;
      cursor: pointer; line-height: 1; padding: 0;
    }
    #admin-close:hover { color: #fff; }

    #admin-grid-wrap {
      padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0;
    }
    #admin-grid {
      display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px;
    }
    .admin-cell {
      aspect-ratio: 1; border-radius: 4px; border: 1.5px solid transparent;
      cursor: pointer; position: relative; overflow: hidden;
      transition: border-color 0.15s;
    }
    .admin-cell:hover  { border-color: rgba(255,255,255,0.35); }
    .admin-cell.is-sel { border-color: #fff; }
    .admin-cell span {
      position: absolute; bottom: 2px; left: 3px;
      font-size: 8px; color: rgba(255,255,255,0.7); font-weight: 600;
    }
    .admin-cell-dot {
      position: absolute; top: 3px; right: 3px;
      width: 5px; height: 5px; border-radius: 50%; background: #fff;
    }

    #admin-editor {
      flex: 1; overflow-y: auto; padding: 14px 16px;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
    }
    #admin-empty { color: #555; font-size: 11px; margin-top: 8px; }
    #admin-form { display: flex; flex-direction: column; gap: 14px; }

    .af label {
      display: block; font-size: 9px; font-weight: 700;
      letter-spacing: 0.8px; color: #555; text-transform: uppercase; margin-bottom: 5px;
    }
    .af label small { text-transform: none; font-weight: 400; color: #444; }
    .af input[type=text], .af textarea {
      width: 100%; background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 5px;
      color: #ddd; font-family: inherit; font-size: 11px; padding: 7px 9px;
      box-sizing: border-box; resize: vertical;
    }
    .af input[type=text]:focus, .af textarea:focus {
      outline: none; border-color: rgba(255,255,255,0.3);
    }
    .af input[type=color] {
      width: 36px; height: 28px; border: none; border-radius: 4px;
      cursor: pointer; padding: 0; background: none;
    }

    .admin-drop-zone {
      border: 1.5px dashed rgba(255,255,255,0.15); border-radius: 6px;
      padding: 10px; min-height: 54px; cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }
    .admin-drop-zone.active, .admin-drop-zone:hover {
      border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.03);
    }
    .admin-drop-zone img { width: 100%; border-radius: 4px; display: block; }
    .admin-drop-hint { font-size: 10px; color: #555; margin-bottom: 6px; }
    .admin-drop-zone input[type=text] { margin-top: 6px; }

    .admin-row {
      display: flex; align-items: center; gap: 7px;
      padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
      cursor: grab;
    }
    .admin-row.dragging { opacity: 0.4; }
    .admin-row.over { border-top: 2px solid #fff; }
    .admin-handle { color: #555; font-size: 14px; flex-shrink: 0; cursor: grab; }
    .admin-row-thumb {
      width: 36px; height: 28px; flex-shrink: 0; border-radius: 3px;
      background-size: cover; background-position: center; background: #2a2a2a;
    }
    .admin-row-thumb.is-video {
      display: flex; align-items: center; justify-content: center;
      color: #888; font-size: 12px;
    }
    .admin-row-lbl {
      flex: 1; font-size: 10px; color: #888; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .admin-del {
      background: none; border: none; color: #555; font-size: 16px;
      cursor: pointer; line-height: 1; padding: 0; flex-shrink: 0;
    }
    .admin-del:hover { color: #fff; }

    .admin-row.is-video-row { align-items: flex-start; }
    .admin-embed-ta {
      flex: 1; background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 5px;
      color: #ddd; font-family: 'Inter', monospace; font-size: 10px;
      padding: 6px 8px; resize: vertical; line-height: 1.5;
    }
    .admin-embed-ta:focus { outline: none; border-color: rgba(255,255,255,0.3); }

    .admin-sm-btn {
      background: rgba(255,255,255,0.07); border: none; border-radius: 5px;
      color: #aaa; font-size: 10px; font-weight: 600; padding: 5px 10px;
      cursor: pointer; font-family: inherit; letter-spacing: 0.3px;
    }
    .admin-sm-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

    .admin-actions {
      display: flex; gap: 8px; padding-top: 4px;
    }
    #af-save, #af-export {
      flex: 1; background: rgba(255,255,255,0.1); border: none;
      border-radius: 6px; color: #fff; font-family: inherit;
      font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
      padding: 9px; cursor: pointer; text-transform: uppercase;
      transition: background 0.2s;
    }
    #af-save:hover   { background: rgba(255,255,255,0.2); }
    #af-export { background: rgba(255,255,255,0.05); color: #888; }
    #af-export:hover { background: rgba(255,255,255,0.1); color: #fff; }
  `;
  document.head.appendChild(style);
})();
