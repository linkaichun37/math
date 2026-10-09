(() => {
  'use strict';

  const accountKey = 'mgf-sync-account';
  const deviceKey = 'mgf-sync-device-id';
  const watchedKeys = new Set(['mgf-learning-history', 'mgf-diagnostic', 'mgf-question-draft', 'mgf-study-notes', 'mgf-grade', 'mgf-course']);
  const syncOverlay = document.querySelector('#syncOverlay');
  const syncContent = document.querySelector('#syncContent');
  const syncButton = document.querySelector('#syncLink');
  let account = null;
  let applyingRemote = false;
  let syncing = false;
  let syncAgain = false;
  let syncTimer = 0;
  let lastSyncMessage = '';
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;

  function refreshPrivacyHints() {
    const waiting = account ? pendingCount() : 0;
    const text = account ? (waiting ? `Account sync on · ${waiting} change${waiting === 1 ? '' : 's'} waiting` : lastSyncMessage.startsWith('Synced') ? 'Synced across devices on this account' : 'Account sync enabled') : 'Stored locally; account sync is optional';
    const progressHint = document.querySelector('#syncProgressHint');
    const historyHint = document.querySelector('#historySyncHint');
    const saveNoteButton = document.querySelector('#saveStudyNote');
    if (progressHint) progressHint.textContent = text;
    if (historyHint) historyHint.textContent = text;
    if (saveNoteButton && saveNoteButton.textContent !== 'Note saved') saveNoteButton.textContent = account ? 'Save note & sync' : 'Save note on this device';
  }

  function safeJson(value, fallback) { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } }
  function read(key, fallback) { return safeJson(localStorage.getItem(key), fallback); }
  function write(key, value) { nativeSet.call(localStorage, key, JSON.stringify(value)); }
  function uuid() { return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
  function randomHex(bytes = 16) { return [...crypto.getRandomValues(new Uint8Array(bytes))].map(value => value.toString(16).padStart(2, '0')).join(''); }
  async function passwordVerifier(password, salt) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Uint8Array.from(String(salt).match(/.{2}/g).map(pair => parseInt(pair, 16))), iterations: 150000, hash: 'SHA-256' }, key, 256);
    return [...new Uint8Array(bits)].map(value => value.toString(16).padStart(2, '0')).join('');
  }
  function isoNow() { return new Date().toISOString(); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
  function currentDevice() {
    let id = localStorage.getItem(deviceKey);
    if (!id) { id = uuid().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80); nativeSet.call(localStorage, deviceKey, id); }
    return id;
  }
  const deviceId = currentDevice();
  const scopedKey = name => `mgf-sync:${account?.id || 'guest'}:${name}`;
  function scopedRead(name, fallback) { return read(scopedKey(name), fallback); }
  function scopedWrite(name, value) { write(scopedKey(name), value); }
  function clearLocalSyncState(id) {
    for (const name of ['outbox', 'versions', 'last-pull', 'clear-history', 'other-drafts']) nativeRemove.call(localStorage, `mgf-sync:${id}:${name}`);
  }
  function setStatus(message) {
    lastSyncMessage = message;
    const queued = pendingCount();
    if (syncButton) {
      syncButton.textContent = account ? (!navigator.onLine ? `Offline · ${queued}` : queued ? `Sync · ${queued}` : 'Synced') : (navigator.onLine ? 'Sign in & sync' : 'Offline');
      syncButton.title = account ? `${account.handle}: ${message}` : message;
    }
    const status = document.querySelector('#syncStatus');
    if (status) status.textContent = `${message} · ${queued} waiting`;
    refreshPrivacyHints();
  }
  function pendingCount() { return Object.keys(scopedRead('outbox', {})).length; }
  function makeRecord(type, id, payload, updatedAt, deleted = false) {
    return { type, id, payload, updatedAt: Number.isFinite(Date.parse(updatedAt)) ? new Date(updatedAt).toISOString() : isoNow(), deviceId, deleted };
  }
  function recordSignature(record) {
    const value = JSON.stringify(record.payload ?? null);
    let first = 2166136261, second = 5381;
    for (let i = 0; i < value.length; i++) { const code = value.charCodeAt(i); first = Math.imul(first ^ code, 16777619); second = Math.imul(second, 33) ^ code; }
    return `${record.updatedAt}|${record.deleted ? 1 : 0}|${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
  }
  function nextLocalTimestamp(key) {
    const previous = Date.parse(nativeGetItem.call(localStorage, key) || '');
    const timestamp = new Date(Math.max(Date.now(), Number.isFinite(previous) ? previous + 1 : 0)).toISOString();
    nativeSet.call(localStorage, key, timestamp);
    return timestamp;
  }
  function enqueue(record) {
    if (!account || applyingRemote) return;
    const outbox = scopedRead('outbox', {});
    outbox[`${record.type}|${record.id}`] = record;
    scopedWrite('outbox', outbox);
    setStatus(navigator.onLine ? 'Changes saved on this device; syncing' : 'Offline; changes queued on this device');
  }
  function localHistory() {
    let history = read('mgf-learning-history', []);
    if (!Array.isArray(history)) history = [];
    let changed = false;
    history = history.map(item => {
      const next = { ...item };
      if (!next.id) { next.id = uuid(); changed = true; }
      if (!next.updatedAt) { next.updatedAt = next.time || isoNow(); changed = true; }
      if (!next.time) { next.time = next.updatedAt; changed = true; }
      return next;
    });
    if (changed) nativeSet.call(localStorage, 'mgf-learning-history', JSON.stringify(history));
    return history;
  }
  function localNotes() {
    let notes = read('mgf-study-notes', []);
    if (!Array.isArray(notes)) notes = [];
    let changed = false;
    notes = notes.map(note => {
      const next = { ...note };
      if (!next.id) { next.id = uuid(); changed = true; }
      if (!next.updatedAt) { next.updatedAt = next.createdAt || isoNow(); changed = true; }
      return next;
    });
    if (changed) nativeSet.call(localStorage, 'mgf-study-notes', JSON.stringify(notes));
    return notes;
  }
  function collectLocalRecords() {
    const records = [];
    for (const event of localHistory()) records.push(makeRecord('history', event.id, event, event.updatedAt || event.time));
    const diagnostic = read('mgf-diagnostic', null);
    if (diagnostic) {
      const updatedAt = diagnostic.updatedAt || diagnostic.date || localStorage.getItem('mgf-sync-diagnostic-updated-at') || isoNow();
      if (!diagnostic.updatedAt) { diagnostic.updatedAt = updatedAt; nativeSet.call(localStorage, 'mgf-diagnostic', JSON.stringify(diagnostic)); }
      records.push(makeRecord('diagnostic', 'latest', diagnostic, updatedAt));
    }
    const notes = localNotes();
    for (const note of notes) records.push(makeRecord('note', note.id, note, note.updatedAt || note.createdAt));
    if (localStorage.getItem('mgf-grade') || localStorage.getItem('mgf-course')) {
      const profileAt = localStorage.getItem('mgf-sync-profile-updated-at') || isoNow();
      if (!localStorage.getItem('mgf-sync-profile-updated-at')) nativeSet.call(localStorage, 'mgf-sync-profile-updated-at', profileAt);
      records.push(makeRecord('profile', 'main', { grade: localStorage.getItem('mgf-grade') || '7', course: localStorage.getItem('mgf-course') || '' }, profileAt));
    }
    const draft = localStorage.getItem('mgf-question-draft') || '';
    if (draft.trim()) {
      const draftAt = localStorage.getItem('mgf-question-draft-updated-at') || isoNow();
      if (!localStorage.getItem('mgf-question-draft-updated-at')) nativeSet.call(localStorage, 'mgf-question-draft-updated-at', draftAt);
      records.push(makeRecord('draft', `device-${deviceId}`, { text: draft, grade: localStorage.getItem('mgf-grade') || '7', course: localStorage.getItem('mgf-course') || '' }, draftAt));
    }
    return records;
  }
  function enqueueChangedLocalRecords() {
    if (!account) return;
    const versions = scopedRead('versions', {}), outbox = scopedRead('outbox', {});
    for (const record of collectLocalRecords()) {
      const key = `${record.type}|${record.id}`;
      if (versions[key] !== recordSignature(record)) outbox[key] = record;
    }
    scopedWrite('outbox', outbox);
  }
  function enqueueDeletion(type, id) {
    enqueue(makeRecord(type, id, null, isoNow(), true));
  }
  function tombstoneRemovedStorage(key, oldValue) {
    if (!account || !oldValue) return;
    if (key === 'mgf-learning-history') {
      const events = safeJson(oldValue, []);
      if (Array.isArray(events)) events.forEach(event => { if (event?.id) enqueueDeletion('history', event.id); });
      scopedWrite('clear-history', true);
    } else if (key === 'mgf-diagnostic') enqueueDeletion('diagnostic', 'latest');
    else if (key === 'mgf-study-notes') {
      const notes = safeJson(oldValue, []);
      if (Array.isArray(notes)) notes.forEach(note => { if (note?.id) enqueueDeletion('note', note.id); });
    } else if (key === 'mgf-question-draft' && oldValue.trim()) enqueueDeletion('draft', `device-${deviceId}`);
    else if (key === 'mgf-grade' || key === 'mgf-course') enqueueDeletion('profile', 'main');
  }

  Storage.prototype.setItem = function(key, value) {
    nativeSet.call(this, key, value);
    if (this !== localStorage || applyingRemote || !watchedKeys.has(String(key)) || !account) return;
    if (key === 'mgf-question-draft') nextLocalTimestamp('mgf-question-draft-updated-at');
    if (key === 'mgf-grade' || key === 'mgf-course') nextLocalTimestamp('mgf-sync-profile-updated-at');
    if (key === 'mgf-diagnostic') nextLocalTimestamp('mgf-sync-diagnostic-updated-at');
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => flushSync(), 800);
  };
  Storage.prototype.removeItem = function(key) {
    if (this === localStorage && !applyingRemote && watchedKeys.has(String(key))) tombstoneRemovedStorage(String(key), nativeGetItem.call(this, key));
    nativeRemove.call(this, key);
    if (this === localStorage && !applyingRemote && watchedKeys.has(String(key)) && account) {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => flushSync(), 800);
    }
  };
  const nativeGetItem = Storage.prototype.getItem;

  async function api(path, options = {}) {
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { ...(options.headers || {}), ...(options.body ? { 'Content-Type': 'application/json' } : {}) } });
    let data = {};
    try { data = await response.json(); } catch { data = { error: 'The sync service returned an unreadable response.' }; }
    if (!response.ok) { const error = new Error(data.error || `Request failed (${response.status}).`); error.status = response.status; throw error; }
    return data;
  }
  function applyRemote(records) {
    applyingRemote = true;
    try {
      const versions = scopedRead('versions', {});
      const historyRecords = records.filter(record => record.type === 'history');
      if (historyRecords.length) {
        const byId = new Map(localHistory().map(event => [event.id, event]));
        historyRecords.forEach(record => { if (record.deleted) byId.delete(record.id); else byId.set(record.id, record.payload); versions[`history|${record.id}`] = recordSignature(record); });
        const merged = [...byId.values()].sort((a, b) => Date.parse(a.time || a.updatedAt) - Date.parse(b.time || b.updatedAt)).slice(-1000);
        nativeSet.call(localStorage, 'mgf-learning-history', JSON.stringify(merged));
      }
      const noteRecords = records.filter(record => record.type === 'note');
      if (noteRecords.length) {
        const byId = new Map(localNotes().map(note => [note.id, note]));
        noteRecords.forEach(record => { if (record.deleted) byId.delete(record.id); else byId.set(record.id, record.payload); versions[`note|${record.id}`] = recordSignature(record); });
        nativeSet.call(localStorage, 'mgf-study-notes', JSON.stringify([...byId.values()].sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt)).slice(0, 100)));
      }
      for (const record of records) {
        const key = `${record.type}|${record.id}`;
        versions[key] = recordSignature(record);
        if (record.type === 'diagnostic' && record.id === 'latest') {
          if (record.deleted) nativeRemove.call(localStorage, 'mgf-diagnostic');
          else nativeSet.call(localStorage, 'mgf-diagnostic', JSON.stringify(record.payload));
          nativeSet.call(localStorage, 'mgf-sync-diagnostic-updated-at', record.updatedAt);
        }
        if (record.type === 'profile' && record.id === 'main') {
          if (record.deleted) { nativeRemove.call(localStorage, 'mgf-grade'); nativeRemove.call(localStorage, 'mgf-course'); }
          else {
            if (record.payload?.grade) nativeSet.call(localStorage, 'mgf-grade', String(record.payload.grade));
            if (record.payload?.course) nativeSet.call(localStorage, 'mgf-course', String(record.payload.course));
          }
          nativeSet.call(localStorage, 'mgf-sync-profile-updated-at', record.updatedAt);
        }
        if (record.type === 'draft' && record.id === `device-${deviceId}`) {
          if (record.deleted) nativeRemove.call(localStorage, 'mgf-question-draft');
          else {
            const existing = localStorage.getItem('mgf-question-draft') || '';
            const input = document.querySelector('#question');
            if (!input || !existing || input.value === existing) {
              nativeSet.call(localStorage, 'mgf-question-draft', record.payload?.text || '');
              if (input && !input.value) input.value = record.payload?.text || '';
            }
          }
          nativeSet.call(localStorage, 'mgf-question-draft-updated-at', record.updatedAt);
        }
      }
      const drafts = records.filter(record => record.type === 'draft' && !record.deleted && record.id !== `device-${deviceId}`).map(record => ({ deviceId: record.id.replace(/^device-/, ''), updatedAt: record.updatedAt, text: String(record.payload?.text || '') }));
      scopedWrite('other-drafts', drafts);
      scopedWrite('versions', versions);
      if (typeof updateLearnerSummary === 'function') updateLearnerSummary();
      if (typeof renderHistory === 'function' && document.querySelector('#historyOverlay')?.classList.contains('open')) renderHistory();
      if (typeof updateGradePicker === 'function') updateGradePicker();
      if (typeof updateCoursePicker === 'function') updateCoursePicker();
    } finally { applyingRemote = false; }
  }
  async function flushSync() {
    if (!account) return;
    if (syncing) { syncAgain = true; return; }
    syncing = true;
    try {
      if (!navigator.onLine) { enqueueChangedLocalRecords(); setStatus('Offline; changes queued on this device'); return; }
      if (scopedRead('clear-history', false)) {
        await api('/api/sync/clear-history', { method: 'POST', body: JSON.stringify({ deviceId }) });
        scopedWrite('clear-history', false);
      }
      enqueueChangedLocalRecords();
      let outbox = scopedRead('outbox', {}), entries = Object.entries(outbox);
      let pushedAny = false;
      while (entries.length) {
        const batch = entries.slice(0, 35);
        await api('/api/sync/push', { method: 'POST', body: JSON.stringify({ deviceId, records: batch.map(([, record]) => record) }) });
        pushedAny = true;
        const versions = scopedRead('versions', {});
        outbox = scopedRead('outbox', {});
        for (const [key, record] of batch) {
          versions[key] = recordSignature(record);
          if (outbox[key] && recordSignature(outbox[key]) === recordSignature(record)) delete outbox[key];
        }
        scopedWrite('versions', versions);
        scopedWrite('outbox', outbox);
        entries = Object.entries(outbox);
      }
      const lastPull = Date.parse(scopedRead('last-pull', ''));
      if (!pushedAny && !entries.length && Number.isFinite(lastPull) && Date.now() - lastPull < 30000) {
        setStatus(`Synced ${new Date(lastPull).toLocaleTimeString()}`);
        return;
      }
      const pulledRecords = [];
      let cursor = null;
      do {
        const query = cursor ? `?afterType=${encodeURIComponent(cursor.type)}&afterId=${encodeURIComponent(cursor.id)}` : '';
        const pulled = await api(`/api/sync/pull${query}`, { method: 'GET' });
        pulledRecords.push(...(Array.isArray(pulled.records) ? pulled.records : []));
        cursor = pulled.nextCursor && typeof pulled.nextCursor.type === 'string' && typeof pulled.nextCursor.id === 'string' ? pulled.nextCursor : null;
      } while (cursor);
      applyRemote(pulledRecords);
      const pulledAt = isoNow();
      scopedWrite('last-pull', pulledAt);
      setStatus(`Synced ${new Date(pulledAt).toLocaleTimeString()}`);
    } catch (error) {
      const msg = String(error?.message || error);
      if (error.status === 401 && account) {
        const waiting = pendingCount();
        account = null;
        nativeRemove.call(localStorage, accountKey);
        setStatus(`Your sign-in expired. ${waiting} changes remain queued for this account; sign in again to sync.`);
      } else setStatus(navigator.onLine ? `Sync paused: ${msg}` : 'Offline; changes queued on this device');
    } finally {
      syncing = false;
      if (syncOverlay?.classList.contains('open')) renderSyncPanel(lastSyncMessage);
      if (syncAgain) { syncAgain = false; if (account) setTimeout(() => flushSync(), 100); }
    }
  }
  function scheduleSync() {
    if (!account || applyingRemote) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => flushSync(), 800);
  }
  function showOverlay() { syncOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; renderSyncPanel(lastSyncMessage); }
  function closeOverlay() { syncOverlay.classList.remove('open'); document.body.style.overflow = ''; }
  function showMessage(text) { const node = syncContent?.querySelector('#syncMessage'); if (node) node.textContent = text; }
  function renderAuth(message = '', recoveryCode = '', recoveryAction = 'sync') {
    refreshPrivacyHints();
    syncContent.innerHTML = `<div class="diagnostic-kicker">Optional account sync · free tier</div><h2 id="syncTitle">Keep your progress across devices</h2><p>Your activity stays on this device unless you choose to create an account or sign in. Use a username, not your real name; no email is needed.</p><div class="sync-status">Sync sends your grade/course, activity labels and timestamps, diagnostic report, saved study notes, and question draft to Math Gap Finder’s Cloudflare D1 database. Synced records are not end-to-end encrypted. Study notes and drafts stay in your account and are not shared with teachers. Synced records remain until you delete them or delete the account. Deleting the account removes its synced records and class links. Do not put names or sensitive details in drafts or notes.</div><div id="syncMessage" class="sync-message" role="status">${escapeHtml(message || lastSyncMessage || 'No account is signed in. Local learning still works.')}</div>${recoveryCode ? `<div class="sync-recovery"><strong>Save this one-time recovery code now</strong><p>Password recovery does not use email. This code will not be shown again.</p><code id="syncRecoveryCode">${escapeHtml(recoveryCode)}</code><button id="copyRecoveryCode" type="button">Copy recovery code</button><button id="syncRecoveryContinue" class="sync-primary" type="button">I saved it — sync my data</button></div>` : ''}<form class="sync-form" id="syncRegisterForm"><h3>Create a free account</h3><label>Username (3–24 letters, numbers, _ or -)<input id="syncRegisterHandle" minlength="3" maxlength="24" autocomplete="username" required></label><label>Password (at least 12 characters)<input id="syncRegisterPassword" type="password" minlength="12" maxlength="128" autocomplete="new-password" required></label><label>Account type<select id="syncRegisterRole"><option value="learner">Learner</option><option value="teacher">Teacher</option></select></label><label class="sync-consent"><input id="syncConsent" type="checkbox" required><span>I choose to sync these learning records to my account. I will leave personal details out of drafts and notes.</span></label><button class="diagnostic-action" type="submit">Create account and get recovery code</button></form><form class="sync-form" id="syncLoginForm"><h3>Sign in</h3><label>Username<input id="syncLoginHandle" maxlength="24" autocomplete="username" required></label><label>Password<input id="syncLoginPassword" type="password" maxlength="128" autocomplete="current-password" required></label><button class="diagnostic-action" type="submit">Sign in and sync</button></form><details><summary>Forgot your password?</summary><form class="sync-form" id="syncResetForm"><label>Username<input id="syncResetHandle" maxlength="24" required></label><label>Recovery code<input id="syncResetCode" autocomplete="off" required></label><label>New password (at least 12 characters)<input id="syncResetPassword" type="password" minlength="12" maxlength="128" required></label><button class="diagnostic-action" type="submit">Reset password</button></form></details><p class="sync-muted">No subscription or paid AI plan is needed for sync. Free service quotas can pause cloud sync when reached; pending edits remain queued locally until sync is available again. Sign out to stop using this account on this device.</p>`;
    syncContent.querySelector('#syncRegisterForm')?.addEventListener('submit', async event => {
      event.preventDefault(); const handle = syncContent.querySelector('#syncRegisterHandle').value.trim(); const password = syncContent.querySelector('#syncRegisterPassword').value;
      const role = syncContent.querySelector('#syncRegisterRole').value;
      try { const passwordSalt = randomHex(); const proof = await passwordVerifier(password, passwordSalt); const result = await api('/api/account/register', { method: 'POST', body: JSON.stringify({ handle, passwordSalt, passwordVerifier: proof, role, syncConsent: true }) }); account = result.account; nativeSet.call(localStorage, accountKey, JSON.stringify(account)); renderAuth('Account created. Save the recovery code before sending local records.', result.recoveryCode); }
      catch (error) { showMessage(error.message); }
    });
    syncContent.querySelector('#syncRecoveryContinue')?.addEventListener('click', () => { if (recoveryAction === 'return') { renderAuth('Recovery code saved. You can now sign in with your new password.'); return; } renderSyncPanel('Recovery code saved. Syncing this device.'); flushSync(); });
    syncContent.querySelector('#copyRecoveryCode')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(recoveryCode); showMessage('Recovery code copied. Store it somewhere private.'); } catch { showMessage('Select the recovery code text to copy it.'); } });
    syncContent.querySelector('#syncLoginForm')?.addEventListener('submit', async event => {
      event.preventDefault(); const handle = syncContent.querySelector('#syncLoginHandle').value.trim(); const password = syncContent.querySelector('#syncLoginPassword').value;
      try { const challenge = await api('/api/account/challenge', { method: 'POST', body: JSON.stringify({ handle }) }); const proof = await passwordVerifier(password, challenge.passwordSalt); const result = await api('/api/account/login', { method: 'POST', body: JSON.stringify({ handle, passwordSalt: challenge.passwordSalt, passwordVerifier: proof }) }); account = result.account; nativeSet.call(localStorage, accountKey, JSON.stringify(account)); setStatus('Signed in; syncing this device'); await flushSync(); }
      catch (error) { showMessage(error.message); }
    });
    syncContent.querySelector('#syncResetForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      try { const passwordSalt = randomHex(); const proof = await passwordVerifier(syncContent.querySelector('#syncResetPassword').value, passwordSalt); const result = await api('/api/account/password-reset', { method: 'POST', body: JSON.stringify({ handle: syncContent.querySelector('#syncResetHandle').value.trim(), recoveryCode: syncContent.querySelector('#syncResetCode').value.trim(), passwordSalt, passwordVerifier: proof }) }); renderAuth('Password reset. Save your new one-time recovery code, then sign in again.', result.recoveryCode, 'return'); }
      catch (error) { showMessage(error.message); }
    });
  }
  async function getClasses() { return api('/api/classes', { method: 'GET' }); }
  async function loadClasses() {
    const container = syncContent.querySelector('#syncClasses');
    if (!container || !account) return;
    try {
      const result = await getClasses();
      if (!result.classes.length) { container.textContent = account.role === 'teacher' ? 'No classes yet.' : 'You have not joined a class.'; return; }
      container.innerHTML = result.classes.map(room => `<div class="sync-class"><div class="sync-class-head"><strong>${escapeHtml(room.name)}</strong>${account.role === 'teacher' ? `<span><button type="button" data-class-code="${escapeHtml(room.id)}">New join code</button> <button type="button" data-class-progress="${escapeHtml(room.id)}">View progress</button></span>` : `<button type="button" data-class-leave="${escapeHtml(room.id)}">Leave class</button>`}</div><small>${account.role === 'teacher' ? 'Teacher view shows only pseudonymous summary data.' : `Joined ${escapeHtml(room.joinedAt ? new Date(room.joinedAt).toLocaleDateString() : '')}`}</small></div>`).join('');
      container.querySelectorAll('[data-class-leave]').forEach(button => button.addEventListener('click', async () => { try { await api('/api/classes/leave', { method: 'POST', body: JSON.stringify({ classroomId: button.dataset.classLeave }) }); await loadClasses(); } catch (error) { showMessage(error.message); } }));
      container.querySelectorAll('[data-class-progress]').forEach(button => button.addEventListener('click', async () => { try { const data = await api(`/api/classes/${button.dataset.classProgress}/progress`, { method: 'GET' }); renderTeacherReport(data); } catch (error) { showMessage(error.message); } }));
      container.querySelectorAll('[data-class-code]').forEach(button => button.addEventListener('click', async () => { try { const result = await api(`/api/classes/${button.dataset.classCode}/code`, { method: 'POST', body: '{}' }); showClassCode(result.joinCode); } catch (error) { showMessage(error.message); } }));
    } catch (error) { container.textContent = error.message; }
  }
  function renderTeacherReport(data) {
    const report = syncContent.querySelector('#teacherReport');
    if (!report) return;
    if (!data.students.length) { report.innerHTML = '<p>No learners have opted in yet.</p>'; return; }
    report.innerHTML = `<h3>${escapeHtml(data.classroom.name)} · progress summary</h3><p class="sync-muted">This learner-approved summary excludes exact questions, answers, study notes, profile details, and drafts. It is formative information, not a grade or tamper-proof audit.</p>${data.students.map(student => `<article class="sync-student"><strong>${escapeHtml(student.handle)}</strong><div>${Number(student.explanations)} explanations · ${Number(student.followups)} follow-ups · ${Number(student.diagnostics)} checks</div><small>Last activity: ${escapeHtml(student.lastActivity ? new Date(student.lastActivity).toLocaleString() : 'Not yet')}</small>${student.diagnostic ? `<ul><li>Suggested level: ${escapeHtml(student.diagnostic.estimatedLevel)}</li><li>Accuracy: ${Math.round(student.diagnostic.accuracy * 100)}%</li><li>Strengths: ${escapeHtml((student.diagnostic.strengths || []).join(', ') || 'Not assessed')}</li><li>Practice next: ${escapeHtml((student.diagnostic.gaps || []).join(', ') || 'No clear gap found')}</li></ul>` : '<p class="sync-muted">No diagnostic report shared yet.</p>'}</article>`).join('')}`;
  }
  function showClassCode(code) {
    const banner = document.createElement('div'); banner.className = 'sync-recovery';
    banner.innerHTML = `<strong>Share this class code with learners</strong><code>${escapeHtml(code)}</code><button type="button" id="copyClassCode">Copy code</button>`;
    const list = syncContent.querySelector('#syncClasses');
    syncContent.insertBefore(banner, list || syncContent.firstChild);
    banner.querySelector('#copyClassCode').addEventListener('click', async () => { try { await navigator.clipboard.writeText(code); showMessage('Class code copied.'); } catch { showMessage('Select the code to copy it.'); } });
  }
  function renderSyncPanel(message = '') {
    if (!account) {
      account = read(accountKey, null);
      if (account?.id && account?.handle) {
        // The browser cache is a label only. The HTTP-only session cookie is authoritative.
      } else account = null;
    }
    if (!account) { renderAuth(message); return; }
    refreshPrivacyHints();
    const queued = pendingCount();
    syncContent.innerHTML = `<div class="diagnostic-kicker">Optional account sync · free tier</div><h2 id="syncTitle">Signed in as ${escapeHtml(account.handle)}</h2><p>${account.role === 'teacher' ? 'Teacher account' : 'Learner account'} · no email or real name is required.</p><div id="syncStatus" class="sync-status" role="status">${escapeHtml(message || lastSyncMessage || 'Ready to sync')} · ${queued} waiting</div><div class="sync-actions"><button id="syncNow" class="sync-primary" type="button">Sync now</button><button id="syncLogout" type="button">Sign out on this device</button><button id="syncDeleteAccount" type="button">Delete synced account</button></div><p class="sync-muted">Offline edits stay in this device’s outbox and sync when you come back online. When two devices edit the same record, the newer timestamp wins; ties use a stable device order. Separate device drafts remain separate. Daily free-tier limits reset; if cloud storage is full, unused synced data must be deleted. Local data is not cleared by a cloud sync error. Synced account records are not end-to-end encrypted; delete the account to remove its cloud records and class links.</p>${account.role === 'teacher' ? `<h3>Your classes</h3><form id="createClassForm" class="sync-form"><label>Class name<input id="newClassName" maxlength="60" required></label><button class="diagnostic-action" type="submit">Create class code</button></form>` : `<h3>Join a teacher’s class</h3><form id="joinClassForm" class="sync-form"><label>8-character class code<input id="joinClassCode" maxlength="8" autocomplete="off" required></label><label class="sync-consent"><input id="shareClassProgress" type="checkbox" required><span>I agree this teacher can see my username, activity counts, and my suggested diagnostic level, accuracy, strengths, and gaps. They cannot see my questions, answers, notes, or drafts. I can leave any time. This is a formative summary, not a tamper-proof audit.</span></label><button class="diagnostic-action" type="submit">Join and share summary</button></form>`}<h3>${account.role === 'teacher' ? 'Class list' : 'Classes I joined'}</h3><div id="syncClasses">Loading…</div><div id="teacherReport"></div><div class="sync-draft-list" id="otherDrafts"></div><div class="sync-message" id="syncMessage">${escapeHtml(message)}</div>`;
    syncContent.querySelector('#syncNow').addEventListener('click', () => flushSync());
    syncContent.querySelector('#syncLogout').addEventListener('click', async () => { try { await api('/api/account/logout', { method: 'POST', body: '{}' }); account = null; nativeRemove.call(localStorage, accountKey); renderAuth('Signed out. Local learning data stays on this device.'); } catch (error) { showMessage(`Could not reach the server to sign out. You are still signed in on this device; try again online. ${error.message}`); } });
    syncContent.querySelector('#syncDeleteAccount').addEventListener('click', async () => { if (!confirm('Delete this synced account, its cloud history, and its class links? Your local data on this device will remain.')) return; try { const oldAccountId = account.id; await api('/api/account', { method: 'DELETE' }); clearLocalSyncState(oldAccountId); account = null; nativeRemove.call(localStorage, accountKey); renderAuth('Synced account deleted. Local learning data stays on this device.'); } catch (error) { showMessage(error.message); } });
    syncContent.querySelector('#createClassForm')?.addEventListener('submit', async event => { event.preventDefault(); try { const result = await api('/api/classes', { method: 'POST', body: JSON.stringify({ name: syncContent.querySelector('#newClassName').value.trim() }) }); showClassCode(result.joinCode); await loadClasses(); } catch (error) { showMessage(error.message); } });
    syncContent.querySelector('#joinClassForm')?.addEventListener('submit', async event => { event.preventDefault(); try { await api('/api/classes/join', { method: 'POST', body: JSON.stringify({ joinCode: syncContent.querySelector('#joinClassCode').value.trim(), shareProgress: syncContent.querySelector('#shareClassProgress').checked }) }); showMessage('You joined. The teacher can see the summary you approved.'); await loadClasses(); } catch (error) { showMessage(error.message); } });
    const otherDrafts = scopedRead('other-drafts', []), draftBox = syncContent.querySelector('#otherDrafts');
    if (otherDrafts.length) { draftBox.innerHTML = `<h3>Drafts from your other devices</h3>${otherDrafts.map(draft => `<div class="sync-draft"><strong>Edited ${escapeHtml(new Date(draft.updatedAt).toLocaleString())}</strong><br>${escapeHtml(draft.text)}</div>`).join('')}`; }
    loadClasses();
  }

  function openSync() { showOverlay(); }
  syncButton?.addEventListener('click', openSync);
  document.querySelector('#syncClose')?.addEventListener('click', closeOverlay);
  syncOverlay?.addEventListener('click', event => { if (event.target === syncOverlay) closeOverlay(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && syncOverlay?.classList.contains('open')) closeOverlay(); });
  window.addEventListener('online', () => { if (account) flushSync(); else setStatus('Online; sign in to sync'); });
  window.addEventListener('offline', () => { if (account) enqueueChangedLocalRecords(); setStatus('Offline; local learning continues'); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && account) flushSync(); });

  const downloadButton = document.querySelector('#downloadSummary');
  if (downloadButton) {
    downloadButton.textContent = 'Download study note';
    const saveButton = document.createElement('button');
    saveButton.type = 'button'; saveButton.id = 'saveStudyNote'; saveButton.textContent = 'Save note on this device';
    downloadButton.insertAdjacentElement('afterend', saveButton);
    saveButton.addEventListener('click', () => {
      if (!window.lastResult && typeof lastResult === 'undefined') { setStatus('Solve a question first to save a study note.'); return; }
      const result = typeof lastResult !== 'undefined' ? lastResult : window.lastResult;
      if (!result) { setStatus('Solve a question first to save a study note.'); return; }
      const lines = [`Math Gap Finder — Study Note`, `Created: ${new Date(result.createdAt || isoNow()).toLocaleString()}`, `Topic: ${result.topic || 'Math'}`, `Question: ${result.extractedQuestion || ''}`, `My work: ${result.extractedStudentWork || ''}`, `Answer status: ${result.answerStatus || 'not provided'}`, '', `Feedback: ${result.feedback || ''}`, `First step to revisit: ${result.firstIssue || ''}`, `Foundation: ${result.misconception || ''}`, '', 'Guided steps:', ...(Array.isArray(result.steps) ? result.steps.map((step, i) => `${i + 1}. ${step}`) : []), '', 'Verification checks:', ...(Array.isArray(result.verificationChecks) ? result.verificationChecks.map(check => `- ${check}`) : []), '', 'Final answer: ' + (result.answer || '[No final answer provided]'), '', 'AI-generated learning material. Verify important results with a teacher or trusted source.'];
      const note = { id: uuid(), title: `${result.topic || 'Math'} · ${String(result.extractedQuestion || '').slice(0, 65)}`, content: lines.join('\n'), createdAt: isoNow(), updatedAt: isoNow() };
      const notes = localNotes(); notes.unshift(note); nativeSet.call(localStorage, 'mgf-study-notes', JSON.stringify(notes.slice(0, 100)));
      if (account) { enqueue(makeRecord('note', note.id, note, note.updatedAt)); flushSync(); }
      setStatus(account ? 'Study note saved locally and queued for sync' : 'Study note saved on this device');
      saveButton.textContent = 'Note saved'; setTimeout(() => { saveButton.textContent = account ? 'Save note & sync' : 'Save note on this device'; }, 1800);
    });
  }

  document.querySelector('#projectorMoreFeatures')?.addEventListener('click', event => {
    if (event.target.closest('[data-projector-action="sync"]')) syncButton?.click();
  });

  const historyContent = document.querySelector('#historyContent');
  function renderSavedNotes() {
    if (!historyContent || historyContent.querySelector('#savedNotesArea')) return;
    const notes = localNotes();
    const area = document.createElement('section'); area.id = 'savedNotesArea';
    const heading = document.createElement('h3'); heading.textContent = `Saved study notes (${notes.length})`; area.append(heading);
    const guidance = document.createElement('p'); guidance.className = 'sync-muted'; guidance.textContent = 'This browser keeps up to 100 notes. Export them as one Markdown file or delete notes you no longer need. An encrypted backup is available under Data & privacy.'; area.append(guidance);
    const toolbar = document.createElement('div'); toolbar.className = 'saved-note-actions';
    const exportAll = document.createElement('button'); exportAll.type = 'button'; exportAll.textContent = 'Download all notes (.md)'; exportAll.disabled = !notes.length;
    exportAll.addEventListener('click', () => {
      const markdown = ['# Math Gap Finder — Saved study notes', `Exported: ${new Date().toLocaleString()}`, ''];
      localNotes().forEach((note, index) => markdown.push(`## ${index + 1}. ${note.title || 'Math study note'}`, `Created: ${new Date(note.createdAt || isoNow()).toLocaleString()}`, '', note.content || '', ''));
      const url = URL.createObjectURL(new Blob([markdown.join('\n')], { type: 'text/markdown;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = `math-gap-all-study-notes-${new Date().toISOString().slice(0, 10)}.md`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    const deleteAll = document.createElement('button'); deleteAll.type = 'button'; deleteAll.textContent = 'Delete all notes'; deleteAll.disabled = !notes.length;
    deleteAll.addEventListener('click', () => {
      if (!confirm(`Delete all ${localNotes().length} saved notes from this device${account ? ' and queue their removal from sync' : ''}?`)) return;
      localStorage.removeItem('mgf-study-notes');
      if (account) flushSync();
      area.remove(); renderSavedNotes();
    });
    toolbar.append(exportAll, deleteAll); area.append(toolbar);
    if (!notes.length) { const empty = document.createElement('p'); empty.textContent = 'Save a note after solving a question to keep its steps here.'; area.append(empty); }
    notes.forEach(note => {
      const details = document.createElement('details'); details.className = 'saved-note';
      const summary = document.createElement('summary'); summary.textContent = note.title || 'Math study note';
      const body = document.createElement('pre'); body.textContent = note.content || '';
      const actions = document.createElement('div'); actions.className = 'saved-note-actions';
      const download = document.createElement('button'); download.type = 'button'; download.textContent = 'Download';
      download.addEventListener('click', () => { const url = URL.createObjectURL(new Blob([note.content || ''], { type: 'text/markdown;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'math-gap-study-note.md'; link.click(); URL.revokeObjectURL(url); });
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Delete note';
      remove.addEventListener('click', () => { if (!confirm('Delete this study note from this device and synced account?')) return; const rest = localNotes().filter(item => item.id !== note.id); nativeSet.call(localStorage, 'mgf-study-notes', JSON.stringify(rest)); if (account) { enqueueDeletion('note', note.id); flushSync(); } historyContent.querySelector('#savedNotesArea')?.remove(); renderSavedNotes(); });
      actions.append(download, remove); details.append(summary, body, actions); area.append(details);
    });
    historyContent.append(area);
  }
  if (historyContent && globalThis.MutationObserver) new MutationObserver(() => { refreshPrivacyHints(); renderSavedNotes(); }).observe(historyContent, { childList: true });

  const oldStatus = document.querySelector('#syncStatus');
  if (!oldStatus && syncButton) syncButton.title = navigator.onLine ? 'Optional free account sync' : 'Offline; local changes are saved here';
  try {
    const cached = read(accountKey, null);
    if (cached?.id) {
      api('/api/account/me', { method: 'GET' }).then(result => { account = result.account; nativeSet.call(localStorage, accountKey, JSON.stringify(account)); setStatus('Signed in; checking for changes'); flushSync(); }).catch(error => { if (error.status === 401) { account = null; nativeRemove.call(localStorage, accountKey); setStatus('Sign in again to sync; local data remains available'); } else { account = cached; enqueueChangedLocalRecords(); setStatus('Sync service is not reachable; local data remains available'); } });
    }
  } catch { /* Local-only mode remains available. */ }
})();
