
(() => {
  'use strict';
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const searchInput = document.getElementById('search-input');
  const emptyState = document.getElementById('empty-state');
  const entriesContainer = document.getElementById('entries-list');

  const infoDialog = document.getElementById('info-dialog');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogCopy = document.getElementById('dialog-copy');
  const dialogOk = document.getElementById('dialog-ok');

  const entryDialog = document.getElementById('entry-dialog');
  const entryForm = document.getElementById('entry-form');
  const entryKeyInput = document.getElementById('entry-key');
  const entryValueInput = document.getElementById('entry-value');
  const entryDialogTitle = document.getElementById('entry-dialog-title');
  const entrySaveButton = document.getElementById('entry-save-btn');
  const entryFormError = document.getElementById('entry-form-error');

  const toastContainer = document.getElementById('toast-container');

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  let entries = [];
  let searchQuery = '';
  let editingEntryKey = null;
  let isSaving = false;
  let isLoading = false;

  // --------------------------------------------------
  // Rich-text editor sanitization
  // --------------------------------------------------

  const allowedEditorTags = new Set([
    'P',
    'BR',
    'STRONG',
    'B',
    'EM',
    'I',
    'U',
    'UL',
    'OL',
    'LI',
    'H3',
    'BLOCKQUOTE'
  ]);

  const discardedEditorTags = new Set([
    'SCRIPT',
    'STYLE',
    'IFRAME',
    'OBJECT',
    'EMBED',
    'SVG',
    'MATH',
    'TEMPLATE'
  ]);

  function sanitizeEditorHtml(html) {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(
      String(html ?? ''),
      'text/html'
    );

    function copySafeNodes(source, target) {
      for (const node of source.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          target.appendChild(
            document.createTextNode(node.textContent ?? '')
          );
          continue;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
          continue;
        }

        const tag = node.tagName;

        // Do not preserve active or embedded content.
        if (discardedEditorTags.has(tag)) {
          continue;
        }

        if (allowedEditorTags.has(tag)) {
          const safeElement = document.createElement(
            tag.toLowerCase()
          );

          // Copy children only. No incoming attributes, event
          // handlers, styles, or URLs are retained.
          copySafeNodes(node, safeElement);
          target.appendChild(safeElement);
        } else {
          // Preserve harmless text inside unsupported formatting
          // elements without retaining the element itself.
          copySafeNodes(node, target);
        }
      }
    }

    const container = document.createElement('div');
    copySafeNodes(parsed.body, container);

    return container.innerHTML;
  }

  function getEditorContent() {
    return sanitizeEditorHtml(entryValueInput.innerHTML).trim();
  }

  function getEditorPlainText() {
    return entryValueInput.innerText.trim();
  }

  function setEditorContent(content = '') {
    const value = String(content ?? '');

    // Support older entries that were stored as plain text.
    const containsEditorMarkup =
      /<\/?(p|br|strong|b|em|i|u|ul|ol|li|h3|blockquote)\b/i
        .test(value);

    if (!containsEditorMarkup) {
      entryValueInput.replaceChildren();

      const lines = value.split(/\r?\n/);

      lines.forEach((line, index) => {
        if (index > 0) {
          entryValueInput.appendChild(
            document.createElement('br')
          );
        }

        entryValueInput.appendChild(
          document.createTextNode(line)
        );
      });

      return;
    }

    entryValueInput.innerHTML = sanitizeEditorHtml(value);
  }

  function htmlToPlainText(html) {
    const safeHtml = sanitizeEditorHtml(html);
    const temporary = document.createElement('div');
    temporary.innerHTML = safeHtml;

    return (temporary.innerText || temporary.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // --------------------------------------------------
  // Rich-text toolbar
  // --------------------------------------------------

  document
    .querySelectorAll('.editor-toolbar [data-command]')
    .forEach((button) => {
      button.addEventListener('mousedown', (event) => {
        // Preserve the current text selection when clicking
        // a toolbar button.
        event.preventDefault();
      });

      button.addEventListener('click', () => {
        const command = button.dataset.command;
        const value = button.dataset.value || null;

        entryValueInput.focus();

        // Supported by current Chromium-based desktop runtimes.
        document.execCommand(command, false, value);
      });
    });

  // --------------------------------------------------
  // Theme
  // --------------------------------------------------

  function readTheme() {
    try {
      return sessionStorage.getItem('peervault-theme');
    } catch {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      sessionStorage.setItem('peervault-theme', theme);
    } catch {
      // The theme still works without session storage.
    }
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark';

    root.dataset.theme = isDark ? 'dark' : 'light';

    if (themeIcon) {
      themeIcon.textContent = isDark ? '☾' : '☼';
    }

    if (toggle) {
      toggle.setAttribute('aria-checked', String(!isDark));

      const label = isDark
        ? 'Switch to light theme'
        : 'Switch to dark theme';

      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }

    saveTheme(theme);
  }

  applyTheme(readTheme() === 'light' ? 'light' : 'dark');

  toggle?.addEventListener('click', () => {
    applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  // --------------------------------------------------
  // Toast notifications
  // --------------------------------------------------

  function showToast(title, message, type = 'success', duration = 3500) {
    if (!toastContainer) {
      console.error('Toast container #toast-container was not found.');
      return;
    }

    const icons = {
      success: '✓',
      error: '!',
      info: 'i'
    };

    const safeType = Object.hasOwn(icons, type) ? type : 'info';

    const toast = document.createElement('div');
    toast.className = `toast toast--${safeType}`;
    toast.setAttribute(
      'role',
      safeType === 'error' ? 'alert' : 'status'
    );
    toast.style.setProperty('--toast-duration', `${duration}ms`);

    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = icons[safeType];

    const content = document.createElement('div');
    content.className = 'toast-content';

    const heading = document.createElement('p');
    heading.className = 'toast-title';
    heading.textContent = title;

    const description = document.createElement('p');
    description.className = 'toast-message';
    description.textContent = message;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'toast-close';
    closeButton.setAttribute('aria-label', 'Dismiss notification');
    closeButton.textContent = '×';

    const progress = document.createElement('div');
    progress.className = 'toast-progress';
    progress.setAttribute('aria-hidden', 'true');

    content.append(heading, description);
    toast.append(icon, content, closeButton, progress);
    toastContainer.appendChild(toast);

    let dismissed = false;
    let timer = null;
    let removalTimer = null;

    function dismiss() {
      if (dismissed) return;

      dismissed = true;
      window.clearTimeout(timer);
      toast.classList.add('is-leaving');

      const removeToast = () => {
        window.clearTimeout(removalTimer);
        toast.remove();
      };

      toast.addEventListener('animationend', removeToast, {
        once: true
      });

      removalTimer = window.setTimeout(removeToast, 300);
    }

    closeButton.addEventListener('click', dismiss);
    timer = window.setTimeout(dismiss, duration);

    return dismiss;
  }

  // --------------------------------------------------
  // Information dialog
  // --------------------------------------------------

  function showDialog(title, message) {
    if (
      !infoDialog ||
      typeof infoDialog.showModal !== 'function'
    ) {
      showToast(title, message, 'info', 5000);
      return;
    }

    if (dialogTitle) dialogTitle.textContent = title;
    if (dialogCopy) dialogCopy.textContent = message;

    if (!infoDialog.open) {
      infoDialog.showModal();
    }
  }

  dialogOk?.addEventListener('click', () => {
    infoDialog?.close();
  });

  infoDialog
    ?.querySelector('.dialog-close')
    ?.addEventListener('click', () => {
      infoDialog.close();
    });

  // --------------------------------------------------
  // Connection status
  // --------------------------------------------------

  function setConnectionStatus(isConnected) {
    const dot = document.getElementById('connection-dot');
    const label = document.getElementById('connection-label');
    const status = document.getElementById('v');

    if (dot) {
      dot.classList.toggle('connected', isConnected);
      dot.classList.toggle('disconnected', !isConnected);
    }

    if (label) {
      label.textContent = isConnected
        ? 'Connected to Pear'
        : 'Disconnected';
    }

    if (status) {
      status.textContent = isConnected ? 'Connected' : 'Disconnected';
    }
  }

  // --------------------------------------------------
  // Dashboard statistics
  // --------------------------------------------------

  function updateStats() {
    const notes = document.getElementById('notes-count');
    const files = document.getElementById('files-count');
    const contacts = document.getElementById('contacts-count');
    const shares = document.getElementById('shares-count');

    if (notes) notes.textContent = String(entries.length);

    // These categories are not classified by the current worker API.
    if (files) files.textContent = '0';
    if (contacts) contacts.textContent = '0';
    if (shares) shares.textContent = '0';
  }

  // --------------------------------------------------
  // Render entries
  // --------------------------------------------------

  function renderEntries() {
    if (!entriesContainer) {
      console.error('Missing #entries-list container.');
      updateStats();
      return;
    }

    entriesContainer.setAttribute('aria-busy', 'false');
    entriesContainer.replaceChildren();

    const filteredEntries = entries.filter((entry) => {
      const text = `${entry.key} ${htmlToPlainText(entry.value ?? '')}`
        .toLowerCase();

      return text.includes(searchQuery);
    });

    filteredEntries.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'activity-row';
      row.dataset.entryKey = entry.key;

      const icon = document.createElement('span');
      icon.className = 'activity-icon';
      icon.textContent = '▤';
      icon.setAttribute('aria-hidden', 'true');

      const content = document.createElement('span');
      content.className = 'activity-content';

      const title = document.createElement('span');
      title.className = 'activity-title';
      title.textContent = entry.key;

      const description = document.createElement('span');
      description.className = 'activity-description';

      description.textContent =
        htmlToPlainText(entry.value ?? '') || 'Vault entry';

      content.append(title, description);

      const actions = document.createElement('span');
      actions.className = 'entry-actions';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'entry-action';
      editButton.textContent = 'Edit';
      editButton.setAttribute('aria-label', `Edit ${entry.key}`);

      editButton.addEventListener('click', () => {
        openEntryDialog(entry);
      });

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'entry-action entry-action-delete';
      deleteButton.textContent = 'Delete';
      deleteButton.setAttribute('aria-label', `Delete ${entry.key}`);

      deleteButton.addEventListener('click', () => {
        removeEntry(entry.key);
      });

      actions.append(editButton, deleteButton);
      row.append(icon, content, actions);

      row.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;

        // Render sanitized formatting in the details dialog.
        showEntryDetails(entry);
      });

      entriesContainer.appendChild(row);
    });

    if (emptyState) {
      entriesContainer.appendChild(emptyState);

      emptyState.hidden = filteredEntries.length > 0;
      emptyState.textContent = searchQuery
        ? 'No entries match your search.'
        : 'Your vault is empty. Add your first entry to get started.';
    }

    const summary = document.getElementById('save-status');

    if (summary) {
      summary.textContent = searchQuery
        ? `${filteredEntries.length} matching ${
            filteredEntries.length === 1 ? 'item' : 'items'
          }`
        : `${entries.length} ${
            entries.length === 1 ? 'entry' : 'entries'
          } in your vault`;
    }

    updateStats();
  }

  function showEntryDetails(entry) {
    // Reuse the information dialog if it exists.
    if (
      infoDialog &&
      typeof infoDialog.showModal === 'function'
    ) {
      if (dialogTitle) dialogTitle.textContent = entry.key;

      if (dialogCopy) {
        dialogCopy.textContent = htmlToPlainText(entry.value ?? '');
      }

      if (!infoDialog.open) infoDialog.showModal();
      return;
    }

    showToast(
      entry.key,
      htmlToPlainText(entry.value ?? '') || 'No content available.',
      'info',
      5000
    );
  }

  // --------------------------------------------------
  // Load and refresh entries
  // --------------------------------------------------

  async function refreshEntries() {
    const result = await window.autopassAPI.list();

    entries = Array.isArray(result) ? result : [];

    renderEntries();
  }

  async function loadEntries() {
    if (isLoading) return;

    if (!window.autopassAPI) {
      setConnectionStatus(false);

      showToast(
        'Vault unavailable',
        'The Autopass API was not found. Check app.js and worker startup.',
        'error',
        5000
      );

      return;
    }

    isLoading = true;

    if (entriesContainer) {
      entriesContainer.setAttribute('aria-busy', 'true');
    }

    try {
      await window.autopassAPI.ready();
      await refreshEntries();
      setConnectionStatus(true);
    } catch (error) {
      console.error('Failed to load vault entries:', error);
      setConnectionStatus(false);

      const summary = document.getElementById('save-status');
      if (summary) summary.textContent = 'Could not load vault entries';

      showToast(
        'Could not load your vault',
        error?.message || 'Please check your connection and try again.',
        'error',
        5000
      );
    } finally {
      isLoading = false;

      if (entriesContainer) {
        entriesContainer.setAttribute('aria-busy', 'false');
      }
    }
  }

  // --------------------------------------------------
  // Search
  // --------------------------------------------------

  searchInput?.addEventListener('input', () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    renderEntries();
  });

  // --------------------------------------------------
  // New / edit entry dialog
  // --------------------------------------------------

  function openEntryDialog(entry = null) {
    editingEntryKey = entry ? entry.key : null;

    entryDialogTitle.textContent = entry
      ? 'Edit Entry'
      : 'Add Entry';

    entryKeyInput.value = entry ? entry.key : '';
    entryKeyInput.readOnly = Boolean(entry);

    setEditorContent(entry ? entry.value : '');

    if (entryFormError) {
      entryFormError.textContent = '';
      entryFormError.hidden = true;
    }

    entrySaveButton.textContent = entry ? 'Save changes' : 'Save entry';
    entrySaveButton.disabled = false;

    if (!entryDialog.open) {
      entryDialog.showModal();
    }

    if (entry) {
      entryValueInput.focus();
    } else {
      entryKeyInput.focus();
    }
  }

  
function closeEntryDialog() {
  if (isSaving || !entryDialog?.open) return;

  // Modern Chromium supports animated dialog closing.
  if (typeof entryDialog.requestClose === 'function') {
    entryDialog.requestClose();
  } else {
    closeEntryDialog();
  }
}

  document.getElementById('add-entry-btn')?.addEventListener('click', () => {
    openEntryDialog();
  });

  document.getElementById('entry-dialog-close')?.addEventListener(
    'click',
    closeEntryDialog
  );

  document.getElementById('entry-cancel-btn')?.addEventListener(
    'click',
    closeEntryDialog
  );

  // --------------------------------------------------
  // Save entry
  // --------------------------------------------------

  entryForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isSaving) return;

    if (!window.autopassAPI) {
      showToast(
        'Save failed',
        'Autopass API is unavailable.',
        'error'
      );
      return;
    }

    const newKey = entryKeyInput.value.trim();
    const value = getEditorContent();
    const plainText = getEditorPlainText();
    const oldKey = editingEntryKey;
    const wasEditing = oldKey !== null;

    if (!newKey || !plainText) {
      if (entryFormError) {
        entryFormError.textContent = 'Enter a title and content.';
        entryFormError.hidden = false;
      }

      showToast(
        'Missing information',
        'Enter a title and content.',
        'error'
      );

      return;
    }

    if (
      !wasEditing &&
      entries.some((entry) => entry.key === newKey)
    ) {
      showToast(
        'Duplicate title',
        'An entry with this title already exists.',
        'error'
      );

      return;
    }

    isSaving = true;
    entrySaveButton.disabled = true;
    entrySaveButton.textContent = 'Saving...';

    try {
      const keyToSave = wasEditing ? oldKey : newKey;

      console.log('[PeerVault] Saving entry:', {
        key: keyToSave,
        editing: wasEditing
      });

      // This assumes the bridge and Autopass worker allow add()
      // to replace a value for an existing key. Verify that behavior.
      await window.autopassAPI.add(keyToSave, value);

      console.log('[PeerVault] Save operation completed.');

      await refreshEntries();

      entryDialog.close();

      showToast(
        'Saved successfully',
        wasEditing
          ? 'Your entry has been updated.'
          : 'Your entry has been created.',
        'success'
      );
    } catch (error) {
      console.error('[PeerVault] Failed to save entry:', error);

      showToast(
        'Save failed',
        error?.message || 'An unexpected error occurred.',
        'error',
        5000
      );
    } finally {
      isSaving = false;
      entrySaveButton.disabled = false;
      entrySaveButton.textContent = wasEditing
        ? 'Save changes'
        : 'Save entry';
    }
  });

  // --------------------------------------------------
  // Delete confirmation
  // --------------------------------------------------

  function confirmDelete(key) {
    const confirmation = document.createElement('dialog');
    confirmation.className = 'app-dialog';

    const form = document.createElement('form');
    form.method = 'dialog';

    const heading = document.createElement('h2');
    heading.textContent = 'Delete entry?';

    const message = document.createElement('p');
    message.textContent =
      `Are you sure you want to permanently delete "${key}" from your vault?`;

    const actions = document.createElement('div');
    actions.className = 'entry-dialog-actions';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancel';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete entry';

    actions.append(cancelButton, deleteButton);
    form.append(heading, message, actions);
    confirmation.appendChild(form);
    document.body.appendChild(confirmation);

    return new Promise((resolve) => {
      let resolved = false;

      function finish(result) {
        if (resolved) return;

        resolved = true;

        if (confirmation.open) {
          confirmation.close();
        }

        confirmation.remove();
        resolve(result);
      }

      cancelButton.addEventListener('click', () => finish(false));
      deleteButton.addEventListener('click', () => finish(true));

      confirmation.addEventListener('cancel', (event) => {
        event.preventDefault();
        finish(false);
      });

      confirmation.addEventListener('close', () => {
        if (!resolved) finish(false);
      });

      confirmation.showModal();
      cancelButton.focus();
    });
  }

  async function removeEntry(key) {
    const confirmed = await confirmDelete(key);

    if (!confirmed) return;

    if (!window.autopassAPI) {
      showToast(
        'Vault unavailable',
        'The Autopass API is not available.',
        'error',
        5000
      );

      return;
    }

    try {
      await window.autopassAPI.remove(key);
      await refreshEntries();

      showToast(
        'Entry deleted',
        `"${key}" was removed from your vault.`,
        'success'
      );
    } catch (error) {
      console.error('Failed to delete entry:', error);

      showToast(
        'Could not delete entry',
        error?.message || 'Please try again.',
        'error',
        5000
      );
    }
  }

  // --------------------------------------------------
  // Autopass worker updates
  // --------------------------------------------------

  window.autopassAPI?.onEntriesUpdated((updatedEntries) => {
    if (Array.isArray(updatedEntries)) {
      entries = updatedEntries;
      setConnectionStatus(true);
      renderEntries();
    }
  });

  // --------------------------------------------------
  // Dashboard buttons
  // --------------------------------------------------

  document.getElementById('view-all-btn')?.addEventListener('click', () => {
    showDialog(
      'Your vault entries',
      `Your vault currently contains ${entries.length} ${
        entries.length === 1 ? 'entry' : 'entries'
      }.`
    );
  });

  document.getElementById('learn-more-btn')?.addEventListener('click', () => {
    showDialog(
      'Your vault, your control.',
      'PeerVault uses Autopass for vault operations. Peer connectivity, sharing, and file permissions need their own implementation and testing.'
    );
  });

  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((item) => {
        item.classList.toggle('active', item === button);
      });

      const view = button.dataset.view;

      if (view && view !== 'dashboard') {
        showDialog(
          button.textContent.trim(),
          `The ${button.textContent.trim()} view is not connected to a separate data view yet.`
        );
      }
    });
  });

  document.getElementById('update-btn')?.addEventListener('click', () => {
    loadEntries();
  });

  // Remove static demo rows; show only actual Autopass entries.
  document.querySelectorAll('#entries-list .activity-row').forEach((row) => {
    row.remove();
  });

  // --------------------------------------------------
  // Start application
  // --------------------------------------------------

  loadEntries();
})();
