'use strict';

(function () {
  if (!new URLSearchParams(window.location.search).has('admin')) return;

  // ── IndexedDB ─────────────────────────────────────────
  let _db = null;

  function openDB() {
    return new Promise((res, rej) => {
      if (_db) return res(_db);
      const req = indexedDB.open('portfolio-admin', 2);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('images'))  db.createObjectStore('images',  { keyPath: 'id' });
        if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles', { keyPath: 'name' });
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

  function idbPutHandle(handle) {
    return openDB().then(db => new Promise((res, rej) => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put({ name: 'portfolio-data', handle }).onsuccess = () => res();
      tx.onerror = rej;
    }));
  }

  function idbGetHandle() {
    return openDB().then(db => new Promise(res => {
      const tx = db.transaction('handles', 'readonly');
      tx.objectStore('handles').get('portfolio-data').onsuccess = e => res(e.target.result?.handle || null);
      tx.onerror = () => res(null);
    }));
  }

  // ── Project root directory handle ────────────────────
  let _rootDirHandle = null;

  function idbPutDirHandle(handle) {
    return openDB().then(db => new Promise((res, rej) => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put({ name: 'project-root', handle }).onsuccess = () => res();
      tx.onerror = rej;
    }));
  }

  function idbGetDirHandle() {
    return openDB().then(db => new Promise(res => {
      const tx = db.transaction('handles', 'readonly');
      tx.objectStore('handles').get('project-root').onsuccess = e => res(e.target.result?.handle || null);
      tx.onerror = () => res(null);
    }));
  }

  async function getProjectRootHandle(forceNew = false) {
    if (!forceNew && _rootDirHandle) {
      const perm = await _rootDirHandle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') return _rootDirHandle;
      if ((await _rootDirHandle.requestPermission({ mode: 'readwrite' })) === 'granted') return _rootDirHandle;
      _rootDirHandle = null;
    }
    if (!forceNew) {
      const saved = await idbGetDirHandle();
      if (saved) {
        const perm = await saved.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') { _rootDirHandle = saved; updateFolderBtn(); return saved; }
        if ((await saved.requestPermission({ mode: 'readwrite' })) === 'granted') {
          _rootDirHandle = saved; updateFolderBtn(); return saved;
        }
      }
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      _rootDirHandle = handle;
      await idbPutDirHandle(handle);
      updateFolderBtn();
      return handle;
    } catch (e) { return null; }
  }

  async function saveThumbnailToProject(file, projectName) {
    const root = await getProjectRootHandle();
    if (!root) return null;
    try {
      const bitmap = await createImageBitmap(file);
      const { width: w, height: h } = bitmap;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      bitmap.close();
      const webpBlob = await new Promise(r => canvas.toBlob(r, 'image/webp', 0.90));
      const dirName  = projectName.toLowerCase();
      const assetsDir = await root.getDirectoryHandle('assets', { create: true });
      const mediaDir  = await assetsDir.getDirectoryHandle('media',  { create: true });
      const casesDir  = await mediaDir.getDirectoryHandle('cases',   { create: true });
      const filename  = `case-${dirName}.webp`;
      const fh = await casesDir.getFileHandle(filename, { create: true });
      const wr = await fh.createWritable();
      await wr.write(webpBlob);
      await wr.close();
      return `assets/media/cases/${filename}`;
    } catch (e) {
      console.warn('saveThumbnailToProject failed:', e);
      return null;
    }
  }

  // Save blob from IDB to disk — triggers folder picker if folder not yet connected
  async function flushThumbToDisk(proj) {
    if (!proj._thumbId || !proj.name) return false;
    const rec = await idbGet(proj._thumbId);
    if (!rec?.blob) return false;
    const diskPath = await saveThumbnailToProject(rec.blob, proj.name);
    if (!diskPath) return false;
    proj.thumbnail = diskPath;
    proj._thumbId  = null;
    return diskPath;
  }

  async function saveImageToProject(file, projectName) {
    const root = await getProjectRootHandle();
    if (!root) return null;
    try {
      // Convert to WebP + get dimensions
      const bitmap = await createImageBitmap(file);
      const { width: w, height: h } = bitmap;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      bitmap.close();
      const webpBlob = await new Promise(r => canvas.toBlob(r, 'image/webp', 0.90));

      // Navigate to assets/media/cases/{name}/
      const dirName = projectName.toLowerCase();
      const assetsDir = await root.getDirectoryHandle('assets', { create: true });
      const mediaDir  = await assetsDir.getDirectoryHandle('media',  { create: true });
      const casesDir  = await mediaDir.getDirectoryHandle('cases',   { create: true });
      const projDir   = await casesDir.getDirectoryHandle(dirName,   { create: true });

      // Next available filename: {name}-1.webp, {name}-2.webp …
      const existing = [];
      for await (const name of projDir.keys()) existing.push(name);
      let n = 1;
      while (existing.includes(`${dirName}-${n}.webp`)) n++;
      const filename = `${dirName}-${n}.webp`;

      const fh = await projDir.getFileHandle(filename, { create: true });
      const wr = await fh.createWritable();
      await wr.write(webpBlob);
      await wr.close();

      return { path: `assets/media/cases/${dirName}/${filename}`, w, h };
    } catch (e) {
      console.warn('saveImageToProject failed:', e);
      return null;
    }
  }

  function updateFolderBtn() {
    const btn = document.getElementById('admin-folder-btn');
    if (!btn) return;
    const connected = !!_rootDirHandle;
    btn.title = connected ? `Папка: ${_rootDirHandle.name} (клік — змінити)` : 'Вибрати кореневу папку проєкту';
    btn.classList.toggle('is-connected', connected);
  }

  window._adminResetDirHandle = async () => {
    _rootDirHandle = null;
    const db = await openDB();
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').delete('project-root');
    updateFolderBtn();
  };

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
        if (saved.url         !== undefined) target.url         = saved.url;
        if (saved.thumbnail   !== undefined) target.thumbnail   = saved.thumbnail;
        if (saved.content)                   target.content     = saved.content;
      }
    } catch (e) {}

    // Resolve IDB blob URLs
    const tasks = [];
    for (const proj of projects) {
      if (proj.thumbnail && typeof proj.thumbnail === 'object' && proj.thumbnail.id) {
        const thumbId = proj.thumbnail.id;
        tasks.push(getBlobURL(thumbId).then(url => {
          if (url) { proj._thumbId = thumbId; proj.thumbnail = url; }
        }));
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
      <div style="display:flex;align-items:center;gap:6px;">
        <button id="admin-folder-btn" title="Вибрати кореневу папку проєкту">📁</button>
        <button id="admin-close">×</button>
      </div>
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
          <label>Посилання на проєкт</label>
          <input type="text" id="af-url" placeholder="https://...">
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
          <div style="display:flex;gap:6px;margin-top:2px;">
            <button class="admin-sm-btn" id="af-add-video">+ Відео (embed)</button>
            <button class="admin-sm-btn" id="af-reverse">↕ Reverse</button>
          </div>
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
    // Auto-select the currently active project
    const activeIdx = window.portfolioAdmin?.getActiveIdx?.();
    if (activeIdx != null && activeIdx >= 0 && activeIdx !== selectedIdx) {
      selectProject(activeIdx);
    }
  }

  function closeAdmin() {
    isOpen = false;
    panel.classList.remove('is-open');
    toggleBtn.classList.remove('is-active');
  }

  toggleBtn.addEventListener('click', () => isOpen ? closeAdmin() : openAdmin());
  panel.querySelector('#admin-close').addEventListener('click', closeAdmin);
  panel.querySelector('#admin-folder-btn').addEventListener('click', () => getProjectRootHandle(true));

  // Try to restore dir handle on load
  idbGetDirHandle().then(h => { if (h) { _rootDirHandle = h; updateFolderBtn(); } });

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
    panel.querySelector('#af-url').value                 = proj.url || '';

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

  function liveSync(proj) {
    window.portfolioAdmin?.setProject(proj.idx, proj);
  }

  function renderContentList(proj) {
    const list = panel.querySelector('#af-content-list');
    list.innerHTML = '';
    (proj.content || []).forEach((item, i) => {
      const row = document.createElement('div');
      const rowClass = item.type === 'video' ? ' is-video-row' : ' is-image-row';
      row.className  = 'admin-row' + rowClass;
      row.draggable  = false;
      row.dataset.index = i;

      const handle = document.createElement('span');
      handle.className = 'admin-handle';
      handle.textContent = '⠿';

      const del = document.createElement('button');
      del.className  = 'admin-del';
      del.textContent = '×';
      del.addEventListener('click', () => {
        proj.content.splice(i, 1);
        renderContentList(proj);
        liveSync(proj);
      });

      if (item.type === 'video') {
        if (item.src) {
          const thumb = document.createElement('div');
          thumb.className = 'admin-row-thumb';
          if (item.thumb) {
            thumb.style.backgroundImage = `url(${item.thumb})`;
          } else {
            thumb.style.cssText += ';display:flex;align-items:center;justify-content:center;font-size:18px;color:#666;';
            thumb.textContent = '▶';
          }

          const lbl = document.createElement('span');
          lbl.className = 'admin-row-lbl';
          lbl.style.flex = '1';
          lbl.title = item.src;
          lbl.textContent = item.src.split('/').slice(-2).join('/');

          row.draggable = true;
          row.append(handle, thumb, lbl, del);
        } else {
          const ta = document.createElement('textarea');
          ta.className   = 'admin-embed-ta';
          ta.rows        = 3;
          ta.value       = item.embed || '';
          ta.placeholder = '<iframe src="https://player.vimeo.com/..."></iframe>';
          ta.addEventListener('input', () => { proj.content[i].embed = ta.value; });
          row.append(handle, ta, del);
        }
      } else {
        const thumb = document.createElement('div');
        thumb.className = 'admin-row-thumb';
        if (item.src) thumb.style.backgroundImage = `url(${item.src})`;

        const info = document.createElement('div');
        info.style.cssText = 'flex:1;overflow:hidden;display:flex;flex-direction:column;gap:3px;';

        const lbl = document.createElement('span');
        lbl.className   = 'admin-row-lbl';
        lbl.textContent = item.filename || item.src?.split('/').pop() || 'Зображення';

        const isBlob = item.src && item.src.startsWith('blob:');
        const pathInput = document.createElement('input');
        pathInput.type        = 'text';
        pathInput.className   = 'admin-path-input';
        pathInput.placeholder = 'assets/media/cases/…';
        pathInput.value       = item.path || (isBlob ? '' : (item.src || ''));
        if (isBlob) pathInput.style.borderColor = item.path ? '' : 'rgba(255,160,0,0.5)';
        pathInput.addEventListener('input', () => {
          proj.content[i].path = pathInput.value.trim();
          pathInput.style.borderColor = pathInput.value.trim() ? '' : 'rgba(255,160,0,0.5)';
        });

        info.append(lbl, pathInput);
        row.append(handle, thumb, info, del);
        row.draggable = true;
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
        liveSync(proj);
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

    // Ask for root folder for any image drop (thumbnail or content)
    const hasImages = Array.from(files).some(f => f.type.startsWith('image/'));
    if (hasImages && !_rootDirHandle && typeof window.showDirectoryPicker === 'function') {
      await getProjectRootHandle();
    }

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const previewUrl = URL.createObjectURL(file);

      if (target === 'thumbnail') {
        // Thumbnail: store blob in IDB for immediate preview
        const id = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await idbPut({ id, blob: file, filename: file.name });
        blobURLCache.set(id, previewUrl);
        proj.thumbnail = previewUrl;
        proj._thumbId  = id;
        const ti = panel.querySelector('#af-thumb-img');
        ti.src = previewUrl; ti.style.display = 'block';
        panel.querySelector('#af-thumb-hint').style.display = 'none';
        panel.querySelector('#af-thumb-path').value = '';

        // Auto-save to disk as case-{name}.webp
        // Use the name input directly — proj.name may be empty if not yet saved
        const effectiveName = panel.querySelector('#af-name').value.trim() || proj.name;
        if (_rootDirHandle && effectiveName) {
          const diskPath = await saveThumbnailToProject(file, effectiveName);
          if (diskPath) {
            proj.thumbnail = diskPath;
            proj._thumbId  = null;
            panel.querySelector('#af-thumb-path').value = diskPath;
            ti.src = diskPath;
          }
        }
      } else {
        if (!proj.content) proj.content = [];

        // Try auto-save to disk (convert to WebP + write to project folder)
        if (_rootDirHandle && proj.name) {
          const imgItem = { type: 'image', src: previewUrl, filename: file.name, path: '', w: 0, h: 0 };
          proj.content.push(imgItem);
          renderContentList(proj);

          const result = await saveImageToProject(file, proj.name); // sequential — no race condition
          if (result) {
            imgItem.path     = result.path;
            imgItem.src      = result.path;
            imgItem.filename = result.path.split('/').pop();
            imgItem.w        = result.w;
            imgItem.h        = result.h;
          }
          renderContentList(proj);
        } else {
          // Fallback: store blob in IDB, show path input for manual entry
          const id = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          await idbPut({ id, blob: file, filename: file.name });
          blobURLCache.set(id, previewUrl);
          const imgItem = { type: 'image', id, src: previewUrl, filename: file.name, path: '' };
          const tmpImg = new Image();
          tmpImg.onload = () => { imgItem.w = tmpImg.naturalWidth; imgItem.h = tmpImg.naturalHeight; renderContentList(proj); };
          tmpImg.src = previewUrl;
          proj.content.push(imgItem);
          renderContentList(proj);
        }
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

  const CDN_HOST = 'vz-b5faeb0e-c6d.b-cdn.net';

  function parseEmbedToVideoItem(embedHTML) {
    const tmp = document.createElement('div');
    tmp.innerHTML = embedHTML.trim();
    const iframe  = tmp.querySelector('iframe');
    const wrapper = tmp.querySelector('div');
    if (!iframe) return null;
    const iSrc  = iframe.getAttribute('src') || '';
    const match = iSrc.match(/\/embed\/\d+\/([a-f0-9-]{36})/);
    if (!match) return null;
    const videoId = match[1];
    return {
      type:  'video',
      src:   `https://${CDN_HOST}/${videoId}/play_720p.mp4`,
      thumb: `https://${CDN_HOST}/${videoId}/thumbnail.jpg`,
    };
  }

  panel.querySelector('#af-reverse').addEventListener('click', () => {
    const proj = selectedIdx !== null ? window.portfolioAdmin?.getProjects()[selectedIdx] : null;
    if (!proj || !proj.content?.length) return;
    proj.content.reverse();
    renderContentList(proj);
    liveSync(proj);
  });

  panel.querySelector('#af-add-video').addEventListener('click', () => {
    const proj = selectedIdx !== null ? window.portfolioAdmin?.getProjects()[selectedIdx] : null;
    if (!proj) return;

    // If an embed input row already exists — skip
    if (panel.querySelector('#af-embed-input-row')) return;

    const row = document.createElement('div');
    row.id = 'af-embed-input-row';
    row.style.cssText = 'display:flex;flex-direction:column;gap:5px;margin-top:4px;';

    const ta = document.createElement('textarea');
    ta.className   = 'admin-embed-ta';
    ta.rows        = 3;
    ta.placeholder = 'Вставте embed-код з Bunny.net…';
    ta.style.width = '100%';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;';

    const okBtn = document.createElement('button');
    okBtn.className  = 'admin-sm-btn';
    okBtn.textContent = '+ Додати';

    const cancelBtn = document.createElement('button');
    cancelBtn.className  = 'admin-sm-btn';
    cancelBtn.textContent = 'Скасувати';
    cancelBtn.style.color = '#555';

    actions.append(okBtn, cancelBtn);
    row.append(ta, actions);
    panel.querySelector('#af-content-list').appendChild(row);
    ta.focus();

    cancelBtn.addEventListener('click', () => row.remove());

    okBtn.addEventListener('click', () => {
      const item = parseEmbedToVideoItem(ta.value);
      if (!item) {
        ta.style.borderColor = 'rgba(255,80,80,0.6)';
        ta.placeholder = 'Не вдалося прочитати. Переконайтесь що це embed від Bunny.net';
        return;
      }
      if (!proj.content) proj.content = [];
      proj.content.push(item);
      renderContentList(proj);
      liveSync(proj);
    });
  });

  // ── Save ──────────────────────────────────────────────
  panel.querySelector('#af-save').addEventListener('click', async () => {
    const proj = selectedIdx !== null ? window.portfolioAdmin?.getProjects()[selectedIdx] : null;
    if (!proj) return;

    proj.name        = panel.querySelector('#af-name').value.trim();
    proj.color       = panel.querySelector('#af-color').value;
    proj.description = panel.querySelector('#af-desc').value.trim();
    proj.url         = panel.querySelector('#af-url').value.trim();
    const tp         = panel.querySelector('#af-thumb-path').value.trim();
    if (tp) { proj.thumbnail = tp; proj._thumbId = null; }

    // If thumbnail is still a blob in IDB — try to save to disk now
    const flushedPath = await flushThumbToDisk(proj);
    if (flushedPath) {
      panel.querySelector('#af-thumb-path').value = flushedPath;
      panel.querySelector('#af-thumb-img').src = flushedPath;
    }

    const toSave = {
      idx:         proj.idx,
      name:        proj.name,
      color:       proj.color,
      description: proj.description,
      url:         proj.url || '',
      thumbnail:   proj._thumbId ? { id: proj._thumbId } : proj.thumbnail,
      content: (proj.content || []).map(item => {
        if (item.type === 'video') return {
          type:  'video',
          src:   item.src   || null,
          thumb: item.thumb || null,
          embed: item.embed || null,
        };
        return {
          type:     'image',
          src:      item.id ? null : item.src,
          id:       item.id       || null,
          filename: item.filename || null,
          path:     item.path     || null,
          w:        item.w        || null,
          h:        item.h        || null,
        };
      }),
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
  let _fileHandle = null; // cached in-session

  async function getWritableHandle() {
    // 1. Try in-session cache
    if (_fileHandle) {
      const perm = await _fileHandle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') return _fileHandle;
      const req = await _fileHandle.requestPermission({ mode: 'readwrite' });
      if (req === 'granted') return _fileHandle;
      _fileHandle = null;
    }

    // 2. Try IDB-persisted handle
    const saved = await idbGetHandle();
    if (saved) {
      const perm = await saved.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') { _fileHandle = saved; return saved; }
      const req = await saved.requestPermission({ mode: 'readwrite' });
      if (req === 'granted') { _fileHandle = saved; return saved; }
    }

    // 3. First time — let user pick the existing portfolio-data.js
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }],
        multiple: false,
      });
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return null;
      _fileHandle = handle;
      await idbPutHandle(handle);
      return handle;
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
      const thumbStr = typeof proj.thumbnail === 'string' && proj.thumbnail;
      const thumb = (thumbStr && !proj._thumbId && !proj.thumbnail.startsWith('blob:'))
        ? `'${proj.thumbnail}'` : 'null';
      const allContent = (proj.content || []).map(item => {
        if (item.type === 'video') {
          if (item.src) {
            const parts = [`type: 'video'`, `src: ${JSON.stringify(item.src)}`];
            if (item.thumb) parts.push(`thumb: ${JSON.stringify(item.thumb)}`);
            return `    { ${parts.join(', ')} }`;
          }
          return `    { type: 'video', embed: ${JSON.stringify(item.embed || '')} }`;
        }
        if (item.type === 'image') {
          // blob item — use the manually entered path
          const src = item.id ? (item.path || null) : item.src;
          if (!src) return null;
          const extra = (item.w && item.h) ? `, w: ${item.w}, h: ${item.h}` : '';
          return `    { type: 'image', src: '${src}'${extra} }`;
        }
        return null;
      }).filter(Boolean).join(',\n');
      const desc = (proj.description || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
      lines.push(`  {`);
      lines.push(`    idx: ${proj.idx}, color: '${proj.color}', name: '${proj.name}',`);
      lines.push(`    thumbnail: ${thumb},`);
      lines.push(`    content: [\n${allContent}\n    ],`);
      lines.push(`    description: '${desc}',`);
      if (proj.url) lines.push(`    url: '${proj.url}',`);
      lines.push(`  },`);
    });
    lines.push('];');
    return lines.join('\n');
  }

  panel.querySelector('#af-export').addEventListener('click', async () => {
    const btn = panel.querySelector('#af-export');

    // Flush any blob thumbnails to disk before building file content
    const allProjects = window.portfolioAdmin?.getProjects() || [];
    for (const proj of allProjects) {
      if (!proj._thumbId) continue;
      const flushedPath = await flushThumbToDisk(proj);
      if (flushedPath && proj.idx === selectedIdx) {
        panel.querySelector('#af-thumb-path').value = flushedPath;
        panel.querySelector('#af-thumb-img').src = flushedPath;
      }
    }

    const content = buildDataFileContent();

    if (typeof window.showOpenFilePicker !== 'function') {
      fallbackDownload(content); return;
    }

    const handle = await getWritableHandle();
    if (!handle) return;

    try {
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      btn.textContent = 'ЗАПИСАНО ✓';
      setTimeout(() => { btn.textContent = 'ЗАПИСАТИ В ФАЙЛ'; }, 2000);
    } catch (e) {
      fallbackDownload(content);
    }
  });

  // Reset saved file handle (e.g. if project moved to a different folder)
  window._adminResetFileHandle = async () => {
    _fileHandle = null;
    const db = await openDB();
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').delete('portfolio-data');
    console.log('File handle reset. Next save will ask to pick the file again.');
  };

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
    #admin-folder-btn {
      background: none; border: none; font-size: 14px; cursor: pointer;
      opacity: 0.3; line-height: 1; padding: 0; transition: opacity 0.2s;
    }
    #admin-folder-btn:hover { opacity: 0.7; }
    #admin-folder-btn.is-connected { opacity: 1; }

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
      display: flex; align-items: flex-start; gap: 7px;
      padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
      cursor: grab;
    }
    .admin-row.dragging { opacity: 0.4; }
    .admin-row.over { border-top: 2px solid #fff; }
    .admin-handle { color: #555; font-size: 14px; flex-shrink: 0; cursor: grab; padding-top: 2px; }
    .admin-row-thumb {
      width: 88px; height: 66px; flex-shrink: 0; border-radius: 4px;
      background-size: cover; background-position: top center; background-color: #2a2a2a;
    }
    .admin-row-thumb.is-video {
      display: flex; align-items: center; justify-content: center;
      color: #888; font-size: 12px;
    }
    .admin-row-lbl {
      font-size: 10px; color: #888; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .admin-path-input {
      width: 100%; background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 4px;
      color: #bbb; font-family: inherit; font-size: 9px; padding: 3px 6px;
      box-sizing: border-box; transition: border-color 0.2s;
    }
    .admin-path-input::placeholder { color: #3a3a3a; }
    .admin-path-input:focus { outline: none; border-color: rgba(255,255,255,0.3); }
    .admin-del {
      background: none; border: none; color: #555; font-size: 16px;
      cursor: pointer; line-height: 1; padding: 0; flex-shrink: 0;
    }
    .admin-del:hover { color: #fff; }

    .admin-row.is-video-row,
    .admin-row.is-image-row { align-items: flex-start; }
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
