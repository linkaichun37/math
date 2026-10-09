(() => {
  'use strict';

  const dialogMarkup = `<dialog id="privacyDialog" class="privacy-dialog" aria-labelledby="privacyDialogTitle">
    <div class="privacy-dialog-head"><div><span class="diagnostic-kicker">Your choices and controls</span><h2 id="privacyDialogTitle">Data &amp; privacy</h2></div><button class="diagnostic-close" id="privacyClose" type="button" aria-label="Close">×</button></div>
    <div class="privacy-dialog-body">
      <section class="privacy-section"><h3>Online tutoring</h3><p>When you choose Get help, Math Gap Finder sends the question you typed, your optional work, current grade, selected course and curriculum scope, help mode, and language through its tutor service to Cloudflare Workers AI. A typed question is limited to 6,000 characters and optional work to 3,000. An attached PNG, JPEG, or WebP image is resized and compressed in your browser, then sent only with that request.</p><p>Your name, profile, saved notes, activity history, email, and separate saved draft are not included in the tutoring data forwarded to the model. Voice dictation may be processed by your browser or device speech provider; Math Gap Finder does not forward a recording to the tutor. Only text shown in the question box and a photo you explicitly selected are sent. The photo is included only after you choose Get help and is not saved in history, notes, or account sync. Please remove names and personal details before sending.</p><p>The tutor prepares a clean version of your math wording and displays it before the explanation. You can confirm or edit it. Unclear symbols trigger a clarification question; a corrected problem is sent again for a fresh answer.</p><p>The app streams request status and elapsed time while the tutor works, then displays the complete structured answer. Answer tokens are not streamed because the tutor uses structured JSON output. You can cancel; on Cloudflare, inference may already be running and can still use the free allowance. Try again is offered for transient connection and service failures.</p><p>This browser allows up to 40 tutor requests per UTC day and 30 photos per UTC day. The hosting service also limits a network to 60 tutor requests per minute; these are safeguards, not guaranteed accounting. To keep AI inference free, use Cloudflare Workers Free and do not enable paid AI credits. Cloudflare’s Workers Free daily AI allowance is the provider limit; when it is used up, tutoring pauses until reset.</p><p>The tutoring endpoint does not log or save the submitted prompt or generated response to Math Gap Finder’s analytics/account database. If you separately save a study note or enable account sync, that saved note or draft may contain question text and is synced under the separate opt-in flow below. Cloudflare says Workers AI customer content is not used to train or improve models, and may be stored if a Cloudflare storage product is used with the AI request. Photo analysis may require one-time vision-model license acceptance. Math Gap Finder does not write tutoring prompts or responses to its D1 database. <a href="https://developers.cloudflare.com/workers-ai/platform/data-usage/" target="_blank" rel="noopener noreferrer">Cloudflare Workers AI data usage</a>.</p></section>
      <section class="privacy-section"><h3>This browser</h3><p id="vaultStatus">Checking local storage protection…</p><p id="storageHealth" class="privacy-status" role="status">Checking browser storage use…</p><p>When encryption initializes successfully, local Math Gap Finder values are encrypted with AES-GCM before being written to localStorage, using a non-exportable key in this browser’s IndexedDB. Read the status above; if encryption is unavailable or incomplete, local values may be readable in browser storage. This protects against casual inspection of fully encrypted values; it does not lock the app against someone using this browser profile. Clearing site data can still erase both values and key.</p><p>Make an encrypted backup before clearing browser data. Keep its passphrase somewhere safe; Math Gap Finder cannot recover it.</p><p>Math Gap Finder keeps up to 1,000 activity events and 100 study notes on this device. Download all notes from History &amp; report or make an encrypted backup before cleanup.</p><div class="privacy-actions"><button class="diagnostic-action secondary" id="manageLearningData" type="button">Manage notes and activity</button></div>
        <label class="privacy-label" for="backupPassphrase">Backup passphrase (12 characters or more)</label><input id="backupPassphrase" type="password" minlength="12" autocomplete="new-password" maxlength="256">
        <div class="privacy-actions"><button class="diagnostic-action" id="createEncryptedBackup" type="button">Download encrypted backup</button><button class="diagnostic-action secondary" id="chooseBackup" type="button">Restore encrypted backup</button><input id="backupFile" type="file" accept=".mgfbackup,application/json" hidden></div><p id="backupStatus" class="privacy-status" role="status"></p>
      </section>
      <section class="privacy-section"><h3>Optional account sync and teachers</h3><p>If you create an account and choose sync, Math Gap Finder stores your username, grade/course, activity records (action type, time, course, and help mode), diagnostic report, saved study notes, and question draft in its Cloudflare D1 database. Synced records are not protected by app-level end-to-end encryption. Notes and drafts can contain math content. These records stay until you delete them or delete your synced account. Account deletion removes the account’s synced records and class links. Local use does not require an account.</p><p>Teachers see a pseudonymous username, activity counts and last activity, plus a learner’s shared diagnostic level, accuracy, strengths, and gaps only after the learner joins their class. They do not see exact questions, answers, saved notes, or drafts. This is a formative summary, not a tamper-proof audit or grade.</p><p>Optional anonymous impact sharing is separate and requires consent. It sends a random visitor ID, course, action category, mode, and time—not question text, answers, voice, name, or email. Optional email summaries require an email address for verification; that address is not sent with tutoring questions.</p></section>
      <section class="privacy-section" id="feedbackSection"><h3>Send feedback only if you choose</h3><p>This draft is held only in the current page’s memory. Nothing is saved or sent to Casey or another service automatically. Remove names or student work you do not want to share; copy the draft only when you are ready to send it using a channel you trust.</p><label class="privacy-label" for="feedbackDraft">Feedback</label><textarea id="feedbackDraft" maxlength="3000" placeholder="What happened, and what would have helped?"></textarea><div class="privacy-actions"><button class="diagnostic-action" id="copyFeedback" type="button">Copy feedback draft</button></div><p id="feedbackStatus" class="privacy-status" role="status"></p></section>
    </div>
  </dialog>`;

  document.body.insertAdjacentHTML('beforeend', dialogMarkup);
  const dialog = document.querySelector('#privacyDialog');
  const $ = (selector) => dialog.querySelector(selector);
  const localLink = document.createElement('button');
  localLink.type = 'button';
  localLink.id = 'privacyOpen';
  localLink.className = 'privacy-menu-action';
  localLink.textContent = 'Data & privacy';
  document.querySelector('#saveProfile')?.insertAdjacentElement('afterend', localLink);

  function openPrivacy(feedback = false) {
    if (!dialog.open) dialog.showModal(); refreshLocalStorageHealth();
    if (feedback) {
      $('#feedbackSection').scrollIntoView({ block: 'start' });
      $('#feedbackDraft').focus({ preventScroll: true });
    }
  }
  localLink.addEventListener('click', () => {
    document.querySelector('#profileMenu')?.classList.remove('open');
    document.querySelector('#profileButton')?.setAttribute('aria-expanded', 'false');
    openPrivacy();
  });
  document.querySelector('#feedbackOpen')?.addEventListener('click', () => openPrivacy(true));
  $('#privacyClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

  const vaultStatus = $('#vaultStatus');
  const vault = window.MathGapLocalVault;
  vaultStatus.textContent = vault?.status?.encrypted
    ? 'Encrypted on this device. The encryption key is local to this browser profile; use an encrypted backup or optional account sync to recover after clearing site data.'
    : 'This browser could not enable local-storage encryption. Data is stored using the browser’s ordinary local storage here; use a separate browser profile and an encrypted backup.';
  if (vault?.status?.warning) vaultStatus.textContent += ` ${vault.status.warning}`;

  async function refreshLocalStorageHealth() {
    const health = $('#storageHealth');
    try {
      let characters = 0;
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (key?.startsWith('mgf-')) characters += key.length + (localStorage.getItem(key) || '').length;
      }
      const notes = JSON.parse(localStorage.getItem('mgf-study-notes') || '[]');
      const history = JSON.parse(localStorage.getItem('mgf-learning-history') || '[]');
      const estimate = await navigator.storage?.estimate?.();
      const localBytes = characters * 2;
      const localSize = localBytes < 1024 ? `${localBytes} B` : `${(localBytes / 1024).toFixed(1)} KB`;
      const wholeOrigin = Number.isFinite(estimate?.usage) && Number.isFinite(estimate?.quota)
        ? ` Browser-wide site storage: ${(estimate.usage / 1024 / 1024).toFixed(1)} MB used of ${(estimate.quota / 1024 / 1024).toFixed(0)} MB estimated.`
        : '';
      health.textContent = `About ${localSize} of Math Gap Finder data on this device · ${Array.isArray(notes) ? notes.length : 0}/100 notes · ${Array.isArray(history) ? history.length : 0}/1,000 activity events.${wholeOrigin} Browser estimates vary; download notes or an encrypted backup before deleting data.`;
    } catch {
      health.textContent = 'Browser storage could not be measured. Download notes or an encrypted backup before deleting data.';
    }
  }
  window.addEventListener('mathgap:storage-warning', (event) => {
    const message = event.detail?.message || 'Recent changes may not have been saved. Check browser storage and download a backup.';
    vaultStatus.textContent += ` ${message}`;
    $('#storageHealth').textContent = message;
  });
  $('#manageLearningData').addEventListener('click', () => {
    dialog.close();
    document.querySelector('#historyLink')?.click();
  });

  function toBase64(bytes) {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
    }
    return btoa(binary);
  }
  function fromBase64(value) {
    const binary = atob(value), bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  function deriveBackupKey(passphrase, salt, iterations) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']).then((material) =>
      crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']));
  }
  function setBackupMessage(message, error = false) {
    $('#backupStatus').textContent = message;
    $('#backupStatus').classList.toggle('is-error', error);
  }
  function safeBackupValues(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('This backup does not contain usable learning data.');
    const blocked = (key) => key.startsWith('mgf-sync-') || key.startsWith('mgf-sync:') || key === 'mgf-anonymous-visitor' || key === 'mgf-analytics-consent' || key === 'mgf-summary-email' || key.startsWith('mgf-photo-usage-');
    const entries = Object.entries(input).filter(([key, value]) => key.startsWith('mgf-') && !blocked(key) && typeof value === 'string');
    if (entries.length > 100 || entries.reduce((sum, [key, value]) => sum + key.length + value.length, 0) > 2_000_000) throw new Error('This backup is larger than the supported size.');
    return Object.fromEntries(entries);
  }
  function dateOf(item) { return Date.parse(item?.updatedAt || item?.time || item?.createdAt || item?.date || '') || 0; }
  function mergeList(currentText, backupText, byId) {
    const current = JSON.parse(currentText || '[]'), incoming = JSON.parse(backupText || '[]');
    if (!Array.isArray(current) || !Array.isArray(incoming)) return currentText || backupText;
    const items = new Map();
    [...current, ...incoming].forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      const id = String(item.id || (byId ? `backup-${index}` : `${item.time || ''}|${item.type || ''}|${item.course || ''}`));
      const prior = items.get(id);
      if (!prior || dateOf(item) >= dateOf(prior)) items.set(id, item);
    });
    return JSON.stringify([...items.values()].sort((a, b) => dateOf(a) - dateOf(b)).slice(byId ? -100 : -1000));
  }
  function mergeBackupValues(incoming) {
    const current = vault?.snapshot?.() || {};
    const merged = {};
    const restorePreferences = new Set(['mgf-grade', 'mgf-course', 'mgf-language', 'mgf-name', 'mgf-username', 'mgf-bio', 'mgf-class-name', 'mgf-objective', 'mgf-timer-minutes', 'mgf-activity-sequence', 'mgf-welcome-seen', 'mgf-problems', 'mgf-diagnostic-complete', 'mgf-used-question-hashes-v2']);
    for (const [key, value] of Object.entries(incoming)) {
      const existing = current[key];
      if (key === 'mgf-learning-history') merged[key] = mergeList(existing, value, false);
      else if (key === 'mgf-study-notes') merged[key] = mergeList(existing, value, true);
      else if (key === 'mgf-diagnostic' && existing) {
        try { merged[key] = dateOf(JSON.parse(value)) > dateOf(JSON.parse(existing)) ? value : existing; } catch { merged[key] = existing; }
      } else if (key === 'mgf-question-draft' && existing?.trim()) merged[key] = existing;
      else if (restorePreferences.has(key)) merged[key] = value;
      else merged[key] = existing || value;
    }
    return merged;
  }

  $('#createEncryptedBackup').addEventListener('click', async () => {
    const passphrase = $('#backupPassphrase').value;
    if (passphrase.length < 12) return setBackupMessage('Choose a passphrase that is at least 12 characters long.', true);
    if (!crypto?.subtle) return setBackupMessage('Encrypted backups need a browser with Web Crypto enabled.', true);
    const button = $('#createEncryptedBackup'); button.disabled = true;
    try {
      await vault?.flush?.();
      const entries = safeBackupValues(vault?.snapshot?.() || {});
      const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iterations = 250000;
      const key = await deriveBackupKey(passphrase, salt, iterations);
      const data = new TextEncoder().encode(JSON.stringify({ entries, createdAt: new Date().toISOString() }));
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
      const envelope = { format: 'MathGapFinderEncryptedBackup', version: 1, iterations, salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(envelope)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `math-gap-backup-${new Date().toISOString().slice(0, 10)}.mgfbackup`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      $('#backupPassphrase').value = '';
      setBackupMessage('Encrypted backup downloaded. Store the file and passphrase separately.');
    } catch { setBackupMessage('The encrypted backup could not be created. Check available browser storage and try again.', true); }
    finally { button.disabled = false; }
  });

  $('#chooseBackup').addEventListener('click', () => $('#backupFile').click());
  $('#backupFile').addEventListener('change', async (event) => {
    const file = event.target.files?.[0], passphrase = $('#backupPassphrase').value;
    event.target.value = '';
    if (!file) return;
    if (!passphrase) return setBackupMessage('Enter the backup passphrase first.', true);
    if (file.size > 4_000_000) return setBackupMessage('That backup file is too large.', true);
    try {
      const envelope = JSON.parse(await file.text());
      if (envelope.format !== 'MathGapFinderEncryptedBackup' || envelope.version !== 1 || !Number.isInteger(envelope.iterations) || envelope.iterations < 100000 || envelope.iterations > 500000) throw new Error('Unsupported backup format.');
      const key = await deriveBackupKey(passphrase, fromBase64(envelope.salt), envelope.iterations);
      const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.ciphertext));
      const payload = JSON.parse(new TextDecoder().decode(plaintext));
      const entries = safeBackupValues(payload.entries), merged = mergeBackupValues(entries);
      for (const [name, value] of Object.entries(merged)) localStorage.setItem(name, value);
      await vault?.flush?.();
      $('#backupPassphrase').value = '';
      setBackupMessage('Backup restored and merged with this browser’s data. If account sync is on, eligible learning records will sync too.');
      window.dispatchEvent(new CustomEvent('mathgap:local-data-restored'));
    } catch { setBackupMessage('Could not restore this file. Check the passphrase and use an unmodified Math Gap Finder backup.', true); }
  });

  $('#copyFeedback').addEventListener('click', async () => {
    const text = $('#feedbackDraft').value.trim();
    if (!text) { $('#feedbackStatus').textContent = 'Write a short note first.'; return; }
    try {
      await navigator.clipboard.writeText(text);
      $('#feedbackStatus').textContent = 'Copied. Nothing has been sent.';
    } catch {
      $('#feedbackDraft').focus(); $('#feedbackDraft').select();
      $('#feedbackStatus').textContent = 'Select the draft and copy it. Nothing has been sent.';
    }
  });
})();
